# Release Checklist

## Repository

- [ ] Working tree contains only reviewed release files.
- [ ] Debug scripts, screenshots, logs, backups, and phase working notes are removed or intentionally archived outside the repository.
- [ ] Large tracked binaries are reviewed and removed from the submission history if not required.
- [ ] No raw scientific data, downloaded catalogue indexes, secrets, or local settings are staged.
- [ ] `git diff --check` passes.
- [ ] Release commit hash and branch are recorded.

## Validation

- [ ] `python -m pytest tests -q` passes from `backend`.
- [ ] `npm run test:science` passes in `frontend`.
- [ ] `npm run typecheck` passes in `frontend`.
- [ ] `npm run build` passes in `frontend`.
- [ ] Fresh backend `/health` and `/openapi.json` smoke checks pass.
- [ ] Fresh frontend loads without a black screen or uncaught console error.
- [ ] Bay of Bengal temperature, Arabian Sea currents, Argo collocation, glider curtain, and historical salinity difference are exercised in the browser.

## Scientific integrity

- [ ] Units, time, selected actual depth, colorbar, and provenance are visible for the demo fields.
- [ ] Missing data remains missing; no fallback mock values appear.
- [ ] Observation QC rules and collocation tolerances are stated.
- [ ] Model, reanalysis, and observation labels are distinct.
- [ ] Historical differences use non-causal language.
- [ ] Residual alerts are not described as hazard forecasts.

## Documentation and submission

- [ ] README setup works from a clean environment with separately supplied data.
- [ ] Feature matrix and known limitations match the demo build.
- [ ] SIH alignment claims are supported by implemented behavior.
- [ ] Data provenance and licenses/access conditions are included in submission material.
- [ ] Final PPT screenshots and recorded demo use the exact release commit.
