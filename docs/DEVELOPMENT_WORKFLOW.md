# Development and Release Workflow

## Change workflow

1. Read `AGENTS.md`, `CLAUDE.md`, `docs/SCIENTIFIC_RULES.md`, and `docs/ARCHITECTURE.md`.
2. Inspect the existing implementation and data metadata before editing.
3. State assumptions that affect units, coordinates, time, depth, QC, or provenance.
4. Make the smallest coherent change and add deterministic tests for logic changes.
5. Run the relevant backend and frontend checks.
6. Review the diff and `git status`; classify new files before staging.
7. Commit only reviewed product code, tests, documentation, and intentionally small processed artifacts.

## Required validation

```powershell
cd backend
python -m pytest tests -q
cd ..
cd frontend
npm run test:science
npm run typecheck
npm run build
```

For an end-to-end checkpoint, start FastAPI and Vite from a clean shell, verify `/health` and `/openapi.json`, then exercise the affected browser workflow with developer-console errors visible.

## Data and dependency rules

- Do not commit raw NetCDF, HDF, GRIB, GeoTIFF, Zarr, downloaded indexes, credentials, or local agent settings.
- Do not silently substitute synthetic values when source data is absent.
- Add Python runtime/test dependencies to `backend/requirements.txt` and frontend dependencies to `frontend/package.json`.
- Preserve source files and write reproducible transformations to scripts or documented processing steps.

## Submission checkpoint

Before a demo or SIH submission, complete `docs/RELEASE_CHECKLIST.md`, follow `docs/RELEASE_STAGING_MANIFEST.md`, and capture the exact commit hash used for the presentation.
