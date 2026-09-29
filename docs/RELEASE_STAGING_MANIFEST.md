# Release Staging Manifest

This manifest accounts for every modified, deleted-from-index, and untracked path after the Phase 14B cleanup. It is a review plan only. No `git add`, commit, or push was performed.

## A. STAGE — REQUIRED PRODUCT CODE

| Path | Action | Rationale |
|---|---|---|
| `.gitignore` | Stage modification | Keeps raw data, local configuration, generated output, and local tool engines out of Git. |
| `backend/app/api/__init__.py` | Stage modification | Registers current API routers. |
| `backend/app/api/observations.py` | Stage modification | Argo and glider API implementation. |
| `backend/app/main.py` | Stage modification | Current FastAPI application wiring. |
| `backend/app/schemas/__init__.py` | Stage modification | Exposes current response schemas. |
| `backend/app/schemas/dataset.py` | Stage modification | Dataset response contract. |
| `backend/app/services/__init__.py` | Stage modification | Exposes current service implementations. |
| `backend/app/services/argo_service.py` | Stage modification | QC-aware Argo processing and logging. |
| `backend/app/services/dataset_registry.py` | Stage modification | Operational and historical dataset mappings. |
| `backend/app/api/alerts.py` | Stage new file | Residual alert endpoints used by the application. |
| `backend/app/api/events.py` | Stage new file | Historical event endpoints used by the application. |
| `backend/app/api/historical_analysis.py` | Stage new file | Historical analysis endpoints used by event mode. |
| `backend/app/api/regions.py` | Stage new file | Study-region endpoints used by the application. |
| `backend/app/schemas/alerts.py` | Stage new file | Alert API contracts. |
| `backend/app/schemas/events.py` | Stage new file | Historical event API contracts. |
| `backend/app/schemas/regions.py` | Stage new file | Study-region API contracts. |
| `backend/app/services/alert_service.py` | Stage new file | Residual classification and summaries. |
| `backend/app/services/event_service.py` | Stage new file | Loads the normalized Amphan event document. |
| `backend/app/services/historical_analysis_service.py` | Stage new file | Phase means, differences, and track-linked profiles. |
| `backend/app/services/historical_dataset_service.py` | Stage new file | Historical dataset inspection and validation. |
| `backend/app/services/region_service.py` | Stage new file | Data-backed and navigation-only region registry. |
| `data/processed/events/cyclone-amphan-2020.json` | Stage new file | Small runtime-required normalized IBTrACS track with provenance. |
| `frontend/package.json` | Stage modification | Includes the complete science-test command. |
| `frontend/src/App.tsx` | Stage modification | Current application and historical-mode state integration. |
| `frontend/src/components/globe/IsosurfaceLayer.tsx` | Stage modification | Current isosurface integration. |
| `frontend/src/components/globe/OceanGlobe.tsx` | Stage modification | Composes the current Cesium scientific layers. |
| `frontend/src/components/globe/TemperatureLegend.tsx` | Stage modification | Current variable/unit legend behavior. |
| `frontend/src/components/layout/BottomTimeline.tsx` | Stage modification | Current time/depth controls. |
| `frontend/src/components/layout/LeftSidebar.tsx` | Stage modification | Current dataset, layer, region, and event controls. |
| `frontend/src/lib/temperatureSlice.ts` | Stage modification | Current bounded scalar transform logic. |
| `frontend/src/services/api.ts` | Stage modification | Current model-data API client. |
| `frontend/src/components/analysis/AlertPanel.tsx` | Stage new file | Runtime residual-alert view. |
| `frontend/src/components/analysis/HistoricalEventPanel.tsx` | Stage new file | Runtime historical-event analysis view. |
| `frontend/src/components/analysis/OceanProbePanel.tsx` | Stage new file | Runtime ocean-probe results view. |
| `frontend/src/components/analysis/RegionInfoPanel.tsx` | Stage new file | Runtime region status and metadata view. |
| `frontend/src/components/analysis/ResidualProfileChart.tsx` | Stage new file | Runtime collocation residual chart. |
| `frontend/src/components/globe/AlertLayer.tsx` | Stage new file | Runtime alert globe layer. |
| `frontend/src/components/globe/HistoricalEventLayer.tsx` | Stage new file | Runtime IBTrACS track layer. |
| `frontend/src/components/globe/OceanProbeLayer.tsx` | Stage new file | Runtime probe marker/profile layer. |
| `frontend/src/components/globe/StudyRegionLayer.tsx` | Stage new file | Runtime region-boundary layer. |
| `frontend/src/components/navigation/StudyRegionSelector.tsx` | Stage new file | Runtime study-region selector. |
| `frontend/src/lib/alerts.ts` | Stage new file | Alert filtering and display helpers. |
| `frontend/src/lib/historicalEventPanelState.ts` | Stage new file | Explicit historical panel runtime states. |
| `frontend/src/lib/historicalEvents.ts` | Stage new file | Historical event transform helpers. |
| `frontend/src/lib/historicalOcean.ts` | Stage new file | Historical ocean-field helpers. |
| `frontend/src/lib/oceanProbe.ts` | Stage new file | Probe transform helpers. |
| `frontend/src/lib/regions.ts` | Stage new file | Region transform helpers. |
| `frontend/src/services/alertApi.ts` | Stage new file | Alert API client. |
| `frontend/src/services/eventApi.ts` | Stage new file | Historical event API client. |
| `frontend/src/services/historicalOceanApi.ts` | Stage new file | Historical analysis API client. |
| `frontend/src/services/regionApi.ts` | Stage new file | Region API client. |

## B. STAGE — REQUIRED TESTS

| Path | Action | Rationale |
|---|---|---|
| `frontend/src/lib/oceanAnalysis.test.ts` | Stage modification | Operational analysis regression coverage. |
| `frontend/src/lib/subsurfaceFrame.test.ts` | Stage modification | Subsurface-frame regression coverage. |
| `frontend/src/lib/temperatureSlice.test.ts` | Stage modification | Scalar slice scientific regression coverage. |
| `backend/tests/conftest.py` | Stage new file | Makes both supported backend import styles resolvable during collection. |
| `backend/tests/test_alert_service.py` | Stage new file | Alert thresholds and locked collocation baselines. |
| `backend/tests/test_arabian_dataset.py` | Stage new file | Real Arabian dataset metadata and compatibility checks. |
| `backend/tests/test_event_api.py` | Stage new file | Historical event API coverage. |
| `backend/tests/test_event_service.py` | Stage new file | IBTrACS extraction and event-service coverage. |
| `backend/tests/test_historical_analysis_service.py` | Stage new file | Historical phase-analysis scientific coverage. |
| `backend/tests/test_historical_event_datasets.py` | Stage new file | Historical data-gate coverage. |
| `backend/tests/test_region_api.py` | Stage new file | Region API coverage. |
| `backend/tests/test_region_service.py` | Stage new file | Region registry coverage. |
| `frontend/scripts/run-historical-panel-test.mjs` | Stage new file | Required by `npm run test:science`. |
| `frontend/src/components/analysis/HistoricalEventPanel.test.tsx` | Stage new file | Historical panel black-screen/runtime-state regression. |
| `frontend/src/lib/alerts.test.ts` | Stage new file | Alert filtering coverage. |
| `frontend/src/lib/historicalEvents.test.ts` | Stage new file | Historical event transform coverage. |
| `frontend/src/lib/oceanProbe.test.ts` | Stage new file | Probe transform coverage. |
| `frontend/src/lib/regions.test.ts` | Stage new file | Region transform coverage. |

## C. STAGE — DOCUMENTATION / REPRODUCIBILITY

| Path | Action | Rationale |
|---|---|---|
| `README.md` | Stage new file | Setup, validation, limitations, and reproducibility entry point. |
| `backend/requirements.txt` | Stage new file | Reproducible Python dependency manifest. |
| `docs/ARCHITECTURE.md` | Stage modification | Current implementation architecture. |
| `docs/DATA_SOURCES.md` | Stage modification | Source provenance and processing rules. |
| `docs/DEVELOPMENT_WORKFLOW.md` | Stage modification | Current development and release workflow. |
| `docs/PROJECT_CONTEXT.md` | Stage modification | Current SIH project context. |
| `docs/SCIENTIFIC_RULES.md` | Stage modification | Scientific comparison and terminology rules. |
| `docs/FEATURE_STATUS.md` | Stage new file | Implemented and unsupported capability matrix. |
| `docs/RELEASE_CHECKLIST.md` | Stage new file | Objective release gates. |
| `docs/SIH_ALIGNMENT.md` | Stage new file | Evidence-based SIH26067 mapping. |
| `docs/RELEASE_STAGING_MANIFEST.md` | Stage new file | Exact reviewed staging plan. |
| `scripts/extract_ibtracs_event.py` | Stage new file | Reproduces the processed event JSON from the raw IBTrACS CSV. |
| `scripts/inspect_historical_event_data.py` | Stage new file | Verifies historical NetCDF metadata and compatibility. |

## D. DO NOT STAGE

| Path | Current index action | Rationale |
|---|---|---|
| `.claude/settings.local.json` | Keep the cached-removal record; never stage file content | Machine-local Claude permission settings. The local copy is retained and ignored. |
| `.agents/skills/impeccable/scripts/bin/windows-x64/impeccable.exe` | Keep the cached-removal record; never stage binary content | Optional development engine; application runtime/build/tests do not use it. The local copy is retained and ignored. |
| `.claude/skills/impeccable/scripts/bin/windows-x64/impeccable.exe` | Keep the cached-removal record; never stage binary content | Optional development engine; application runtime/build/tests do not use it. The local copy is retained and ignored. |

The three cached-removal records are already index changes because `git rm --cached` is the mechanism that stops tracking while preserving local files. No other path is staged.
