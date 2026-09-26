from typing import Dict, Optional

class DatasetRegistry:
    def __init__(self):
        self._datasets: Dict[str, dict] = {}

    def register(self, dataset_id: str, file_path: str, **kwargs):
        """Register a dataset with the given id and file path."""
        if dataset_id in self._datasets:
            raise ValueError(f"Dataset ID '{dataset_id}' already registered.")
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

# Global registry instance
dataset_registry = DatasetRegistry()

# Register the available dataset
import os
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'data', 'raw')
DEFAULT_DATASET_PATH = os.path.join(DATA_DIR, 'bay_of_bengal_temperature_multitime.nc')
if os.path.exists(DEFAULT_DATASET_PATH):
    dataset_registry.register(
        "bay-of-bengal-temperature",
        DEFAULT_DATASET_PATH,
        description="Bay of Bengal temperature dataset"
    )
