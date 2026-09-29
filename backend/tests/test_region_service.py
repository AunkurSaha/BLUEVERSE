from backend.app.schemas.regions import RegionDataStatus
from backend.app.services.dataset_registry import DatasetRegistry
from backend.app.services.region_service import REGION_DEFINITIONS, RegionService


BOB_DATASETS = (
    "bay-of-bengal-temperature",
    "bay-of-bengal-salinity",
    "bay-of-bengal-uo",
    "bay-of-bengal-vo",
)


def registry_with_bob_datasets() -> DatasetRegistry:
    registry = DatasetRegistry()
    for dataset_id in BOB_DATASETS:
        registry.register(dataset_id, f"/{dataset_id}.nc", dataset_kind="model_grid")
    return registry


def registry_with_two_regions() -> DatasetRegistry:
    registry = registry_with_bob_datasets()
    for dataset_id in (
        "arabian-sea-temperature",
        "arabian-sea-salinity",
        "arabian-sea-uo",
        "arabian-sea-vo",
    ):
        registry.register(
            dataset_id,
            f"/{dataset_id}.nc",
            dataset_kind="model_grid",
            bounds={"west": 50.0, "south": 5.0, "east": 78.0, "north": 25.0},
            time_coverage="2026-09-21 00:00 UTC to 2026-09-22 18:00 UTC",
            depth_coverage="0.49402499198913574 m to 453.9377136230469 m",
        )
    return registry


def test_bay_of_bengal_is_data_backed_when_registered_datasets_exist():
    region = RegionService(registry_with_bob_datasets()).get_region("bay-of-bengal")

    assert region is not None
    assert region.data_status == RegionDataStatus.DATA_BACKED
    assert [dataset.id for dataset in region.model_datasets] == list(BOB_DATASETS)
    assert region.supported_variables == ["Temperature", "Salinity", "Currents"]
    assert region.observation_sources == ["ARGO", "Spray Glider"]


def test_navigation_presets_never_inherit_data_backed_regions():
    service = RegionService(registry_with_two_regions())

    for definition in REGION_DEFINITIONS:
        region = service.get_region(definition.id)
        assert region is not None
        assert region.bounds.west < region.bounds.east
        assert region.bounds.south < region.bounds.north
        assert -180 <= region.camera.longitude <= 180
        assert -90 <= region.camera.latitude <= 90
        assert region.camera.height > 0
        assert -90 <= region.camera.pitch <= 0
        if definition.id not in {"bay-of-bengal", "arabian-sea"}:
            assert region.data_status == RegionDataStatus.NAVIGATION_ONLY
            assert region.model_datasets == []
            assert region.observation_sources == []
            assert region.supported_variables == []


def test_arabian_sea_exposes_all_registered_model_variables_and_coverage():
    region = RegionService(registry_with_two_regions()).get_region("arabian-sea")

    assert region is not None
    assert region.data_status == RegionDataStatus.DATA_BACKED
    assert region.supported_variables == ["Temperature", "Salinity", "Currents"]
    assert region.observation_sources == []
    assert region.analysis_capabilities == [
        "Ocean Probe",
        "Depth exploration",
        "Time playback",
        "Temperature 3D",
        "Temperature Isosurface",
        "Temperature Transect",
    ]
    assert [dataset.id for dataset in region.model_datasets] == [
        "arabian-sea-temperature",
        "arabian-sea-salinity",
        "arabian-sea-uo",
        "arabian-sea-vo",
    ]
    assert region.model_datasets[0].bounds is not None
    assert region.model_datasets[0].bounds.model_dump() == {
        "west": 50.0,
        "south": 5.0,
        "east": 78.0,
        "north": 25.0,
    }
    assert region.model_datasets[0].depth_coverage == (
        "0.49402499198913574 m to 453.9377136230469 m"
    )


def test_missing_required_dataset_marks_region_unavailable():
    registry = DatasetRegistry()
    for dataset_id in BOB_DATASETS[:-1]:
        registry.register(dataset_id, f"/{dataset_id}.nc", dataset_kind="model_grid")

    region = RegionService(registry).get_region("bay-of-bengal")

    assert region is not None
    assert region.data_status == RegionDataStatus.UNAVAILABLE
    assert all(dataset.id != "bay-of-bengal-vo" for dataset in region.model_datasets)


def test_unknown_region_is_not_invented():
    assert RegionService(registry_with_bob_datasets()).get_region("southern-ocean") is None
