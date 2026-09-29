# Feature Status

Status reflects the Phase 14A repository audit, not planned work.

| Area | Status | Evidence and boundary |
|---|---|---|
| Bay of Bengal temperature | Implemented | Bounded model slices, depth/time selection, raster legend and tests. |
| Arabian Sea temperature | Implemented | Registered operational subset and shared slice path. |
| Arabian Sea salinity | Implemented | Source unit `1e-3` remains explicit. |
| Arabian Sea currents | Implemented | Compatible U/V pairing, speed and toward-bearing; incomplete pairs remain missing. |
| Study regions | Implemented | Bay of Bengal and Arabian Sea are data-backed; Equatorial Indian Ocean, Andaman Sea, and Northern Indian Ocean are navigation-only and labeled accordingly. |
| Argo profiles | Implemented | Real local NetCDF discovery, QC-aware profiles, TEOS-10 depth and potential temperature. |
| Argo/model collocation | Implemented | Nearest-time/grid and model-level-centric vertical pairing with tolerances, valid-pair Bias/RMSE/MAE, and no-overlap states. |
| Spray glider | Implemented | One registered real mission with trajectory, 703 profiles, 577,347 observations, and curtain/profile APIs. No model collocation. |
| Residual alerts | Implemented | Configured deviation thresholds only; explicitly not a hazard warning. |
| Ocean probe | Implemented | Nearest native model-grid column and actual source depths; no smoothing/interpolation. |
| Transect and subsurface views | Implemented | Operational model context with source-aware depth/time handling. |
| Historical Cyclone Amphan | Implemented | IBTrACS New Delhi track plus isolated GLORYS12V1 daily event context. |
| Historical phase analysis | Implemented | Explicit before/during/after means, paired scalar differences, and nearest track-linked profiles. Descriptive, not causal. |
| Historical advanced 3D | Not implemented | Isosurface, volume, and transect analysis are intentionally unavailable in historical event mode. |
| Buoy and CTD ingestion | Not implemented | Mentioned by the problem domain but no audited adapter or dataset is present. |
| Global scalable delivery | Not implemented | Current local subsets and JSON APIs are appropriate only for the audited demo scale. |

## Demo path

The strongest verified narrative is: choose a data-backed region, inspect an operational field, use the ocean probe, inspect an Argo profile and its collocation/residuals, then switch into the isolated Cyclone Amphan context and compare historical phase fields. Do not imply that reanalysis is observation or that phase differences prove cyclone causation.
