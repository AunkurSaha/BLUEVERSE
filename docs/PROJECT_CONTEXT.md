# Project Context — SIH26067

## Problem Statement

**SIH26067 — Ministry of Earth Sciences / INCOIS**

Develop a web-based interactive 3D visualization platform integrating numerical ocean-model outputs and in-situ observations.

---

## Product Interpretation

The platform should become a browser-native scientific workspace for exploring the ocean across:

**longitude × latitude × depth × time**

It must bring together:

### Numerical model data
Examples:
- temperature;
- salinity;
- ocean-current components;
- sea-surface-height-related products;
- biogeochemical variables where available.

### In-situ observations
Examples:
- Argo;
- BGC-Argo;
- gliders;
- moored buoys;
- CTD;
- ship observations;
- other INCOIS-supported observational systems.

---

## Core User

Primary user:
- ocean scientist;
- model analyst;
- operational forecaster;
- INCOIS technical user.

Secondary user:
- researcher;
- student;
- policy/operations stakeholder requiring interpretable ocean information.

This is not primarily a general-public weather app.

---

## Core Product Capabilities

### P0 — Must Work
1. open real ocean-model data;
2. inspect metadata;
3. display a variable geographically;
4. select depth;
5. select time;
6. display Argo observations;
7. inspect an observation profile;
8. compare model and observation at compatible location/time/depth.

### P1 — Important
1. current vectors/particles;
2. scientific color controls;
3. vertical section;
4. layer manager;
5. dataset catalogue and metadata;
6. export/share analysis state where feasible.

### P2 — Differentiators
1. interactive ocean "X-ray" slicing;
2. true subsurface/volume rendering;
3. 3D Argo/glider trajectory visualization;
4. adaptive level-of-detail/chunk streaming;
5. residual/error visualization for model–observation comparison.

---

## Non-Goals During Early Development

Do not initially build:
- authentication;
- chatbot/RAG;
- AI diagnosis/prediction;
- complex admin modules;
- Kubernetes deployment;
- Redis;
- PostGIS;
- full global production-scale ingestion;
- WebGPU-only rendering.

First prove the science and end-to-end workflow with small real datasets.

---

## Fundamental Data Models

### Numerical model

Conceptually:

`M(time, depth, latitude, longitude)`

A gridded multidimensional field.

### Observation

Conceptually:

`O(platform, time, latitude, longitude, vertical_coordinate, variable, value, qc)`

Sparse real-world measurements.

These should not be forced into the same physical storage structure.

---

## Target End-to-End Story

1. User opens the Indian Ocean view.
2. Selects a model variable such as temperature.
3. Chooses a time and depth.
4. Backend reads/subsets the actual scientific dataset.
5. Frontend renders the field.
6. User enables Argo observations.
7. User clicks an Argo float/profile.
8. Platform displays real measured values.
9. User selects **Compare with model**.
10. Backend collocates model and observation.
11. UI shows model profile, observed profile, residuals, bias/RMSE where appropriate.
12. Advanced views expose current vectors, vertical sections, and subsurface structure.

---

## Guiding Principle

The differentiator is not "a 3D globe".

The differentiator is:

**real multidimensional ocean science + observation integration + scientifically transparent browser interaction.**
