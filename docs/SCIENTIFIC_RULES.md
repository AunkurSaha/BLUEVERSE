# Scientific Rules and Assumptions

This file defines guardrails for oceanographic correctness.

Update it whenever a scientifically meaningful assumption changes.

---

# 1. Coordinate Semantics

## Latitude
- Do not assume ordering.
- Some datasets are north-to-south; others south-to-north.
- Preserve source coordinate values.

## Longitude
Source may use:
- `-180..180`
- `0..360`

Normalize only at a well-defined interface boundary.

Any normalization must be tested around:
- 0°;
- 180°;
- -180°;
- dateline crossing.

## Vertical Coordinate
Do not assume that `depth`, `lev`, `pressure`, or similar names mean identical things.

Record:
- name;
- units;
- positive direction;
- reference level;
- whether coordinate is pressure or geometric depth.

Never equate pressure and metres without an explicitly documented approximation/conversion.

---

# 2. Time

Scientific data may use CF-style encoded time.

Respect:
- units such as `hours since ...`;
- calendars;
- timezone/UTC semantics;
- model timestep;
- observation timestamp precision.

Do not compare timestamps by string formatting.

Model–observation matching must define and expose a temporal tolerance.

---

# 3. Temperature

Possible concepts may include:
- in-situ temperature;
- potential temperature;
- conservative temperature.

Do not label them all simply as equivalent "temperature" in scientific comparison logic.

Expose source variable name and metadata.

---

# 4. Salinity

Different salinity variables/conventions may exist.

Do not silently convert or relabel.

Preserve units/convention metadata whenever available.

---

# 5. Ocean Currents

Typical model output:
- eastward component `u`;
- northward component `v`;
- sometimes vertical `w`.

Horizontal speed:

`sqrt(u^2 + v^2)`

Only compute this when `u` and `v`:
- refer to compatible grid locations;
- use compatible units;
- refer to the same depth/time.

Staggered grids may require special handling.

Do not assume every ocean model stores current components at identical grid points.

---

# 6. Missing Data

Respect:
- `_FillValue`;
- `missing_value`;
- NaN;
- masks;
- land cells.

Never replace missing scientific values with zero.

Zero can be a valid measurement.

---

# 7. Packed Data

NetCDF variables may use:
- `scale_factor`;
- `add_offset`.

Prefer Xarray/NetCDF decoding where valid.

Do not apply decoding twice.

---

# 8. Argo / Observation QC

Observation comparison must respect available quality-control fields.

Rules for accepted QC values must be:
- explicit;
- configurable where appropriate;
- documented;
- tested.

Prefer adjusted variables when scientifically appropriate and metadata supports their use.

Do not drop QC metadata from normalized observation structures.

---

# 9. Collocation

A model–observation comparison must define:

- model dataset;
- observation dataset/platform;
- target variable;
- observation coordinates;
- observation time;
- observation vertical coordinate;
- model spatial interpolation method;
- vertical interpolation method;
- temporal interpolation method;
- accepted QC;
- domain/tolerance checks.

Minimum result provenance:

- observed value;
- model value;
- residual = model - observation;
- units;
- source model time/grid information;
- matching/interpolation method.

---

# 10. Validation Metrics

For valid paired samples:

Bias:

`mean(model - observation)`

RMSE:

`sqrt(mean((model - observation)^2))`

MAE:

`mean(abs(model - observation))`

Do not compute metrics over:
- incompatible units;
- rejected QC values;
- missing values;
- invalid/out-of-domain matches.

Report valid sample count with metrics.

If no valid temporal, spatial, vertical, unit-compatible, and QC-accepted pairs exist, return an explicit no-overlap status. Do not report zero-valued metrics.

---

# 11. Visualization

Every scientific map/plot should expose:
- variable;
- unit;
- time;
- depth/vertical coordinate;
- color scale.

Avoid rainbow scales by default where scientifically misleading.

Do not visually interpolate beyond what the data supports without making interpolation clear.

---

# 12. Provenance

Where feasible, retain:
- dataset ID;
- source/provider;
- original filename/URI;
- variable name;
- processing timestamp;
- preprocessing steps;
- version.

Processed data should remain traceable to its source.

---

# 13. Scientific Assumptions Log

Add project-specific decisions below as they are made.

## Current assumptions
- Numerical analysis, forecast, and reanalysis fields are model products, not observations. UI and documentation must label them separately from Argo and glider measurements.
- Argo comparison uses in-situ temperature as the observed source value and TEOS-10-derived potential temperature only when the model-variable comparison requires it. Pressure-to-depth uses `gsw.z_from_p`; practical-to-absolute salinity uses `gsw.SA_from_SP`; potential temperature uses `gsw.pt0_from_t`.
- Alert severity is a configured model-observation deviation category, not a hazard classification, emergency warning, or forecast confidence.
- For the Phase 5 temperature raster:
  - `lat_vals` and `lon_vals` are treated as grid-cell centers.
  - A regular raster is accepted only when coordinate spacing is monotonic and regular within a 0.1% relative tolerance.
  - Cell edges are derived from the median spacing and centered on the source coordinates.
  - Missing cells are rendered as fully transparent pixels and are never interpolated or replaced with numeric values.
  - The raster is georeferenced over the derived cell-edge extent without resampling or smoothing.
- For the Phase 13E Arabian Sea salinity and horizontal currents:
  - Salinity preserves the source unit `1e-3`; it is not relabeled as PSU.
  - U and V are paired only when their region, grid, timestamp, source depth, and units match.
  - A current vector is available only where both U and V are finite; incomplete pairs remain missing.
  - Horizontal speed is `sqrt(u^2 + v^2)`.
  - Direction is the bearing toward which the current flows, clockwise from true north; direction is unavailable at zero speed.
  - Ocean Probe uses actual source depth levels and nearest model-grid columns without smoothing or interpolation.
- For the Phase 13F Part 1 Cyclone Amphan historical event:
  - Track data comes from NOAA IBTrACS v04r01 SID `2020136N10088`.
  - Only the RSMC New Delhi `NEWDELHI_*` position, wind, pressure, and grade fields are used.
  - Estimates from different agencies are not averaged or merged.
  - Wind remains in source unit `kts`; pressure remains in source unit `mb`.
  - `NEWDELHI_GRADE` codes are exposed as source terminology without reinterpretation.
  - Historical event time remains independent from the active 2026 model time.
  - Historical ocean fields come from the Copernicus Marine GLORYS12V1 daily reanalysis (`GLOBAL_MULTIYEAR_PHY_001_030`, dataset `cmems_mod_glo_phy_my_0.083deg_P1D-m`), not from the 2026 operational forecast files.
  - The historical fields preserve the source Gregorian calendar, daily timestamps, native depth levels, missing-value masks, scale/offset decoding, and source units.
  - Salinity preserves the source unit `1e-3`; it is not relabeled as PSU.
  - Historical U and V may be paired only on identical grid, time, depth, and unit metadata, using a joint finite mask.
  - Temperature, salinity, and current timestamps remain independently selectable even when a future interface maps them to a shared event phase.
  - Before, during, and after windows must be defined explicitly from available source timestamps; the data gate does not define those windows.
  - Use non-causal language such as "before/during/after comparison", "historical ocean-state evolution", and "ocean conditions around the event" unless a separate methodology supports causal attribution.
  - Phase 13F Part 2B defines the analysis windows as before (`2020-05-13` through `2020-05-15`, 3 daily samples), during (`2020-05-16` through `2020-05-21`, 6 daily samples), and after (`2020-05-22` through `2020-05-24`, 3 daily samples). These are analysis windows, not a storm-intensity classification.
  - Scalar phase means are cell-wise finite means. Missing source cells remain missing when no finite sample exists.
  - Current phase means pair U and V with a joint finite mask at every source time and cell, then average each component over the same valid pairs. Speed is derived only after component averaging.
  - Scalar differences use paired finite phase-mean cells only. The display scale is symmetric around zero and the API reports the paired cell count plus minimum, mean, and maximum difference.
  - Track-linked sampling uses the nearest available daily source time with the earlier source time winning an exact tie, followed by the nearest native model-grid column. It does not interpolate in time, horizontal position, or depth.
  - Historical fields and profiles are classified and labeled as GLORYS12V1 model reanalysis, not direct observations and not forecasts.
  - Historical analysis and the current operational model are explicit, isolated contexts. A missing historical mapping must produce an error and must never fall back to a 2026 dataset.
  - Before/during/after differences are descriptive comparisons only; they do not establish cyclone causation.

When a real dataset is selected, document:
- coordinate conventions;
- variable mapping;
- vertical system;
- time system;
- QC policy;
- interpolation policy.
