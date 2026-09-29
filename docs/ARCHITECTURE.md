# Architecture

This document describes the implementation present in the repository at the Phase 14A audit. It is not a future-state diagram.

## Runtime

```text
Browser (React + TypeScript + Cesium)
        |
        | bounded JSON API requests
        v
FastAPI routes and Pydantic schemas
        |
        v
Dataset/event/observation services
        |
        v
Local NetCDF and processed JSON inputs
```

The frontend owns interaction state and Cesium rendering. The backend owns dataset selection, coordinate/depth/time selection, QC-aware observation normalization, collocation, historical aggregation, and provenance. Large scientific arrays are subset before serialization.

## Backend

- `backend/app/main.py` creates the FastAPI application, health endpoint, and route registration.
- `backend/app/api/datasets.py` exposes the catalog, metadata, and bounded slices.
- `backend/app/api/regions.py` exposes data-backed and navigation-only study regions.
- `backend/app/api/observations.py` exposes Argo and Spray glider resources plus Argo/model collocation.
- `backend/app/api/alerts.py` derives residual-threshold alert summaries from collocation results.
- `backend/app/api/events.py` exposes the Cyclone Amphan event and IBTrACS track.
- `backend/app/api/historical_analysis.py` exposes phase means, paired differences, and track-linked profiles.
- `backend/app/services/dataset_registry.py` is the explicit mapping from application identifiers to local source files and metadata.
- Scientific readers and analysis are isolated in `netcdf_service.py`, `argo_service.py`, `glider_service.py`, `collocation_service.py`, `historical_dataset_service.py`, and `historical_analysis_service.py`.

No database, cache server, authentication layer, or background worker is used.

## Frontend

- `frontend/src/App.tsx` coordinates operational, observation, analysis, region, and historical-event state.
- `OceanGlobe.tsx` owns the Cesium viewer and composes the scientific layers.
- Globe layers render scalar fields, currents, Argo, glider, alerts, event track, probes, sections, subsurface frames, isosurfaces, and region boundaries.
- Analysis panels display profiles, residuals, probe output, transects, alerts, region metadata, and historical-event results.
- `LeftSidebar.tsx`, `BottomTimeline.tsx`, and visualization controls expose dataset, variable, layer, time, and depth state.
- API modules under `frontend/src/services` keep transport separate from view components; pure scientific display transformations live under `frontend/src/lib` and have deterministic tests.

## Context isolation

Operational 2026 fields and the 2020 Amphan historical event use separate state and dataset mappings. Entering event mode does not rewrite operational time. Exiting restores the previous operational selection. A missing historical mapping fails explicitly and cannot fall back to an operational dataset.

## Scientific contracts

- Responses expose source time, requested and actual depth where applicable, units, masks, and provenance.
- Salinity source unit `1e-3` is preserved rather than relabeled as PSU.
- Current U/V components are paired only on compatible grid, time, depth, units, and finite masks.
- Observation pressure is converted to geometric depth using TEOS-10 routines; the conversion is not treated as identity.
- Model-observation metrics are computed only from valid paired samples.

## Known scale boundary

The current release candidate uses small local subsets and bounded JSON responses. It does not implement Zarr/object storage, distributed computation, server-side tiles, or full-resolution global delivery.
