"""Inspect and compare the four real Cyclone Amphan historical NetCDF subsets."""

from __future__ import annotations

import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.services.historical_dataset_service import (
    compare_historical_datasets,
    historical_data_gate_passes,
    inspect_historical_dataset,
)


FILES = {
    "thetao": Path("data/raw/events/amphan_2020_temperature.nc"),
    "so": Path("data/raw/events/amphan_2020_salinity.nc"),
    "uo": Path("data/raw/events/amphan_2020_uo.nc"),
    "vo": Path("data/raw/events/amphan_2020_vo.nc"),
}


def main() -> None:
    inspections = {
        variable: inspect_historical_dataset(path, variable)
        for variable, path in FILES.items()
    }
    report = {
        "datasets": inspections,
        "uv_compatibility": compare_historical_datasets(inspections["uo"], inspections["vo"]),
        "temperature_salinity_compatibility": compare_historical_datasets(inspections["thetao"], inspections["so"]),
        "data_gate_passes": historical_data_gate_passes(inspections),
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
