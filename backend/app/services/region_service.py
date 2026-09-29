from dataclasses import dataclass
from typing import Iterable

from ..schemas.regions import (
    RegionBounds,
    RegionCamera,
    RegionDataset,
    RegionDataStatus,
    RegionDetail,
    RegionSummary,
)
from .dataset_registry import DatasetRegistry, dataset_registry


@dataclass(frozen=True)
class RegionDefinition:
    id: str
    name: str
    short_name: str
    description: str
    bounds: RegionBounds
    camera: RegionCamera
    expected_model_datasets: tuple[RegionDataset, ...] = ()
    observation_sources: tuple[str, ...] = ()
    supported_variables: tuple[str, ...] = ()
    analysis_capabilities: tuple[str, ...] = ()
    time_coverage: str | None = None
    notes: tuple[str, ...] = ()


NAVIGATION_ONLY_NOTE = (
    "Navigation preset only. No BLUEVERSE model dataset is currently registered "
    "for this region."
)


REGION_DEFINITIONS: tuple[RegionDefinition, ...] = (
    RegionDefinition(
        id="bay-of-bengal",
        name="Bay of Bengal",
        short_name="Bay of Bengal",
        description="The current BLUEVERSE model and observation study region.",
        bounds=RegionBounds(west=80.0, south=5.0, east=100.0, north=22.0),
        camera=RegionCamera(
            longitude=90.0,
            latitude=13.5,
            height=3_000_000.0,
            heading=0.0,
            pitch=-90.0,
        ),
        expected_model_datasets=(
            RegionDataset(id="bay-of-bengal-temperature", label="Temperature", variable="thetao"),
            RegionDataset(id="bay-of-bengal-salinity", label="Salinity", variable="so"),
            RegionDataset(id="bay-of-bengal-uo", label="Eastward current", variable="uo"),
            RegionDataset(id="bay-of-bengal-vo", label="Northward current", variable="vo"),
        ),
        observation_sources=("ARGO", "Spray Glider"),
        supported_variables=("Temperature", "Salinity", "Currents"),
        analysis_capabilities=(
            "Ocean Probe",
            "Model-Observation Alerts",
            "3D Subsurface",
            "Temperature Isosurface",
            "Vertical Transect",
        ),
        notes=(
            "Study bounds match the shared registered model-grid extent.",
            "Dataset-specific time coverage is available in each dataset's metadata.",
        ),
    ),
    RegionDefinition(
        id="arabian-sea",
        name="Arabian Sea",
        short_name="Arabian Sea",
        description="A BLUEVERSE model study region using real Copernicus Marine subsets.",
        bounds=RegionBounds(west=50.0, south=5.0, east=78.0, north=25.0),
        camera=RegionCamera(longitude=64.0, latitude=15.0, height=4_200_000.0, heading=0.0, pitch=-90.0),
        expected_model_datasets=(
            RegionDataset(id="arabian-sea-temperature", label="Temperature", variable="thetao"),
            RegionDataset(id="arabian-sea-salinity", label="Salinity", variable="so"),
            RegionDataset(id="arabian-sea-uo", label="Eastward current", variable="uo"),
            RegionDataset(id="arabian-sea-vo", label="Northward current", variable="vo"),
        ),
        supported_variables=("Temperature", "Salinity", "Currents"),
        analysis_capabilities=(
            "Ocean Probe",
            "Depth exploration",
            "Time playback",
            "Temperature 3D",
            "Temperature Isosurface",
            "Temperature Transect",
        ),
        time_coverage="2026-09-21 00:00 UTC to 2026-09-22 18:00 UTC",
        notes=(
            "No observation source is registered for the Arabian Sea region.",
            "Temperature, salinity, and horizontal currents are registered model variables.",
        ),
    ),
    RegionDefinition(
        id="equatorial-indian-ocean",
        name="Equatorial Indian Ocean",
        short_name="Equatorial Indian Ocean",
        description="A camera preset spanning the equatorial Indian Ocean.",
        bounds=RegionBounds(west=40.0, south=-10.0, east=100.0, north=8.0),
        camera=RegionCamera(longitude=70.0, latitude=-1.0, height=6_000_000.0, heading=0.0, pitch=-90.0),
        notes=(NAVIGATION_ONLY_NOTE,),
    ),
    RegionDefinition(
        id="andaman-sea",
        name="Andaman Sea",
        short_name="Andaman Sea",
        description="A camera preset for geographic navigation in the Andaman Sea.",
        bounds=RegionBounds(west=91.0, south=5.0, east=99.0, north=16.0),
        camera=RegionCamera(longitude=95.0, latitude=10.5, height=2_200_000.0, heading=0.0, pitch=-90.0),
        notes=(NAVIGATION_ONLY_NOTE,),
    ),
    RegionDefinition(
        id="northern-indian-ocean",
        name="Northern Indian Ocean",
        short_name="Northern Indian Ocean",
        description="A broad camera preset for northern Indian Ocean context.",
        bounds=RegionBounds(west=45.0, south=0.0, east=105.0, north=30.0),
        camera=RegionCamera(longitude=75.0, latitude=15.0, height=7_000_000.0, heading=0.0, pitch=-90.0),
        notes=(NAVIGATION_ONLY_NOTE,),
    ),
)


class RegionService:
    def __init__(
        self,
        registry: DatasetRegistry = dataset_registry,
        definitions: Iterable[RegionDefinition] = REGION_DEFINITIONS,
    ):
        self._registry = registry
        self._definitions = {definition.id: definition for definition in definitions}

    def _resolve(self, definition: RegionDefinition) -> RegionDetail:
        registered_ids = set(self._registry.list_ids())
        datasets = []
        for expected in definition.expected_model_datasets:
            if expected.id not in registered_ids:
                continue
            registered = self._registry.get(expected.id) or {}
            datasets.append(RegionDataset(
                id=expected.id,
                label=expected.label,
                variable=expected.variable,
                bounds=RegionBounds(**registered["bounds"]) if registered.get("bounds") else None,
                time_coverage=registered.get("time_coverage"),
                depth_coverage=registered.get("depth_coverage"),
            ))
        if not definition.expected_model_datasets:
            status = RegionDataStatus.NAVIGATION_ONLY
        elif len(datasets) == len(definition.expected_model_datasets):
            status = RegionDataStatus.DATA_BACKED
        else:
            status = RegionDataStatus.UNAVAILABLE

        return RegionDetail(
            id=definition.id,
            name=definition.name,
            short_name=definition.short_name,
            description=definition.description,
            bounds=definition.bounds,
            camera=definition.camera,
            data_status=status,
            model_datasets=datasets,
            observation_sources=list(definition.observation_sources) if status == RegionDataStatus.DATA_BACKED else [],
            supported_variables=list(definition.supported_variables) if status == RegionDataStatus.DATA_BACKED else [],
            analysis_capabilities=list(definition.analysis_capabilities) if status == RegionDataStatus.DATA_BACKED else [],
            time_coverage=definition.time_coverage if status == RegionDataStatus.DATA_BACKED else None,
            notes=list(definition.notes),
        )

    def list_regions(self) -> list[RegionSummary]:
        return [
            RegionSummary(**self._resolve(definition).model_dump())
            for definition in self._definitions.values()
        ]

    def get_region(self, region_id: str) -> RegionDetail | None:
        definition = self._definitions.get(region_id)
        return self._resolve(definition) if definition else None


region_service = RegionService()
