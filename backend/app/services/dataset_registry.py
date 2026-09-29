from typing import Dict, Optional

import os


class DatasetRegistry:
    def __init__(self):
        self._datasets: Dict[str, dict] = {}

    def register(self, dataset_id: str, file_path: str, **kwargs):
        """Register a dataset with the given id and file path."""
        if dataset_id in self._datasets:
            raise ValueError(f"Dataset ID '{dataset_id}' already registered.")
        if kwargs.get("dataset_kind") not in {"model_grid", "historical_model_grid", "observation_trajectory"}:
            raise ValueError(
                "A dataset_kind of 'model_grid', 'historical_model_grid', or "
                "'observation_trajectory' is required."
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

HISTORICAL_EVENT_DATASETS = (
    {
        'id': 'amphan-2020-temperature',
        'filename': 'amphan_2020_temperature.nc',
        'display_name': 'Cyclone Amphan 2020 Historical Temperature',
        'variable': 'thetao',
        'units': 'degrees_C',
        'sha256': 'e6ce75629e0d116f71cb9c7546088184fe7b84ca04ee93f90f71bad1d16ceaf8',
    },
    {
        'id': 'amphan-2020-salinity',
        'filename': 'amphan_2020_salinity.nc',
        'display_name': 'Cyclone Amphan 2020 Historical Salinity',
        'variable': 'so',
        'units': '1e-3',
        'sha256': '992208c90bbe63cd55a69e6d8cdc5690e1d976fa89d672ee287298276527ea3f',
    },
    {
        'id': 'amphan-2020-uo',
        'filename': 'amphan_2020_uo.nc',
        'display_name': 'Cyclone Amphan 2020 Historical Eastward Current',
        'variable': 'uo',
        'units': 'm s-1',
        'sha256': '1259456c7d0251083882b43d70b1389a4b9416125d064ff8cf2ccb9a1a925916',
    },
    {
        'id': 'amphan-2020-vo',
        'filename': 'amphan_2020_vo.nc',
        'display_name': 'Cyclone Amphan 2020 Historical Northward Current',
        'variable': 'vo',
        'units': 'm s-1',
        'sha256': 'fb42998d406d9ff4368fdf610a52403bee1bbc9ee41aaf8f3e7fc0f2191319a2',
    },
)

for historical in HISTORICAL_EVENT_DATASETS:
    historical_path = os.path.join(DATA_DIR, 'events', historical['filename'])
    if os.path.exists(historical_path):
        dataset_registry.register(
            historical['id'],
            historical_path,
            dataset_kind='historical_model_grid',
            display_name=historical['display_name'],
            description=f"GLORYS12V1 historical {historical['variable']} subset around Cyclone Amphan",
            event_id='cyclone-amphan-2020',
            region_id='bay-of-bengal',
            provider='Mercator Ocean International',
            product_id='GLOBAL_MULTIYEAR_PHY_001_030',
            copernicus_dataset_id='cmems_mod_glo_phy_my_0.083deg_P1D-m',
            dataset_version='202311',
            product_classification='Global Ocean Physics Reanalysis',
            model_source='MERCATOR GLORYS12V1',
            variable=historical['variable'],
            units=historical['units'],
            spatial_resolution='0.083 degrees (1/12 degree)',
            temporal_resolution='daily',
            source_depth_level_count=50,
            dimensions={'time': 12, 'depth': 31, 'latitude': 241, 'longitude': 97},
            bounds={'west': 84.0, 'south': 8.0, 'east': 92.0, 'north': 28.0},
            time_coverage='2020-05-13 00:00 UTC to 2020-05-24 00:00 UTC',
            depth_coverage='0.49402499198913574 m to 453.9377136230469 m',
            selectable_depth_indices=list(range(31)),
            verified_sha256=historical['sha256'],
            data_gate_validated=True,
            provenance='Copernicus Marine GLORYS12V1 daily reanalysis subset downloaded with CLI 2.4.1',
        )

# Temperature dataset
TEMPERATURE_DATASET_PATH = os.path.join(DATA_DIR, 'bay_of_bengal_temperature_multitime.nc')
if os.path.exists(TEMPERATURE_DATASET_PATH):
    dataset_registry.register(
        'bay-of-bengal-temperature',
        TEMPERATURE_DATASET_PATH,
        dataset_kind='model_grid',
        description='Bay of Bengal temperature dataset (thetao)'
    )

# Arabian Sea temperature subset from the same Copernicus product. Scientific
# coverage values are the decoded coordinates inspected from the local file.
ARABIAN_TEMPERATURE_DATASET_PATH = os.path.join(DATA_DIR, 'arabian_sea_temperature_multitime.nc')
if os.path.exists(ARABIAN_TEMPERATURE_DATASET_PATH):
    dataset_registry.register(
        'arabian-sea-temperature',
        ARABIAN_TEMPERATURE_DATASET_PATH,
        dataset_kind='model_grid',
        display_name='Arabian Sea Temperature',
        description='Arabian Sea potential temperature subset (thetao)',
        region_id='arabian-sea',
        provider='CMEMS - Global Monitoring and Forecasting Centre',
        product_id='GLOBAL_ANALYSISFORECAST_PHY_001_024',
        copernicus_dataset_id='cmems_mod_glo_phy-thetao_anfc_0.083deg_PT6H-i',
        variable='thetao',
        units='degrees_C',
        bounds={'west': 50.0, 'south': 5.0, 'east': 78.0, 'north': 25.0},
        time_coverage='2026-09-21 00:00 UTC to 2026-09-22 18:00 UTC',
        depth_coverage='0.494 m to 453.938 m',
        selectable_depth_indices=list(range(31)),
        provenance='Copernicus Marine Service, MERCATOR GLO12, unmodified spatial-temporal subset',
    )

# Arabian Sea salinity subset from the same Copernicus product.
ARABIAN_SALINITY_DATASET_PATH = os.path.join(DATA_DIR, 'arabian_sea_salinity_multitime.nc')
if os.path.exists(ARABIAN_SALINITY_DATASET_PATH):
    dataset_registry.register(
        'arabian-sea-salinity',
        ARABIAN_SALINITY_DATASET_PATH,
        dataset_kind='model_grid',
        display_name='Arabian Sea Salinity',
        description='Arabian Sea salinity subset (so)',
        region_id='arabian-sea',
        provider='CMEMS - Global Monitoring and Forecasting Centre',
        product_id='GLOBAL_ANALYSISFORECAST_PHY_001_024',
        copernicus_dataset_id='cmems_mod_glo_phy-so_anfc_0.083deg_PT6H-i',
        variable='so',
        units='1e-3',
        dimensions={'time': 8, 'depth': 31, 'latitude': 241, 'longitude': 337},
        bounds={'west': 50.0, 'south': 5.0, 'east': 78.0, 'north': 25.0},
        time_coverage='2026-09-21 00:00 UTC to 2026-09-22 18:00 UTC',
        depth_coverage='0.49402499198913574 m to 453.9377136230469 m',
        selectable_depth_indices=list(range(31)),
        provenance='Copernicus Marine Service, MERCATOR GLO12, unmodified spatial-temporal subset',
    )

# Arabian Sea eastward current (uo) subset from the same Copernicus product.
ARABIAN_UO_DATASET_PATH = os.path.join(DATA_DIR, 'arabian_sea_uo_multitime.nc')
if os.path.exists(ARABIAN_UO_DATASET_PATH):
    dataset_registry.register(
        'arabian-sea-uo',
        ARABIAN_UO_DATASET_PATH,
        dataset_kind='model_grid',
        display_name='Arabian Sea Eastward Current',
        description='Arabian Sea eastward current subset (uo)',
        region_id='arabian-sea',
        provider='CMEMS - Global Monitoring and Forecasting Centre',
        product_id='GLOBAL_ANALYSISFORECAST_PHY_001_024',
        copernicus_dataset_id='cmems_mod_glo_phy-cur_anfc_0.083deg_PT6H-i',
        variable='uo',
        units='m s-1',
        dimensions={'time': 8, 'depth': 31, 'latitude': 241, 'longitude': 337},
        bounds={'west': 50.0, 'south': 5.0, 'east': 78.0, 'north': 25.0},
        time_coverage='2026-09-21 00:00 UTC to 2026-09-22 18:00 UTC',
        depth_coverage='0.49402499198913574 m to 453.9377136230469 m',
        selectable_depth_indices=list(range(31)),
        provenance='Copernicus Marine Service, MERCATOR GLO12, unmodified spatial-temporal subset',
    )

# Arabian Sea northward current (vo) subset from the same Copernicus product.
ARABIAN_VO_DATASET_PATH = os.path.join(DATA_DIR, 'arabian_sea_vo_multitime.nc')
if os.path.exists(ARABIAN_VO_DATASET_PATH):
    dataset_registry.register(
        'arabian-sea-vo',
        ARABIAN_VO_DATASET_PATH,
        dataset_kind='model_grid',
        display_name='Arabian Sea Northward Current',
        description='Arabian Sea northward current subset (vo)',
        region_id='arabian-sea',
        provider='CMEMS - Global Monitoring and Forecasting Centre',
        product_id='GLOBAL_ANALYSISFORECAST_PHY_001_024',
        copernicus_dataset_id='cmems_mod_glo_phy-cur_anfc_0.083deg_PT6H-i',
        variable='vo',
        units='m s-1',
        dimensions={'time': 8, 'depth': 31, 'latitude': 241, 'longitude': 337},
        bounds={'west': 50.0, 'south': 5.0, 'east': 78.0, 'north': 25.0},
        time_coverage='2026-09-21 00:00 UTC to 2026-09-22 18:00 UTC',
        depth_coverage='0.49402499198913574 m to 453.9377136230469 m',
        selectable_depth_indices=list(range(31)),
        provenance='Copernicus Marine Service, MERCATOR GLO12, unmodified spatial-temporal subset',
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
