# Definition of Done

A feature is not "done" because the UI renders.

Use this checklist.

---

# Every Feature

- [ ] Requested behavior exists.
- [ ] Scope matches the task.
- [ ] Existing architecture was respected.
- [ ] No unrelated functionality was added.
- [ ] Errors are handled.
- [ ] Relevant tests were added/updated.
- [ ] Relevant tests/validation were run.
- [ ] No secrets were added.
- [ ] Agent reviewed its own diff.
- [ ] Known limitations are documented.

---

# Scientific Feature

- [ ] Data source is real or clearly labelled synthetic.
- [ ] Provenance is known.
- [ ] Variable meaning is verified.
- [ ] Units are verified.
- [ ] Coordinates are verified.
- [ ] Time semantics are verified.
- [ ] Vertical coordinate is verified.
- [ ] Missing values are handled.
- [ ] QC is handled where applicable.
- [ ] No silent scientific assumptions remain.
- [ ] Output includes sufficient metadata for interpretation.

---

# Model Slice

- [ ] Correct variable selected.
- [ ] Correct time selected.
- [ ] Correct/nearest depth selected intentionally.
- [ ] Actual model level returned.
- [ ] Coordinates align with values.
- [ ] Land/missing cells preserved.
- [ ] Large dataset is not fully loaded unnecessarily.

---

# Observation Profile

- [ ] Platform ID preserved.
- [ ] Position/time preserved.
- [ ] Vertical coordinate preserved.
- [ ] Variables and units preserved.
- [ ] QC retained.
- [ ] Invalid values handled explicitly.

---

# Model–Observation Collocation

- [ ] Units compatible.
- [ ] Longitude conventions compatible.
- [ ] Spatial match/interpolation defined.
- [ ] Vertical match/interpolation defined.
- [ ] Temporal match/interpolation defined.
- [ ] QC policy applied.
- [ ] Out-of-domain cases handled.
- [ ] Missing values excluded.
- [ ] Residual convention documented.
- [ ] Valid pair count reported for aggregate metrics.
- [ ] Provenance retained.

---

# Frontend Visualization

- [ ] Variable name visible.
- [ ] Unit visible.
- [ ] Time visible.
- [ ] Depth/vertical coordinate visible.
- [ ] Colorbar visible and meaningful.
- [ ] Loading state does not display fake values.
- [ ] Error state is visible.
- [ ] Data source/provenance can be inspected.
