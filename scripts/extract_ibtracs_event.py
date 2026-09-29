"""Extract one agency-specific historical event track from an IBTrACS CSV."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SOURCE_DATASET = "NOAA IBTrACS v04r01"
SOURCE_URL = (
    "https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-"
    "stewardship-ibtracs/v04r01/access/csv/ibtracs.NI.list.v04r01.csv"
)
SOURCE_EVENT_ID = "2020136N10088"
EVENT_ID = "cyclone-amphan-2020"
AGENCY = "RSMC New Delhi (IMD)"
AGENCY_PREFIX = "NEWDELHI"


def _optional_number(value: str) -> float | None:
    cleaned = value.strip()
    return float(cleaned) if cleaned else None


def _required_number(value: str, field: str, timestamp: str) -> float:
    parsed = _optional_number(value)
    if parsed is None:
        raise ValueError(f"{field} is missing at {timestamp}")
    return parsed


def _iso_utc(value: str) -> str:
    parsed = datetime.strptime(value.strip(), "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    return parsed.isoformat().replace("+00:00", "Z")


def parse_ibtracs_track(csv_path: Path, source_event_id: str = SOURCE_EVENT_ID) -> list[dict[str, Any]]:
    """Read a single IBTrACS SID using only the selected agency's own series."""
    with csv_path.open("r", encoding="utf-8", newline="") as source:
        reader = csv.DictReader(source)
        units = next(reader, None)
        if units is None:
            raise ValueError("IBTrACS CSV is missing its units row")
        if units.get(f"{AGENCY_PREFIX}_WIND", "").strip() != "kts":
            raise ValueError("Unexpected NEWDELHI_WIND unit")
        if units.get(f"{AGENCY_PREFIX}_PRES", "").strip() != "mb":
            raise ValueError("Unexpected NEWDELHI_PRES unit")

        points: list[dict[str, Any]] = []
        for row in reader:
            if row.get("SID", "").strip() != source_event_id:
                continue
            latitude_text = row.get(f"{AGENCY_PREFIX}_LAT", "")
            longitude_text = row.get(f"{AGENCY_PREFIX}_LON", "")
            if not latitude_text.strip() and not longitude_text.strip():
                continue
            timestamp = _iso_utc(row["ISO_TIME"])
            latitude = _required_number(latitude_text, f"{AGENCY_PREFIX}_LAT", timestamp)
            longitude = _required_number(longitude_text, f"{AGENCY_PREFIX}_LON", timestamp)
            if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
                raise ValueError(f"Invalid coordinate at {timestamp}: {latitude}, {longitude}")
            points.append(
                {
                    "time": timestamp,
                    "latitude": latitude,
                    "longitude": longitude,
                    "wind": _optional_number(row.get(f"{AGENCY_PREFIX}_WIND", "")),
                    "pressure": _optional_number(row.get(f"{AGENCY_PREFIX}_PRES", "")),
                    "status": row.get(f"{AGENCY_PREFIX}_GRADE", "").strip() or None,
                    "agency": AGENCY,
                }
            )

    if not points:
        raise ValueError(f"No {AGENCY} track points found for IBTrACS SID {source_event_id}")
    points.sort(key=lambda point: point["time"])
    if len({point["time"] for point in points}) != len(points):
        raise ValueError("Duplicate timestamps found in selected agency series")
    return points


def build_event_document(csv_path: Path, retrieval_date: str) -> dict[str, Any]:
    points = parse_ibtracs_track(csv_path)
    winds = [point["wind"] for point in points if point["wind"] is not None]
    pressures = [point["pressure"] for point in points if point["pressure"] is not None]
    start = datetime.fromisoformat(points[0]["time"].replace("Z", "+00:00"))
    end = datetime.fromisoformat(points[-1]["time"].replace("Z", "+00:00"))
    source_sha256 = hashlib.sha256(csv_path.read_bytes()).hexdigest()
    return {
        "event": {
            "id": EVENT_ID,
            "name": "Cyclone Amphan",
            "event_type": "tropical_cyclone",
            "basin": "North Indian",
            "region_id": "bay-of-bengal",
            "start_time": points[0]["time"],
            "end_time": points[-1]["time"],
            "source": SOURCE_DATASET,
            "source_event_id": SOURCE_EVENT_ID,
            "agency": AGENCY,
            "status": "historical",
            "supported_analysis": ["track", "timeline", "track_point_inspection"],
            "provenance": (
                "Agency-specific best-track fields extracted from the NOAA IBTrACS v04r01 "
                "North Indian basin CSV. No agency estimates were averaged or merged."
            ),
        },
        "track": {
            "source": SOURCE_DATASET,
            "source_event_id": SOURCE_EVENT_ID,
            "agency": AGENCY,
            "source_series": "NEWDELHI_*",
            "source_url": SOURCE_URL,
            "source_file": csv_path.name,
            "source_sha256": source_sha256,
            "retrieval_date": retrieval_date,
            "units": {
                "latitude": "degrees_north",
                "longitude": "degrees_east",
                "wind": "kts",
                "pressure": "mb",
            },
            "status_field": "NEWDELHI_GRADE",
            "point_count": len(points),
            "bounds": {
                "west": min(point["longitude"] for point in points),
                "south": min(point["latitude"] for point in points),
                "east": max(point["longitude"] for point in points),
                "north": max(point["latitude"] for point in points),
            },
            "duration_hours": (end - start).total_seconds() / 3600,
            "maximum_wind": max(winds) if winds else None,
            "minimum_pressure": min(pressures) if pressures else None,
            "points": points,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--retrieval-date", required=True)
    args = parser.parse_args()
    document = build_event_document(args.source, args.retrieval_date)
    args.destination.parent.mkdir(parents=True, exist_ok=True)
    args.destination.write_text(json.dumps(document, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
