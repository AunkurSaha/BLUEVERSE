# BLUEVERSE

BLUEVERSE is a browser-based 3D/4D ocean visualization and model-observation analysis prototype for Smart India Hackathon 2026 problem statement SIH26067. It combines bounded Copernicus Marine model fields, Argo profiles, a Spray glider mission, and a Cyclone Amphan historical case study without presenting model output as observation.

## Implemented scope

- Cesium globe with temperature, salinity, horizontal currents, depth, and time controls.
- Bay of Bengal and Arabian Sea data-backed regions plus three navigation-only Indian Ocean regions.
- Argo profile inspection, QC-aware TEOS-10 normalization, model collocation, and residual metrics.
- Spray glider trajectory, profiles, and curtain views.
- Cyclone Amphan track and GLORYS12V1 before/during/after analysis.
- Explicit loading, unavailable, no-overlap, and error states.

See [docs/FEATURE_STATUS.md](docs/FEATURE_STATUS.md) for the verified feature matrix and limitations.

## Local setup

Requirements: Python 3.11 or newer, Node.js 22 or newer, and npm. Raw NetCDF inputs are not stored in Git; obtain the audited source files separately and place them at the paths listed in [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md).

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. The frontend expects the API at `http://127.0.0.1:8000` unless its Vite environment overrides that address.

## Validation

```powershell
cd backend
python -m pytest tests -q
cd ..
cd frontend
npm run test:science
npm run typecheck
npm run build
```

## Scientific boundaries

- Copernicus operational fields are model analysis/forecast products; GLORYS12V1 is model reanalysis. Neither is a direct observation.
- Argo comparisons accept QC flags 1 and 2 and retain source/QC metadata.
- Historical differences are descriptive and do not establish cyclone causation.
- Alert severity represents configured model-observation residual thresholds, not a public-safety hazard classification.
- Missing or out-of-domain data is reported, never replaced by synthetic values.

## Repository hygiene

Large raw scientific files, local settings, caches, and generated output are ignored. The small processed Cyclone Amphan track JSON is intentionally allowed because it is reproducible from the documented IBTrACS source. Review [docs/RELEASE_STAGING_MANIFEST.md](docs/RELEASE_STAGING_MANIFEST.md) before preparing a submission commit.

## Reproducibility tools

Regenerate the normalized Amphan track from a separately acquired IBTrACS CSV:

```powershell
python scripts\extract_ibtracs_event.py data\raw\events\ibtracs.NI.list.v04r01.csv data\processed\events\cyclone-amphan-2020.json --retrieval-date YYYY-MM-DD
```

Inspect compatibility of the four separately acquired historical NetCDF subsets:

```powershell
python scripts\inspect_historical_event_data.py
```
