from pathlib import Path

import numpy as np
import pytest
import xarray as xr

from backend.app.services.dataset_registry import DatasetRegistry
from backend.app.services.historical_analysis_service import (
    ANALYSIS_WINDOWS,
    COPERNICUS_DATASET_ID,
    EVENT_ID,
    HISTORICAL_DATASET_IDS,
    HistoricalAnalysisService,
    nearest_source_time,
)


TIMES = np.arange("2020-05-13", "2020-05-25", dtype="datetime64[D]").astype("datetime64[ns]")
DEPTHS = np.array([0.5, 100.0])
LATITUDES = np.array([10.0, 11.0])
LONGITUDES = np.array([87.0, 88.0])


@pytest.fixture()
def historical_service(tmp_path: Path) -> HistoricalAnalysisService:
    registry = DatasetRegistry()
    shape = (len(TIMES), len(DEPTHS), len(LATITUDES), len(LONGITUDES))
    base = np.arange(np.prod(shape), dtype=float).reshape(shape)
    arrays = {
        "thetao": base.copy(),
        "so": base.copy() / 10 + 30,
        "uo": np.full(shape, 1.0),
        "vo": np.full(shape, 2.0),
    }
    arrays["thetao"][:, :, 0, 1] = np.nan
    arrays["so"][:, :, 0, 1] = np.nan
    arrays["vo"][2, 0, 1, 1] = np.nan
    arrays["uo"][2, 0, 1, 1] = 100.0
    arrays["uo"][:, 0, 0, 0] = 0.0
    arrays["vo"][:, 0, 0, 0] = 0.0
    arrays["uo"][:, 1, 1, 1] = 100.0
    arrays["vo"][:, 1, 1, 1] = np.nan

    units = {"thetao": "degrees_C", "so": "1e-3", "uo": "m s-1", "vo": "m s-1"}
    for variable, dataset_id in HISTORICAL_DATASET_IDS.items():
        path = tmp_path / f"{variable}.nc"
        dataset = xr.Dataset(
            {
                variable: (
                    ("time", "depth", "latitude", "longitude"),
                    arrays[variable],
                    {"units": units[variable], "long_name": variable, "standard_name": variable},
                ),
            },
            coords={
                "time": TIMES,
                "depth": ("depth", DEPTHS, {"units": "m", "positive": "down"}),
                "latitude": ("latitude", LATITUDES, {"units": "degrees_north"}),
                "longitude": ("longitude", LONGITUDES, {"units": "degrees_east"}),
            },
        )
        dataset.to_netcdf(path)
        registry.register(
            dataset_id,
            str(path),
            dataset_kind="historical_model_grid",
            event_id=EVENT_ID,
            region_id="bay-of-bengal",
            variable=variable,
        )
    return HistoricalAnalysisService(registry)


def test_analysis_windows_are_exact_and_centralized(historical_service: HistoricalAnalysisService):
    assert ANALYSIS_WINDOWS["before"]["dates"] == ("2020-05-13", "2020-05-14", "2020-05-15")
    assert ANALYSIS_WINDOWS["during"]["dates"] == tuple(f"2020-05-{day:02d}" for day in range(16, 22))
    assert ANALYSIS_WINDOWS["after"]["dates"] == ("2020-05-22", "2020-05-23", "2020-05-24")
    configuration = historical_service.configuration(EVENT_ID)
    assert configuration["dataset_id"] == COPERNICUS_DATASET_ID
    assert [window["sample_count"] for window in configuration["analysis_windows"]] == [3, 6, 3]


def test_nearest_source_time_uses_earlier_timestamp_for_a_tie():
    result = nearest_source_time(
        "2020-05-20T12:00:00",
        ["2020-05-20T00:00:00", "2020-05-21T00:00:00"],
    )
    assert result["matched_model_time"].startswith("2020-05-20T00:00:00")
    assert result["absolute_offset_hours"] == 12.0
    assert result["matching_method"] == "nearest_available_source_time"


def test_scalar_phase_mean_preserves_missing_cells_and_source_units(historical_service: HistoricalAnalysisService):
    temperature = historical_service.phase_mean(EVENT_ID, "thetao", "before", 0)
    salinity = historical_service.phase_mean(EVENT_ID, "so", "during", 1)

    assert temperature["sample_count"] == 3
    assert temperature["slice"]["slice_data"][0][1] is None
    assert temperature["slice"]["var_units"] == "degrees_C"
    assert temperature["slice"]["actual_depth"] == 0.5
    assert salinity["sample_count"] == 6
    assert salinity["slice"]["var_units"] == "1e-3"
    assert salinity["slice"]["actual_depth"] == 100.0
    assert temperature["color_scale"]["min"] <= temperature["slice"]["tmin"]
    assert temperature["color_scale"]["max"] >= temperature["slice"]["tmax"]


def test_current_phase_mean_uses_joint_finite_component_pairs(historical_service: HistoricalAnalysisService):
    result = historical_service.phase_mean(EVENT_ID, "currents", "before", 0)
    fully_missing = historical_service.phase_mean(EVENT_ID, "currents", "before", 1)

    assert result["joint_finite_pairing"] is True
    assert result["vector_mean_method"] == "mean_u_and_mean_v_from_joint_finite_pairs"
    assert result["uo"]["slice_data"][1][1] == 1.0
    assert result["vo"]["slice_data"][1][1] == 2.0
    assert result["uo"]["var_name"] == "uo"
    assert result["vo"]["var_name"] == "vo"
    assert fully_missing["uo"]["slice_data"][1][1] is None
    assert fully_missing["vo"]["slice_data"][1][1] is None


def test_difference_uses_finite_phase_pairs_and_symmetric_scale(historical_service: HistoricalAnalysisService):
    result = historical_service.difference(EVENT_ID, "thetao", "during-before", 0)

    assert result["slice"]["slice_data"][0][1] is None
    assert result["finite_paired_cell_count"] == 3
    assert result["slice"]["var_units"] == "degrees_C difference"
    assert result["color_scale"]["min"] == -result["color_scale"]["max"]
    assert result["minimum_difference"] <= result["mean_difference"] <= result["maximum_difference"]


@pytest.mark.parametrize(
    ("variable", "comparison", "expected_units"),
    [
        ("thetao", "during-before", "degrees_C difference"),
        ("thetao", "after-before", "degrees_C difference"),
        ("so", "during-before", "1e-3 difference"),
        ("so", "after-before", "1e-3 difference"),
    ],
)
def test_all_scalar_difference_modes_preserve_units_and_pairing(
    historical_service: HistoricalAnalysisService,
    variable: str,
    comparison: str,
    expected_units: str,
):
    result = historical_service.difference(EVENT_ID, variable, comparison, 1)

    assert result["slice"]["var_units"] == expected_units
    assert result["finite_paired_cell_count"] == 3
    assert result["color_scale"]["min"] == -result["color_scale"]["max"]


def test_probe_reports_time_match_grid_match_profiles_and_reanalysis_provenance(historical_service: HistoricalAnalysisService):
    result = historical_service.probe(EVENT_ID, "2020-05-20T09:00:00", 10.2, 87.8)

    assert result["matched_model_time"].startswith("2020-05-20T00:00:00")
    assert result["absolute_offset_hours"] == 9.0
    assert result["matching_method"] == "nearest_available_source_time"
    assert result["track_position"] == {"latitude": 10.2, "longitude": 87.8}
    assert result["matched_model_grid_position"]["latitude"] == 10.0
    assert result["matched_model_grid_position"]["longitude"] == 88.0
    assert len(result["temperature"]["levels"]) == 2
    assert len(result["salinity"]["levels"]) == 2
    assert result["currents"]["levels"][0]["speed"] == pytest.approx(np.hypot(1.0, 2.0))
    assert result["currents"]["levels"][0]["direction_toward_degrees"] == pytest.approx(26.565051177)
    assert result["source"] == "GLORYS12V1 Reanalysis"
    assert result["value_classification"] == "model_reanalysis"

    stopped = historical_service.probe(EVENT_ID, "2020-05-20T00:00:00Z", 10.0, 87.0)
    assert stopped["currents"]["levels"][0]["speed"] == 0.0
    assert stopped["currents"]["levels"][0]["direction_toward_degrees"] is None


def test_service_rejects_operational_or_wrong_event_context(historical_service: HistoricalAnalysisService):
    with pytest.raises(ValueError, match="not registered"):
        historical_service.phase_mean("cyclone-not-real", "thetao", "before", 0)
    with pytest.raises(ValueError, match="not supported"):
        historical_service.phase_mean(EVENT_ID, "temperature-2026", "before", 0)
