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

Do not compute metrics over:
- incompatible units;
- rejected QC values;
- missing values;
- invalid/out-of-domain matches.

Report valid sample count with metrics.

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
- For the Phase 5 temperature raster:
  - `lat_vals` and `lon_vals` are treated as grid-cell centers.
  - A regular raster is accepted only when coordinate spacing is monotonic and regular within a 0.1% relative tolerance.
  - Cell edges are derived from the median spacing and centered on the source coordinates.
  - Missing cells are rendered as fully transparent pixels and are never interpolated or replaced with numeric values.
  - The raster is georeferenced over the derived cell-edge extent without resampling or smoothing.

When a real dataset is selected, document:
- coordinate conventions;
- variable mapping;
- vertical system;
- time system;
- QC policy;
- interpolation policy.
