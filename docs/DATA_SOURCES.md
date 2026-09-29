# Data Sources and Data Integrity Rules

This document tracks real datasets used by the project.

Do not add a dataset here unless its source is known.

---

# Preferred Source Categories

## 1. INCOIS
Use official INCOIS-provided/problem-statement datasets when accessible.

Possible categories:
- ocean model outputs;
- Argo-related holdings;
- moored buoy products;
- ship observations;
- operational ocean products.

Exact dataset identifiers must be recorded after selection.

---

## 2. Argo GDAC

Official Argo Global Data Assembly Centre data.

Typical file categories:
- profile;
- trajectory;
- metadata;
- technical.

Use official NetCDF data and retain QC information.

---

## 3. Copernicus Marine

Potential sources:
- GLORYS / global ocean physics products;
- in-situ products;
- subset downloads;
- NetCDF/Zarr-compatible products.

Record exact product ID and dataset version when used.

---

# Dataset Registry Template

For every real dataset added to the project, document:

```text
Dataset name:
Provider:
Product ID:
Dataset/version:
Source URL/portal:
Date downloaded:
File format:
Geographic coverage:
Temporal coverage:
Vertical coverage:
Resolution:
Variables used:
Variable mapping:
Units:
Coordinate names:
Longitude convention:
Vertical coordinate:
Calendar/time convention:
QC fields:
License/access restrictions:
Local path:
Processing performed:
Known limitations:
```

---

# Data Rules

1. Do not commit large raw scientific datasets to Git unless intentionally approved.
2. Add raw data folders/files to `.gitignore` as appropriate.
3. Preserve original downloaded files.
4. Put transformed data in a separate processed directory.
5. Never overwrite raw source data during preprocessing.
6. Record transformations.
7. Never rename variables in a way that destroys source identity; use a mapping layer.
8. Never claim a dataset is from INCOIS, Argo, Copernicus, NOAA, etc. unless provenance proves it.

---

# Current Project Datasets

Operational model datasets use Copernicus Marine product `GLOBAL_ANALYSISFORECAST_PHY_001_024`. Registered Bay of Bengal and Arabian Sea files cover temperature (`thetao`), salinity (`so`), and horizontal currents (`uo`, `vo`) where present. These are model analysis/forecast fields, not observations. Exact local file mappings are defined in `backend/app/services/dataset_registry.py`; large NetCDF inputs are intentionally excluded from Git.

Dataset name: Instantaneous fields for product GLOBAL_ANALYSISFORECAST_PHY_001_024
Provider: Copernicus Marine
Application dataset ID: bay-of-bengal-temperature
Local filename: data/raw/bay_of_bengal_temperature.nc
Copernicus dataset ID: cmems_mod_glo_phy-thetao_anfc_0.083deg_PT6H-i
Dataset version: 202406
Variable requested: thetao
Requested geographic bounds: 85E–90E, 15N–20N
Requested depth range: 0–500 m
Note that the dataset's shallowest model depth is approximately 0.494 m
Requested timestamp: 2026-09-21T00:00:00
Download size: approximately 0.45 MB

---

Dataset name: International Best Track Archive for Climate Stewardship, North Indian basin
Provider: NOAA National Centers for Environmental Information
Product ID: IBTrACS SID 2020136N10088 (Cyclone Amphan)
Dataset/version: IBTrACS v04r01
Source URL: https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r01/access/csv/ibtracs.NI.list.v04r01.csv
Date downloaded: 2026-09-30
File format: CSV with column and unit header rows
Geographic coverage used: 86.0E to 89.6E, 10.4N to 25.4N
Temporal coverage used: 2020-05-16 00:00 UTC to 2020-05-21 12:00 UTC
Variables used: NEWDELHI_LAT, NEWDELHI_LON, NEWDELHI_WIND, NEWDELHI_PRES, NEWDELHI_GRADE
Units: degrees_north, degrees_east, kts, mb, source grade code
Agency/series: RSMC New Delhi (IMD), NEWDELHI_* only
Local raw path: data/raw/events/ibtracs.NI.list.v04r01.csv
Local processed path: data/processed/events/cyclone-amphan-2020.json
Raw SHA-256: eafa65b9fb3ec1651a9758f9b08039f3a76bd97f50609ff3c7b90db39c8abbc7
Processing performed: Selected the named IBTrACS SID, retained rows with agency-specific New Delhi coordinates, sorted timestamps, preserved missing values, and computed bounds and source-supported extrema.
Known limitation: Six earlier IBTrACS merged positions do not contain the NEWDELHI_* series and are excluded to avoid mixing agency estimates.

---

Dataset name: Global Ocean Physics Reanalysis, Cyclone Amphan historical subset
Provider: Mercator Ocean International via Copernicus Marine
Product ID: GLOBAL_MULTIYEAR_PHY_001_030
Dataset/version: cmems_mod_glo_phy_my_0.083deg_P1D-m, version 202311
Source URL/portal: https://data.marine.copernicus.eu/product/GLOBAL_MULTIYEAR_PHY_001_030/description
Date downloaded: 2026-09-30 with Copernicus Marine CLI 2.4.1
File format: NetCDF4, source variables packed as int16 and decoded through CF scale/offset metadata
Geographic coverage: 84.0E to 92.0E, 8.0N to 28.0N
Catalogue temporal coverage at discovery: 1993-01-01 00:00 UTC to 2026-06-23 00:00 UTC
Temporal coverage: 2020-05-13 00:00 UTC to 2020-05-24 00:00 UTC, 12 daily timestamps
Vertical coverage: 50 source levels; subset retains the 31 native levels from 0.49402499198913574 m to 453.9377136230469 m, positive down
Resolution: 1/12 degree spatial grid; daily temporal fields
Variables used: thetao, so, uo, vo
Variable mapping: temperature=thetao; salinity=so; eastward current=uo; northward current=vo
Units: thetao degrees_C; so 1e-3; uo and vo m s-1
Coordinate names: longitude, latitude, depth, time
Longitude convention: degrees_east; this subset contains 84.0 to 92.0
Vertical coordinate: depth in metres, source levels retained without interpolation
Calendar/time convention: gregorian; raw time units hours since 1950-01-01; decoded values are daily 00:00 instants and the CLI subset request used UTC endpoints
QC fields: model reanalysis fields do not provide observational QC flags; missing values retain the source _FillValue mask
License/access restrictions: Copernicus Marine terms of use and authenticated catalogue access
Local paths: data/raw/events/amphan_2020_temperature.nc; data/raw/events/amphan_2020_salinity.nc; data/raw/events/amphan_2020_uo.nc; data/raw/events/amphan_2020_vo.nc
SHA-256: temperature e6ce75629e0d116f71cb9c7546088184fe7b84ca04ee93f90f71bad1d16ceaf8; salinity 992208c90bbe63cd55a69e6d8cdc5690e1d976fa89d672ee287298276527ea3f; uo 1259456c7d0251083882b43d70b1389a4b9416125d064ff8cf2ccb9a1a925916; vo fb42998d406d9ff4368fdf610a52403bee1bbc9ee41aaf8f3e7fc0f2191319a2
Processing performed: Copernicus server-side spatial, temporal, depth, and variable subsetting only; no resampling, interpolation, or derived variables
Known limitations: This is a model reanalysis, not an observation. The subset supports later before/during/after analysis, but phase windows and causal attribution are not defined by this data gate.

---

Dataset name: Argo profile observations
Provider: Argo GDAC / IFREMER
File format: Argo profile NetCDF
Local path: data/raw/argo
Variables used: PRES, TEMP, PSAL and adjusted counterparts when data mode and availability support them
QC policy: accepted per-variable QC flags are 1 and 2; original flags and selected source-variable names remain exposed
Processing performed: selects a primary sampling profile when available; converts pressure to geometric depth and derives Absolute Salinity/potential temperature with TEOS-10 (`gsw`)
Known limitations: local file discovery defines the available set; model collocation is nearest-time/grid with explicit tolerances and model-level-centric vertical pairing, not continuous interpolation

---

Dataset name: Spray glider mission 19607101
Provider/source description: Spray science-quality TrajectoryProfile NetCDF
Local filename: SPRAY-FRSQ-19607101-sp071-20190602T1209.nc
Mission coverage: 703 profiles and 577,347 observations in the registered file
QC policy: variable samples with QC value 1 are accepted
Processing performed: trajectory, profile summary/detail, and depth-binned curtain extraction
Known limitations: no glider/model collocation is implemented. The 2019 mission is not temporally comparable with the registered 2026 operational model fields.
