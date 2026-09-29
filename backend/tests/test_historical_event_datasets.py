from pathlib import Path

import numpy as np
import pytest

from backend.app.services.dataset_registry import DatasetRegistry, dataset_registry
from backend.app.services.event_service import EventService
from backend.app.services.historical_dataset_service import (
    COPERNICUS_DATASET_ID,
    EVENT_ID,
    MODEL_SOURCE,
    PRODUCT_ID,
    PROVIDER,
    compare_historical_datasets,
    historical_data_gate_passes,
    inspect_historical_dataset,
)


PROJECT_ROOT = Path(__file__).parents[2]
EVENT_DATA_DIR = PROJECT_ROOT / "data" / "raw" / "events"
HISTORICAL_DATASETS = {
    "thetao": (
        "amphan-2020-temperature",
        "amphan_2020_temperature.nc",
        "degrees_C",
        "e6ce75629e0d116f71cb9c7546088184fe7b84ca04ee93f90f71bad1d16ceaf8",
    ),
    "so": (
        "amphan-2020-salinity",
        "amphan_2020_salinity.nc",
        "1e-3",
        "992208c90bbe63cd55a69e6d8cdc5690e1d976fa89d672ee287298276527ea3f",
    ),
    "uo": (
        "amphan-2020-uo",
        "amphan_2020_uo.nc",
        "m s-1",
        "1259456c7d0251083882b43d70b1389a4b9416125d064ff8cf2ccb9a1a925916",
    ),
    "vo": (
        "amphan-2020-vo",
        "amphan_2020_vo.nc",
        "m s-1",
        "fb42998d406d9ff4368fdf610a52403bee1bbc9ee41aaf8f3e7fc0f2191319a2",
    ),
}


@pytest.fixture(scope="module")
def inspections():
    return {
        variable: inspect_historical_dataset(EVENT_DATA_DIR / filename, variable)
        for variable, (_, filename, _, _) in HISTORICAL_DATASETS.items()
    }


def test_historical_files_are_registered_with_exact_event_provenance():
    for variable, (dataset_id, filename, units, expected_sha256) in HISTORICAL_DATASETS.items():
        registration = dataset_registry.get(dataset_id)

        assert registration is not None
        assert Path(registration["file_path"]).resolve() == (EVENT_DATA_DIR / filename).resolve()
        assert registration["dataset_kind"] == "historical_model_grid"
        assert registration["event_id"] == EVENT_ID
        assert registration["region_id"] == "bay-of-bengal"
        assert registration["provider"] == PROVIDER
        assert registration["product_id"] == PRODUCT_ID
        assert registration["copernicus_dataset_id"] == COPERNICUS_DATASET_ID
        assert registration["product_classification"] == "Global Ocean Physics Reanalysis"
        assert registration["model_source"] == MODEL_SOURCE
        assert registration["variable"] == variable
        assert registration["units"] == units
        assert registration["verified_sha256"] == expected_sha256
        assert registration["data_gate_validated"] is True


def test_historical_files_preserve_real_may_2020_coordinates_units_and_depths(inspections):
    for variable, inspection in inspections.items():
        _, _, expected_units, _ = HISTORICAL_DATASETS[variable]

        assert inspection["dimensions"] == {
            "time": 12,
            "depth": 31,
            "latitude": 241,
            "longitude": 97,
        }
        assert inspection["longitude"] == {
            "count": 97,
            "minimum": 84.0,
            "maximum": 92.0,
            "units": "degrees_east",
        }
        assert inspection["latitude"] == {
            "count": 241,
            "minimum": 8.0,
            "maximum": 28.0,
            "units": "degrees_north",
        }
        assert inspection["depth"]["count"] == 31
        assert np.isclose(inspection["depth"]["minimum"], 0.49402499198913574)
        assert np.isclose(inspection["depth"]["maximum"], 453.9377136230469)
        assert inspection["depth"]["positive"] == "down"
        assert inspection["depth"]["units"] == "m"
        assert inspection["time"]["count"] == 12
        assert inspection["time"]["first"].startswith("2020-05-13T00:00:00")
        assert inspection["time"]["last"].startswith("2020-05-24T00:00:00")
        assert inspection["time"]["calendar"] == "gregorian"
        assert inspection["variable_metadata"]["units"] == expected_units
        assert inspection["coverage"]["all_may_2020"] is True
        assert inspection["coverage"]["contains_2026"] is False
        assert inspection["coverage"]["event_dates_present"] is True
        assert inspection["finite_count"] > 0
        assert inspection["selectable_depth_indices"] == list(range(31))
        assert np.isclose(inspection["deepest_selectable_depth"], 453.9377136230469)


def test_historical_data_gate_confirms_event_coverage_and_component_compatibility(inspections):
    assert historical_data_gate_passes(inspections) is True
    assert all(item["coverage"]["contains_pre_event"] for item in inspections.values())
    assert all(item["coverage"]["contains_event_period"] for item in inspections.values())
    assert all(item["coverage"]["contains_post_event"] for item in inspections.values())

    uv = compare_historical_datasets(inspections["uo"], inspections["vo"])
    assert uv == {
        "grid_identical": True,
        "depth_identical": True,
        "time_identical": True,
        "units_compatible": True,
    }
    temperature_salinity = compare_historical_datasets(inspections["thetao"], inspections["so"])
    assert temperature_salinity["grid_identical"] is True
    assert temperature_salinity["depth_identical"] is True
    assert temperature_salinity["time_identical"] is True

    u_path = Path(inspections["uo"]["path"])
    v_path = Path(inspections["vo"]["path"])
    assert u_path != v_path
    assert inspections["uo"]["variable"] == "uo"
    assert inspections["vo"]["variable"] == "vo"


def test_event_capability_is_available_only_when_all_four_validated_files_exist():
    available = EventService().get_event(EVENT_ID)
    assert available is not None
    assert available.historical_ocean_data.status == "AVAILABLE"
    assert available.historical_ocean_data.variables == ["Temperature", "Salinity", "Currents"]
    assert available.historical_ocean_data.dataset_ids == [
        "amphan-2020-temperature",
        "amphan-2020-salinity",
        "amphan-2020-uo",
        "amphan-2020-vo",
    ]

    incomplete_registry = DatasetRegistry()
    for variable, (dataset_id, _, _, _) in list(HISTORICAL_DATASETS.items())[:3]:
        registration = dataset_registry.get(dataset_id)
        assert registration is not None
        incomplete_registry.register(dataset_id, registration["file_path"], **{
            key: value for key, value in registration.items() if key not in {"id", "file_path"}
        })

    unavailable = EventService(scientific_registry=incomplete_registry).get_event(EVENT_ID)
    assert unavailable is not None
    assert unavailable.historical_ocean_data.status == "UNAVAILABLE"
    assert unavailable.historical_ocean_data.variables == []
    assert unavailable.historical_ocean_data.dataset_ids == []
