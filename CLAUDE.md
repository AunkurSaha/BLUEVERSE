# CLAUDE.md — SIH26067 Project Instructions

## Project Identity

This repository is for **Smart India Hackathon 2026 — Problem Statement SIH26067**, Ministry of Earth Sciences / INCOIS.

Goal: build a **browser-based interactive 3D/4D ocean visualization and model–observation analysis platform** that integrates:
- numerical ocean-model outputs;
- in-situ observations such as Argo, gliders, buoys, CTD, and related datasets;
- spatial, depth, and temporal exploration;
- model-versus-observation comparison;
- scalable browser delivery of large multidimensional datasets.

This is a scientific software project. Correctness is more important than flashy output.

---

# Mandatory Working Rules

## 1. Inspect Before Editing

Before making changes:
1. inspect the relevant existing files;
2. understand current architecture;
3. identify existing utilities/components/services that can be reused;
4. state important assumptions before implementation;
5. avoid rewriting working modules without a clear reason.

Do not create duplicate services, components, utilities, schemas, or abstractions if equivalent code already exists.

---

## 2. Never Fabricate Scientific Data

Do **not** silently generate fake oceanographic values.

Forbidden unless the task explicitly requests mock/demo data:
- random temperature fields;
- random salinity fields;
- fake Argo profiles;
- synthetic current vectors presented as real;
- invented model outputs;
- invented timestamps, coordinates, QC flags, units, resolutions, or dataset metadata.

If real data is unavailable:
- fail clearly;
- expose the missing dependency/data;
- optionally support a clearly labelled `demo/mock` mode only when explicitly requested.

Never present mock data as real INCOIS, Argo, Copernicus, GLORYS, or observational data.

---

## 3. Preserve Scientific Metadata

When reading scientific datasets, preserve and expose when available:
- variable names;
- `standard_name`;
- `long_name`;
- units;
- coordinate names;
- time/calendar metadata;
- depth/pressure metadata;
- fill/missing values;
- scale/offset values;
- quality-control flags;
- source/provenance;
- dataset identifier.

Do not discard metadata merely to simplify the frontend.

---

## 4. Never Assume Variable Names

Do not hard-code that all datasets use:
- `lat`;
- `lon`;
- `depth`;
- `time`;
- `temperature`;
- `salinity`;
- `u`;
- `v`.

Datasets may use names such as:
- `latitude`, `LATITUDE`, `nav_lat`;
- `longitude`, `LONGITUDE`, `nav_lon`;
- `depth`, `deptht`, `lev`, `pressure`, `PRES`;
- `thetao`, `TEMP`, `temperature`;
- `so`, `PSAL`, `salinity`;
- `uo`, `VO`, etc.

Prefer CF metadata and configurable aliases.

If coordinate/variable detection is ambiguous, report the ambiguity instead of guessing silently.

---

## 5. Coordinate and Unit Safety

Always consider:
- longitude may be `0..360` or `-180..180`;
- latitude ordering may be ascending or descending;
- depth may be positive downward or encoded differently;
- Argo often reports pressure rather than geometric depth;
- temperature may require scale/offset decoding;
- time may use CF calendars and numeric reference epochs;
- velocity units may vary;
- salinity conventions should not be silently changed.

Do not convert units without:
1. documenting the source unit;
2. documenting the target unit;
3. using a scientifically valid conversion;
4. adding or updating tests.

---

## 6. Quality-Control Rules

For observational data:
- do not treat all measurements as equally valid;
- retain original QC information;
- do not silently discard QC flags;
- validation/comparison code must define which QC values are accepted;
- any filtering rule must be documented.

For Argo specifically, never assume a profile is valid without checking available QC fields and adjusted variables where appropriate.

---

## 7. Model–Observation Comparison Rules

Model and observation values may only be compared after accounting for:
- spatial coordinates;
- time;
- vertical coordinate;
- units;
- valid-data masks;
- QC status;
- longitude convention;
- model domain;
- interpolation method.

Every collocation result should retain enough provenance to explain:
- observation used;
- model dataset used;
- model time(s);
- model grid point(s);
- interpolation method;
- spatial/time distance or tolerance;
- model value;
- observed value;
- residual.

Do not label residual-derived metrics as "AI confidence".

---

## 8. Performance Rules

Never load an entire large ocean model into memory unless the task explicitly requires it and the data size is proven safe.

Prefer:
- Xarray lazy access;
- Dask/chunking when appropriate;
- spatial/depth/time subsetting;
- server-side processing;
- Zarr/cloud-optimized layouts later in the project;
- typed compact responses rather than giant nested JSON arrays.

Avoid unnecessary `.values`, `.load()`, `.compute()`, or full-array conversions.

When one is required, document why it is safe.

---

## 9. Frontend Rules

The frontend is a scientific workspace, not a decorative dashboard.

Prioritize:
- correct geospatial positioning;
- clear variable/unit labels;
- visible timestamps;
- visible selected model depth;
- scientific colorbars;
- provenance/metadata;
- responsive interaction;
- graceful loading/error states.

Do not hide uncertainty or interpolation behind attractive UI.

If the requested depth differs from the actual model level, show both.

---

## 10. Architecture Rules

Initial stack:
- Frontend: React + TypeScript + Vite + CesiumJS
- Backend: Python + FastAPI
- Scientific: Xarray + NumPy + SciPy/Pandas as required
- Initial source format: NetCDF
- Later scalable format: Zarr/Dask
- Database later: PostgreSQL/PostGIS where appropriate

Do not introduce Redis, PostGIS, Docker, Kubernetes, WebGPU, message queues, or cloud infrastructure unless the current phase genuinely requires them.

Keep the repository simple during early scientific validation.

---

## 11. Dependency Rules

Before adding a dependency:
1. verify existing packages cannot reasonably solve the task;
2. explain why the dependency is needed;
3. add it to the appropriate dependency file;
4. avoid huge frameworks for small utilities;
5. prefer maintained, widely adopted scientific/geospatial libraries.

Never install global packages as part of repository code.

---

## 12. Testing Rules

Scientific logic requires tests.

Add tests for:
- coordinate normalization;
- nearest-level selection;
- variable/coordinate detection;
- missing values;
- unit conversions;
- interpolation;
- observation QC filtering;
- collocation;
- boundaries and out-of-domain cases.

Tests should use tiny deterministic fixtures, not huge production files.

---

## 13. Error Handling

Fail explicitly when:
- dataset cannot be opened;
- required variable is missing;
- units are incompatible;
- coordinates are ambiguous;
- requested point is outside model domain;
- time/depth selection cannot be satisfied;
- data contains only missing values.

Do not replace failures with zeros, random values, fabricated defaults, or placeholder science.

---

## 14. Scope Discipline

Implement only the requested phase.

Do not:
- build unrelated authentication;
- create admin dashboards;
- add AI/chatbot features;
- add databases early;
- redesign the whole repository;
- implement speculative "future" systems unless requested.

Hackathon priority:
1. real data;
2. scientific correctness;
3. working end-to-end flow;
4. performance;
5. presentation polish.

---

## 15. Before Finishing Any Task

Always report:
- files changed;
- why each file changed;
- commands/tests run;
- tests that passed/failed;
- assumptions made;
- known limitations;
- any scientific uncertainty;
- next recommended step.

If you could not verify something, explicitly say so.

Never claim "fully working", "production ready", "scientifically validated", or similar unless it was actually verified.
