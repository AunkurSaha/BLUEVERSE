# Architecture — SIH26067

## Current Development Principle

Build from verified scientific data outward.

Order:

1. inspect real dataset;
2. extract correct 2D slice;
3. expose backend API;
4. render in browser;
5. add depth/time;
6. add observations;
7. add collocation;
8. add advanced 3D;
9. optimize large-data delivery.

Do not invert this order.

---

# Initial Stack

## Frontend
- React
- TypeScript
- Vite
- CesiumJS
- scientific chart library as required

## Backend
- Python
- FastAPI

## Scientific processing
- Xarray
- NumPy
- SciPy
- Pandas only where useful

## Storage — Early Stage
- local real NetCDF sample files

## Storage — Later
- Zarr/object storage for multidimensional arrays
- PostgreSQL/PostGIS for observational metadata/application data
- cache only after profiling demonstrates need

---

# Intended Data Flow

```text
MODEL SOURCES
NetCDF / OPeNDAP / compatible source
            |
            v
       Model Adapter
            |
            v
       Xarray Dataset
            |
            +----> slice
            +----> profile
            +----> section
            +----> volume
            |
            v
          API
            |
            v
     Browser visualization
```

```text
OBSERVATION SOURCES
Argo / Glider / Buoy / CTD
            |
            v
     Observation Adapter
            |
            v
    Normalized Observation
            |
            +----> map points
            +----> profile
            |
            v
       Collocation Engine
            ^
            |
          Model
```

---

# Backend Boundaries

Suggested modules as they become necessary:

```text
backend/app/
  main.py
  api/
    datasets.py
    slices.py
    observations.py
    collocation.py
  services/
    dataset_registry.py
    model_reader.py
    observation_reader.py
    argo_reader.py
    collocation.py
    section.py
  schemas/
  core/
```

Do not create empty modules merely to match this document.

Create them when required.

---

# Adapter Philosophy

Scientific sources differ.

Prefer adapters over source-specific code scattered across API routes.

Conceptual interfaces:

## Model adapter

- metadata
- variables
- select_time
- select_depth
- slice
- profile
- section
- volume

## Observation adapter

- metadata
- query(bounds, time)
- platforms
- profiles
- measurements

Adapters must preserve provenance and source metadata.

---

# API Principles

API responses must be:
- explicit about units;
- explicit about selected/actual depth;
- explicit about time;
- explicit about missing data;
- typed/schema-validated;
- bounded in size.

Do not return a complete large model array as nested JSON.

---

# Performance Principles

Early phase:
- keep real sample dataset small;
- prefer lazy Xarray access;
- subset before materializing.

Later phase:
- benchmark;
- convert appropriate products to Zarr;
- chunk according to actual access patterns;
- create LOD only when required;
- consider binary/texture-ready payloads for visualization.

---

# Frontend Architecture Principles

Main scientific workspace:

```text
Top bar: dataset/context
Left: variables/layers
Center: Cesium 3D viewport
Right: inspector/profile/comparison
Bottom: time and depth controls
```

The 3D viewport should remain visually dominant.

State should include:
- dataset;
- variable;
- time;
- requested depth;
- actual model level;
- viewport;
- active observation layers;
- color scale.

---

# Advanced 3D Roadmap

Order:
1. horizontal depth slice;
2. vertical section;
3. orthogonal X-ray planes;
4. current arrows;
5. particle advection;
6. downsampled volume rendering;
7. isosurface;
8. adaptive LOD.

Do not start with full volume rendering.
