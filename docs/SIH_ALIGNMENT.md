# SIH26067 Alignment

BLUEVERSE addresses the problem statement through a browser-based 3D/4D scientific workspace backed by real ocean model and in-situ data.

| Problem need | Repository evidence | Current limitation |
|---|---|---|
| Interactive multidimensional ocean visualization | Cesium globe, time/depth controls, scalar fields, currents, probes, transects, subsurface and isosurface views | Uses regional subsets rather than global scalable storage |
| Multiple ocean variables | Temperature, salinity, eastward/northward currents, derived horizontal speed | Variables depend on locally available audited files |
| In-situ observations | Argo profile and Spray glider services and browser layers | One registered glider mission; no buoy/CTD adapter |
| Model-observation comparison | QC-aware Argo collocation with residuals, Bias, RMSE, MAE and pair counts | Nearest-neighbour method; no glider collocation |
| Spatial and temporal exploration | Study-region navigation, operational timeline/depth, isolated historical-event timeline | Three regions are navigation-only |
| Historical event analysis | Cyclone Amphan IBTrACS track and GLORYS12V1 phase analysis | Descriptive association only, no causal attribution |
| Scientific traceability | Dataset registry, source units, provenance, QC metadata, explicit failure states | Raw source files must be distributed separately |

## Submission language

Use “model analysis/forecast,” “model reanalysis,” “in-situ observation,” and “model-observation residual” precisely. Do not describe every layer as real-time, call GLORYS12V1 observed data, label residual severity as a hazard warning, or claim cyclone causation from the before/during/after comparison.
