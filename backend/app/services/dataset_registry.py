from typing import Dict, Optional

import os


class DatasetRegistry:
    def __init__(self):
        self._datasets: Dict[str, dict] = {}

    def register(self, dataset_id: str, file_path: str, **kwargs):
        """Register a dataset with the given id and file path."""
        if dataset_id in self._datasets:
            raise ValueError(f"Dataset ID '{dataset_id}' already registered.")
        if kwargs.get("dataset_kind") not in {"model_grid", "observation_trajectory"}:
            raise ValueError(
                "A dataset_kind of 'model_grid' or 'observation_trajectory' is required."
            )
        self._datasets[dataset_id] = {
            "file_path": file_path,
            **kwargs
        }

    def get(self, dataset_id: str) -> Optional[dict]:
        """Get dataset info by ID."""
        return self._datasets.get(dataset_id)

    def list_ids(self) -> list:
        """List all registered dataset IDs."""
        return list(self._datasets.keys())

    def list_catalog_entries(self) -> list[dict]:
        """List registered datasets with their display-safe classification."""
        return [
            {
                "id": dataset_id,
                "dataset_kind": dataset["dataset_kind"],
                "description": dataset.get("description"),
            }
            for dataset_id, dataset in self._datasets.items()
        ]

# Global registry instance
dataset_registry = DatasetRegistry()

# Register the available datasets
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'data', 'raw')

# Temperature dataset
TEMPERATURE_DATASET_PATH = os.path.join(DATA_DIR, 'bay_of_bengal_temperature_multitime.nc')
if os.path.exists(TEMPERATURE_DATASET_PATH):
    dataset_registry.register(
        'bay-of-bengal-temperature',
        TEMPERATURE_DATASET_PATH,
        dataset_kind='model_grid',
        description='Bay of Bengal temperature dataset (thetao)'
    )

# Salinity dataset
SALINITY_DATASET_PATH = os.path.join(DATA_DIR, 'bay_of_bengal_salinity_wider_multitime.nc')
if os.path.exists(SALINITY_DATASET_PATH):
    dataset_registry.register(
        'bay-of-bengal-salinity',
        SALINITY_DATASET_PATH,
        dataset_kind='model_grid',
        description='Bay of Bengal salinity dataset (so)'
    )

# Eastward current dataset
UO_DATASET_PATH = os.path.join(DATA_DIR, 'bay_of_bengal_uo_wider_multitime.nc')
if os.path.exists(UO_DATASET_PATH):
    dataset_registry.register(
        'bay-of-bengal-uo',
        UO_DATASET_PATH,
        dataset_kind='model_grid',
        description='Bay of Bengal eastward current dataset (uo)'
    )

# Northward current dataset
VO_DATASET_PATH = os.path.join(DATA_DIR, 'bay_of_bengal_vo_wider_multitime.nc')
if os.path.exists(VO_DATASET_PATH):
    dataset_registry.register(
        'bay-of-bengal-vo',
        VO_DATASET_PATH,
        dataset_kind='model_grid',
        description='Bay of Bengal northward current dataset (vo)'
    )

# Glider dataset - Spray glider mission 19607101
GLIDER_DATASET_PATH = os.path.join(DATA_DIR, 'glider', '19607101', 'SPRAY-FRSQ-19607101-sp071-20190602T1209.nc')
if os.path.exists(GLIDER_DATASET_PATH):
    dataset_registry.register(
        '19607101',
        GLIDER_DATASET_PATH,
        dataset_kind='observation_trajectory',
        description='Spray glider mission 19607101 - Bay of Bengal trajectoryProfile dataset',
        type='glider',
        trajectory_id='sp071-20190602T1209',
        verified=True
    )

