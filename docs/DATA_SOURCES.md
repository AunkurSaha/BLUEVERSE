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

Dataset name: Instantaneous fields for product GLOBAL_ANALYSISFORECAST_PHY_001_024
Provider: Copernicus Marine
Local filename: data/raw/bay_of_bengal_temperature.nc
Dataset ID: cmems_mod_glo_phy-thetao_anfc_0.083deg_PT6H-i
Dataset version: 202406
Variable requested: thetao
Requested geographic bounds: 85E–90E, 15N–20N
Requested depth range: 0–500 m
Note that the dataset's shallowest model depth is approximately 0.494 m
Requested timestamp: 2026-09-21T00:00:00
Download size: approximately 0.45 MB
