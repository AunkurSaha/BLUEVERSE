from __future__ import annotations

from hashlib import sha256
from pathlib import Path
from typing import Any

import numpy as np
import xarray as xr


PRODUCT_ID = "GLOBAL_MULTIYEAR_PHY_001_030"
COPERNICUS_DATASET_ID = "cmems_mod_glo_phy_my_0.083deg_P1D-m"
PROVIDER = "Mercator Ocean International"
MODEL_SOURCE = "MERCATOR GLORYS12V1"
EVENT_ID = "cyclone-amphan-2020"
REGION_ID = "bay-of-bengal"

EVENT_START = np.datetime64("2020-05-16T00:00:00")
EVENT_END = np.datetime64("2020-05-21T12:00:00")


def _scalar(value: Any) -> Any:
    return value.item() if isinstance(value, np.generic) else value


def inspect_historical_dataset(path: str | Path, variable_name: str) -> dict[str, Any]:
    file_path = Path(path).resolve()
    with xr.open_dataset(file_path, decode_cf=False) as raw, xr.open_dataset(file_path) as decoded:
        if variable_name not in decoded.data_vars:
            raise ValueError(f"Variable '{variable_name}' is missing from {file_path}")
        for coordinate in ("longitude", "latitude", "depth", "time"):
            if coordinate not in decoded.coords:
                raise ValueError(f"Coordinate '{coordinate}' is missing from {file_path}")

        variable = decoded[variable_name]
        raw_variable = raw[variable_name]
        values = variable.values
        finite = np.isfinite(values)
        if not finite.any():
            raise ValueError(f"Variable '{variable_name}' contains no finite data")
        depth_axis = variable.dims.index("depth")
        reduction_axes = tuple(index for index in range(values.ndim) if index != depth_axis)
        finite_by_depth = finite.any(axis=reduction_axes)

        time_values = decoded["time"].values.astype("datetime64[ns]")
        dates = {str(value.astype("datetime64[D]")) for value in time_values}
        raw_time = raw["time"]
        depth = decoded["depth"]
        latitude = decoded["latitude"]
        longitude = decoded["longitude"]
        finite_values = values[finite]

        return {
            "path": str(file_path),
            "bytes": file_path.stat().st_size,
            "sha256": sha256(file_path.read_bytes()).hexdigest(),
            "dimensions": {name: int(size) for name, size in decoded.sizes.items()},
            "variable": variable_name,
            "dtype": str(variable.dtype),
            "source_dtype": str(raw_variable.dtype),
            "longitude": {
                "count": int(longitude.size),
                "minimum": float(longitude.min().item()),
                "maximum": float(longitude.max().item()),
                "units": longitude.attrs.get("units"),
            },
            "latitude": {
                "count": int(latitude.size),
                "minimum": float(latitude.min().item()),
                "maximum": float(latitude.max().item()),
                "units": latitude.attrs.get("units"),
            },
            "depth": {
                "count": int(depth.size),
                "minimum": float(depth.min().item()),
                "maximum": float(depth.max().item()),
                "positive": depth.attrs.get("positive"),
                "units": depth.attrs.get("units"),
                "values": [float(value) for value in depth.values],
            },
            "time": {
                "count": int(time_values.size),
                "first": str(time_values.min()),
                "last": str(time_values.max()),
                "calendar": raw_time.attrs.get("calendar", raw_time.encoding.get("calendar")),
                "units": raw_time.attrs.get("units", raw_time.encoding.get("units")),
                "values": [str(value) for value in time_values],
            },
            "variable_metadata": {
                "units": variable.attrs.get("units"),
                "standard_name": variable.attrs.get("standard_name"),
                "long_name": variable.attrs.get("long_name"),
                "_FillValue": _scalar(raw_variable.attrs.get("_FillValue")),
                "missing_value": _scalar(raw_variable.attrs.get("missing_value")),
                "scale_factor": _scalar(raw_variable.attrs.get("scale_factor")),
                "add_offset": _scalar(raw_variable.attrs.get("add_offset")),
            },
            "finite_count": int(finite.sum()),
            "finite_minimum": float(finite_values.min()),
            "finite_maximum": float(finite_values.max()),
            "selectable_depth_indices": np.flatnonzero(finite_by_depth).astype(int).tolist(),
            "deepest_selectable_depth": float(depth.values[np.flatnonzero(finite_by_depth)[-1]]),
            "coverage": {
                "contains_pre_event": bool((time_values < EVENT_START).any()),
                "contains_event_period": bool(((time_values >= EVENT_START) & (time_values <= EVENT_END)).any()),
                "contains_post_event": bool((time_values > EVENT_END).any()),
                "event_dates_present": all(f"2020-05-{day:02d}" in dates for day in range(16, 22)),
                "contains_2026": any(str(value).startswith("2026-") for value in time_values),
                "all_may_2020": all(str(value).startswith("2020-05-") for value in time_values),
            },
            "global_metadata": {
                "source": decoded.attrs.get("source"),
                "institution": decoded.attrs.get("institution"),
                "Conventions": decoded.attrs.get("Conventions"),
                "copernicusmarine_version": decoded.attrs.get("copernicusmarine_version"),
            },
        }


def compare_historical_datasets(first: dict[str, Any], second: dict[str, Any]) -> dict[str, bool]:
    return {
        "grid_identical": first["longitude"] == second["longitude"] and first["latitude"] == second["latitude"],
        "depth_identical": first["depth"] == second["depth"],
        "time_identical": first["time"] == second["time"],
        "units_compatible": first["variable_metadata"]["units"] == second["variable_metadata"]["units"],
    }


def historical_data_gate_passes(inspections: dict[str, dict[str, Any]]) -> bool:
    expected_units = {
        "thetao": "degrees_C",
        "so": "1e-3",
        "uo": "m s-1",
        "vo": "m s-1",
    }
    if set(inspections) != set(expected_units):
        return False
    for variable, item in inspections.items():
        coverage = item["coverage"]
        if item["variable"] != variable or item["variable_metadata"]["units"] != expected_units[variable]:
            return False
        if not (
            coverage["all_may_2020"]
            and not coverage["contains_2026"]
            and coverage["contains_pre_event"]
            and coverage["contains_event_period"]
            and coverage["contains_post_event"]
            and coverage["event_dates_present"]
        ):
            return False
        if item["finite_count"] <= 0 or not item["selectable_depth_indices"]:
            return False
    uv = compare_historical_datasets(inspections["uo"], inspections["vo"])
    return all(uv.values())
