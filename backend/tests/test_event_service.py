import csv
from pathlib import Path

import pytest

from backend.app.services.event_service import EventService
from scripts.extract_ibtracs_event import AGENCY, parse_ibtracs_track


def test_registered_amphan_event_preserves_real_source_identity_and_units():
    service = EventService()
    event = service.get_event("cyclone-amphan-2020")
    track = service.get_track("cyclone-amphan-2020")

    assert event is not None and track is not None
    assert event.source_event_id == "2020136N10088"
    assert event.agency == "RSMC New Delhi (IMD)"
    assert event.source_series == "NEWDELHI_*"
    assert track.units.wind == "kts"
    assert track.units.pressure == "mb"
    assert track.point_count == len(track.points) == 45


def test_amphan_track_is_chronological_valid_and_bounds_are_computed_from_points():
    track = EventService().get_track("cyclone-amphan-2020")
    assert track is not None
    timestamps = [point.time for point in track.points]
    assert timestamps == sorted(timestamps)
    assert all(-90 <= point.latitude <= 90 for point in track.points)
    assert all(-180 <= point.longitude <= 180 for point in track.points)
    assert track.bounds.west == min(point.longitude for point in track.points)
    assert track.bounds.east == max(point.longitude for point in track.points)
    assert track.bounds.south == min(point.latitude for point in track.points)
    assert track.bounds.north == max(point.latitude for point in track.points)
    assert track.maximum_wind == max(point.wind for point in track.points if point.wind is not None)
    assert track.minimum_pressure == min(point.pressure for point in track.points if point.pressure is not None)


def test_parser_keeps_missing_values_and_selected_agency(tmp_path: Path):
    fixture = tmp_path / "ibtracs.csv"
    fields = [
        "SID", "ISO_TIME", "NEWDELHI_LAT", "NEWDELHI_LON",
        "NEWDELHI_GRADE", "NEWDELHI_WIND", "NEWDELHI_PRES",
    ]
    with fixture.open("w", encoding="utf-8", newline="") as target:
        writer = csv.DictWriter(target, fieldnames=fields)
        writer.writeheader()
        writer.writerow({"NEWDELHI_WIND": "kts", "NEWDELHI_PRES": "mb"})
        writer.writerow({
            "SID": "2020136N10088", "ISO_TIME": "2020-05-16 03:00:00",
            "NEWDELHI_LAT": "10.7", "NEWDELHI_LON": "86.5",
            "NEWDELHI_GRADE": "", "NEWDELHI_WIND": "", "NEWDELHI_PRES": "1000",
        })
        writer.writerow({
            "SID": "2020136N10088", "ISO_TIME": "2020-05-16 00:00:00",
            "NEWDELHI_LAT": "10.4", "NEWDELHI_LON": "87.0",
            "NEWDELHI_GRADE": "D", "NEWDELHI_WIND": "25", "NEWDELHI_PRES": "",
        })

    points = parse_ibtracs_track(fixture)
    assert [point["time"] for point in points] == ["2020-05-16T00:00:00Z", "2020-05-16T03:00:00Z"]
    assert points[0]["pressure"] is None
    assert points[1]["wind"] is None
    assert points[1]["status"] is None
    assert all(point["agency"] == AGENCY for point in points)


def test_parser_rejects_invalid_coordinates(tmp_path: Path):
    fixture = tmp_path / "invalid.csv"
    fixture.write_text(
        "SID,ISO_TIME,NEWDELHI_LAT,NEWDELHI_LON,NEWDELHI_GRADE,NEWDELHI_WIND,NEWDELHI_PRES\n"
        ",,,,,kts,mb\n"
        "2020136N10088,2020-05-16 00:00:00,91,87,D,25,1000\n",
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="Invalid coordinate"):
        parse_ibtracs_track(fixture)


def test_unknown_event_is_not_invented():
    service = EventService()
    assert service.get_event("cyclone-not-real") is None
    assert service.get_track("cyclone-not-real") is None
