from pathlib import Path

import numpy as np
import pytest
import xarray as xr

from backend.app.services.dataset_registry import dataset_registry
from backend.app.services.netcdf_service import NetCDFService


DATASET_ID = "arabian-sea-temperature"
EXPECTED_PATH = Path(__file__).parents[2] / "data" / "raw" / "arabian_sea_temperature_multitime.nc"
PHASE_13E_DATASETS = {
    "arabian-sea-salinity": (
        "arabian_sea_salinity_multitime.nc",
        "so",
        "1e-3",
        "cmems_mod_glo_phy-so_anfc_0.083deg_PT6H-i",
    ),
    "arabian-sea-uo": (
        "arabian_sea_uo_multitime.nc",
        "uo",
        "m s-1",
        "cmems_mod_glo_phy-cur_anfc_0.083deg_PT6H-i",
    ),
    "arabian-sea-vo": (
        "arabian_sea_vo_multitime.nc",
        "vo",
        "m s-1",
        "cmems_mod_glo_phy-cur_anfc_0.083deg_PT6H-i",
    ),
}


def test_real_arabian_temperature_subset_is_registered_with_source_provenance():
    registered = dataset_registry.get(DATASET_ID)

    assert EXPECTED_PATH.is_file()
    assert registered is not None
    assert Path(registered["file_path"]).resolve() == EXPECTED_PATH.resolve()
    assert registered["region_id"] == "arabian-sea"
    assert registered["provider"] == "CMEMS - Global Monitoring and Forecasting Centre"
    assert registered["product_id"] == "GLOBAL_ANALYSISFORECAST_PHY_001_024"
    assert registered["variable"] == "thetao"
    assert registered["units"] == "degrees_C"


def test_real_arabian_temperature_subset_preserves_coordinates_units_and_finite_data():
    service = NetCDFService()
    metadata = service.get_dataset_metadata(DATASET_ID)

    assert metadata["dimensions"] == {
        "time": 8,
        "depth": 31,
        "latitude": 241,
        "longitude": 337,
    }
    assert metadata["time_coordinate"] == "time"
    assert metadata["vertical_coordinate"] == "depth"
    assert metadata["selectable_depth_indices"] == list(range(31))
    assert metadata["depth_units"] == "m"
    assert metadata["time_values"][0].startswith("2026-09-21T00:00:00")
    assert metadata["time_values"][-1].startswith("2026-09-22T18:00:00")
    assert np.isclose(metadata["depth_values"][0], 0.49402499198913574)
    assert np.isclose(metadata["depth_values"][-1], 453.9377136230469)

    with xr.open_dataset(EXPECTED_PATH) as dataset:
        temperature = dataset["thetao"]
        assert temperature.dims == ("time", "depth", "latitude", "longitude")
        assert temperature.attrs["standard_name"] == "sea_water_potential_temperature"
        assert temperature.attrs["units"] == "degrees_C"
        assert float(dataset.longitude.min()) == 50.0
        assert float(dataset.longitude.max()) == 78.0
        assert float(dataset.latitude.min()) == 5.0
        assert float(dataset.latitude.max()) == 25.0
        assert np.isfinite(temperature.values).any()
        assert np.isfinite(temperature.isel(depth=-1).values).any()

    surface_start = service.get_slice(DATASET_ID, "thetao", time_index=0, depth_index=0)
    deepest_end = service.get_slice(DATASET_ID, "thetao", time_index=7, depth_index=30)
    assert surface_start["actual_time"].startswith("2026-09-21T00:00:00")
    assert deepest_end["actual_time"].startswith("2026-09-22T18:00:00")
    assert np.isclose(surface_start["actual_depth"], 0.49402499198913574)
    assert np.isclose(deepest_end["actual_depth"], 453.9377136230469)
    assert surface_start["var_units"] == "degrees_C"
    assert deepest_end["finite_count"] > 0


def test_real_phase_13e_subsets_are_registered_from_verified_files():
    raw_dir = Path(__file__).parents[2] / "data" / "raw"

    for dataset_id, (filename, variable, units, copernicus_id) in PHASE_13E_DATASETS.items():
        expected_path = raw_dir / filename
        registered = dataset_registry.get(dataset_id)

        assert expected_path.is_file()
        assert registered is not None
        assert Path(registered["file_path"]).resolve() == expected_path.resolve()
        assert registered["variable"] == variable
        assert registered["units"] == units
        assert registered["copernicus_dataset_id"] == copernicus_id
        assert registered["dimensions"] == {
            "time": 8,
            "depth": 31,
            "latitude": 241,
            "longitude": 337,
        }
        assert registered["selectable_depth_indices"] == list(range(31))

    u_registered = dataset_registry.get("arabian-sea-uo")
    v_registered = dataset_registry.get("arabian-sea-vo")
    assert u_registered is not None
    assert v_registered is not None
    assert Path(u_registered["file_path"]).resolve() != Path(v_registered["file_path"]).resolve()
    assert u_registered["copernicus_dataset_id"] == v_registered["copernicus_dataset_id"]
    assert u_registered["variable"] == "uo"
    assert v_registered["variable"] == "vo"


def test_real_phase_13e_subsets_preserve_coordinates_units_and_finite_depths():
    raw_dir = Path(__file__).parents[2] / "data" / "raw"

    for filename, variable, units, _ in PHASE_13E_DATASETS.values():
        with xr.open_dataset(raw_dir / filename) as dataset:
            data = dataset[variable]
            assert data.dims == ("time", "depth", "latitude", "longitude")
            assert data.dtype == np.dtype("float32")
            assert data.attrs["units"] == units
            assert dataset.sizes == {
                "time": 8,
                "depth": 31,
                "latitude": 241,
                "longitude": 337,
            }
            assert float(dataset.longitude.min()) == 50.0
            assert float(dataset.longitude.max()) == 78.0
            assert float(dataset.latitude.min()) == 5.0
            assert float(dataset.latitude.max()) == 25.0
            assert np.isclose(dataset.depth.values[0], 0.49402499198913574)
            assert np.isclose(dataset.depth.values[-1], 453.9377136230469)
            assert str(dataset.time.values[0]).startswith("2026-09-21T00:00:00")
            assert str(dataset.time.values[-1]).startswith("2026-09-22T18:00:00")
            finite_by_depth = np.isfinite(data.values).any(axis=(0, 2, 3))
            assert finite_by_depth.tolist() == [True] * 31


def test_real_arabian_current_components_are_coordinate_and_unit_compatible():
    raw_dir = Path(__file__).parents[2] / "data" / "raw"

    with (
        xr.open_dataset(raw_dir / "arabian_sea_uo_multitime.nc") as u_dataset,
        xr.open_dataset(raw_dir / "arabian_sea_vo_multitime.nc") as v_dataset,
    ):
        for coordinate in ("longitude", "latitude", "depth", "time"):
            assert np.array_equal(
                u_dataset[coordinate].values,
                v_dataset[coordinate].values,
            )
        assert u_dataset["uo"].attrs["units"] == v_dataset["vo"].attrs["units"]


def test_operational_scalar_profile_is_bounded_and_preserves_source_levels():
    profile = NetCDFService().get_profile(DATASET_ID, "thetao", time_index=0, latitude=18.42, longitude=72.25)

    assert profile["dataset_id"] == DATASET_ID
    assert profile["variable"] == "thetao"
    assert profile["actual_time"].startswith("2026-09-21T00:00:00")
    assert profile["depth_units"] == "m"
    assert profile["units"] == "degrees_C"
    assert len(profile["levels"]) == 31
    assert [level["depth"] for level in profile["levels"]] == sorted(level["depth"] for level in profile["levels"])
    assert any(level["value"] is not None for level in profile["levels"])


def test_operational_current_profile_uses_one_joint_finite_grid_column():
    profile = NetCDFService().get_current_profile(
        "arabian-sea-uo", "arabian-sea-vo", time_index=0, latitude=18.42, longitude=72.25,
    )

    assert profile["units"] == "m s-1"
    assert len(profile["levels"]) == 31
    finite = [level for level in profile["levels"] if level["speed"] is not None]
    assert finite
    assert all(level["speed"] == pytest.approx(np.hypot(level["u"], level["v"])) for level in finite)


def test_real_phase_13e_surface_middle_and_deep_slices_are_finite():
    service = NetCDFService()

    for dataset_id, (_, variable, units, _) in PHASE_13E_DATASETS.items():
        for depth_index in (0, 15, 30):
            result = service.get_slice(dataset_id, variable, time_index=7, depth_index=depth_index)
            assert result["finite_count"] > 0
            assert result["var_units"] == units
            assert result["actual_time"].startswith("2026-09-22T18:00:00")
        deepest = service.get_slice(dataset_id, variable, time_index=7, depth_index=30)
        assert np.isclose(deepest["actual_depth"], 453.9377136230469)
