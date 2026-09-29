import json
from hashlib import sha256
from functools import lru_cache
from pathlib import Path
from typing import Any

from ..schemas.events import EventDetail, EventSummary, EventTrack
from .dataset_registry import DatasetRegistry, dataset_registry


PROJECT_ROOT = Path(__file__).resolve().parents[3]

EVENT_REGISTRY: dict[str, dict[str, Any]] = {
    "cyclone-amphan-2020": {
        "track_file": PROJECT_ROOT / "data" / "processed" / "events" / "cyclone-amphan-2020.json",
    },
}

HISTORICAL_OCEAN_DATASET_IDS = (
    "amphan-2020-temperature",
    "amphan-2020-salinity",
    "amphan-2020-uo",
    "amphan-2020-vo",
)

HISTORICAL_OCEAN_VARIABLES = {
    "amphan-2020-temperature": "thetao",
    "amphan-2020-salinity": "so",
    "amphan-2020-uo": "uo",
    "amphan-2020-vo": "vo",
}


class EventService:
    def __init__(
        self,
        registry: dict[str, dict[str, Any]] = EVENT_REGISTRY,
        scientific_registry: DatasetRegistry = dataset_registry,
    ):
        self._registry = registry
        self._scientific_registry = scientific_registry

    @staticmethod
    @lru_cache(maxsize=8)
    def _load_document(path_text: str) -> dict[str, Any]:
        path = Path(path_text)
        if not path.is_file():
            raise FileNotFoundError(f"Historical event data is not available: {path}")
        with path.open("r", encoding="utf-8") as source:
            return json.load(source)

    def _document(self, event_id: str) -> dict[str, Any] | None:
        registration = self._registry.get(event_id)
        if registration is None:
            return None
        return self._load_document(str(registration["track_file"]))

    def list_events(self) -> list[EventSummary]:
        return [EventSummary.model_validate(self._document(event_id)["event"]) for event_id in self._registry]

    def get_event(self, event_id: str) -> EventDetail | None:
        document = self._document(event_id)
        if document is None:
            return None
        event = document["event"]
        track = document["track"]
        return EventDetail.model_validate({
            **event,
            "track_point_count": track["point_count"],
            "track_bounds": track["bounds"],
            "duration_hours": track["duration_hours"],
            "maximum_wind": track["maximum_wind"],
            "minimum_pressure": track["minimum_pressure"],
            "units": track["units"],
            "source_series": track["source_series"],
            "source_url": track["source_url"],
            "retrieval_date": track["retrieval_date"],
            "historical_ocean_data": self._historical_ocean_data(event_id),
        })

    def _historical_ocean_data(self, event_id: str) -> dict[str, Any]:
        available = True
        for dataset_id, expected_variable in HISTORICAL_OCEAN_VARIABLES.items():
            entry = self._scientific_registry.get(dataset_id)
            if entry is None:
                available = False
                break
            path = Path(entry["file_path"])
            if not (
                entry.get("dataset_kind") == "historical_model_grid"
                and entry.get("event_id") == event_id
                and entry.get("region_id") == "bay-of-bengal"
                and entry.get("product_id") == "GLOBAL_MULTIYEAR_PHY_001_030"
                and entry.get("copernicus_dataset_id") == "cmems_mod_glo_phy_my_0.083deg_P1D-m"
                and entry.get("variable") == expected_variable
                and entry.get("data_gate_validated") is True
                and path.is_file()
                and sha256(path.read_bytes()).hexdigest() == entry.get("verified_sha256")
            ):
                available = False
                break
        return {
            "status": "AVAILABLE" if available else "UNAVAILABLE",
            "variables": ["Temperature", "Salinity", "Currents"] if available else [],
            "dataset_ids": list(HISTORICAL_OCEAN_DATASET_IDS) if available else [],
        }

    def get_track(self, event_id: str) -> EventTrack | None:
        document = self._document(event_id)
        if document is None:
            return None
        return EventTrack.model_validate({"event_id": event_id, **document["track"]})


event_service = EventService()
