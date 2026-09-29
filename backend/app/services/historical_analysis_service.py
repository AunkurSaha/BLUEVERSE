from __future__ import annotations

from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

import numpy as np
import xarray as xr

from .dataset_registry import DatasetRegistry, dataset_registry


EVENT_ID = "cyclone-amphan-2020"
PRODUCT_ID = "GLOBAL_MULTIYEAR_PHY_001_030"
COPERNICUS_DATASET_ID = "cmems_mod_glo_phy_my_0.083deg_P1D-m"
MODEL = "GLORYS12V1"
PROVIDER = "Mercator Ocean International"

HISTORICAL_DATASET_IDS = {
    "thetao": "amphan-2020-temperature",
    "so": "amphan-2020-salinity",
    "uo": "amphan-2020-uo",
    "vo": "amphan-2020-vo",
}

ANALYSIS_WINDOWS = {
    "before": {
        "label": "Before window",
        "dates": ("2020-05-13", "2020-05-14", "2020-05-15"),
    },
    "during": {
        "label": "During-event window",
        "dates": (
            "2020-05-16",
            "2020-05-17",
            "2020-05-18",
            "2020-05-19",
            "2020-05-20",
            "2020-05-21",
        ),
    },
    "after": {
        "label": "After window",
        "dates": ("2020-05-22", "2020-05-23", "2020-05-24"),
    },
}

COMPARISONS = {
    "during-before": ("during", "before", "During minus Before"),
    "after-before": ("after", "before", "After minus Before"),
}


def _utc_datetime64(value: str) -> np.datetime64:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return np.datetime64(parsed, "ns")


def nearest_source_time(requested_time: str, source_times: list[str]) -> dict[str, Any]:
    if not source_times:
        raise ValueError("No historical source timestamps are available.")
    requested = _utc_datetime64(requested_time)
    parsed = [_utc_datetime64(value) for value in source_times]
    index = min(
        range(len(parsed)),
        key=lambda item: (abs(int((parsed[item] - requested) / np.timedelta64(1, "ns"))), parsed[item]),
    )
    offset_hours = abs(float((parsed[index] - requested) / np.timedelta64(1, "h")))
    return {
        "requested_event_time": str(requested),
        "matched_model_time": str(parsed[index]),
        "absolute_offset_hours": offset_hours,
        "matching_method": "nearest_available_source_time",
        "time_index": index,
    }


def _finite_statistics(values: np.ndarray) -> dict[str, Any]:
    finite = np.isfinite(values)
    finite_count = int(finite.sum())
    if finite_count == 0:
        raise ValueError("The derived historical field contains no finite values.")
    selected = values[finite]
    return {
        "finite_count": finite_count,
        "total_count": int(values.size),
        "missing_count": int(values.size - finite_count),
        "minimum": float(selected.min()),
        "maximum": float(selected.max()),
        "mean": float(selected.mean()),
    }


def _json_grid(values: np.ndarray) -> list[list[float | None]]:
    return [
        [float(value) if np.isfinite(value) else None for value in row]
        for row in values
    ]


def _slice_payload(
    variable: xr.DataArray,
    values: np.ndarray,
    actual_time: str,
    actual_depth: float,
    *,
    units: str | None = None,
    long_name: str | None = None,
) -> dict[str, Any]:
    stats = _finite_statistics(values)
    latitude = variable["latitude"]
    longitude = variable["longitude"]
    return {
        "slice_data": _json_grid(values),
        "dimension_order": ["latitude", "longitude"],
        "time_coord_name": "time",
        "depth_coord_name": "depth",
        "lat_coord_name": "latitude",
        "lon_coord_name": "longitude",
        "actual_time": actual_time,
        "actual_depth": actual_depth,
        "lat_vals": [float(value) for value in latitude.values],
        "lon_vals": [float(value) for value in longitude.values],
        "var_standard_name": variable.attrs.get("standard_name", "N/A"),
        "var_long_name": long_name or variable.attrs.get("long_name", "N/A"),
        "var_units": units or variable.attrs.get("units", "N/A"),
        "depth_units": variable["depth"].attrs.get("units", "m"),
        "lat_units": latitude.attrs.get("units", "degrees_north"),
        "lon_units": longitude.attrs.get("units", "degrees_east"),
        "finite_count": stats["finite_count"],
        "total_count": stats["total_count"],
        "missing_count": stats["missing_count"],
        "tmin": stats["minimum"],
        "tmax": stats["maximum"],
        "tmean": stats["mean"],
        "var_name": variable.name,
    }


def _window_indices(time_values: np.ndarray, phase: str) -> list[int]:
    dates = {value for value in ANALYSIS_WINDOWS[phase]["dates"]}
    indices = [
        index
        for index, value in enumerate(time_values.astype("datetime64[D]"))
        if str(value) in dates
    ]
    if len(indices) != len(dates):
        raise ValueError(f"Historical source timestamps do not fully cover the {phase} analysis window.")
    return indices


def _assert_same_coordinates(first: xr.Dataset, second: xr.Dataset) -> None:
    for name in ("longitude", "latitude", "depth", "time"):
        if not np.array_equal(first[name].values, second[name].values):
            raise ValueError(f"Historical current coordinate '{name}' is incompatible.")


class HistoricalAnalysisService:
    def __init__(self, registry: DatasetRegistry = dataset_registry):
        self._registry = registry

    def configuration(self, event_id: str) -> dict[str, Any]:
        self._require_event(event_id)
        return {
            "event_id": event_id,
            "product_id": PRODUCT_ID,
            "dataset_id": COPERNICUS_DATASET_ID,
            "model": MODEL,
            "provider": PROVIDER,
            "classification": "Reanalysis",
            "historical_time_window": "13-24 May 2020",
            "dataset_ids": HISTORICAL_DATASET_IDS,
            "analysis_windows": [
                {
                    "id": phase,
                    "label": definition["label"],
                    "dates": list(definition["dates"]),
                    "sample_count": len(definition["dates"]),
                }
                for phase, definition in ANALYSIS_WINDOWS.items()
            ],
        }

    def _require_event(self, event_id: str) -> None:
        if event_id != EVENT_ID:
            raise ValueError(f"Historical ocean analysis is not registered for event '{event_id}'.")

    def _entry(self, event_id: str, variable: str) -> dict[str, Any]:
        self._require_event(event_id)
        dataset_id = HISTORICAL_DATASET_IDS.get(variable)
        if dataset_id is None:
            raise ValueError(f"Historical variable '{variable}' is not supported.")
        entry = self._registry.get(dataset_id)
        if not entry or entry.get("dataset_kind") != "historical_model_grid" or entry.get("event_id") != event_id:
            raise ValueError(f"Validated historical dataset '{dataset_id}' is unavailable.")
        return entry

    @lru_cache(maxsize=96)
    def phase_mean(self, event_id: str, variable: str, phase: str, depth_index: int) -> dict[str, Any]:
        if phase not in ANALYSIS_WINDOWS:
            raise ValueError(f"Unknown historical analysis phase '{phase}'.")
        if variable == "currents":
            return self._current_phase_mean(event_id, phase, depth_index)
        if variable not in {"thetao", "so"}:
            raise ValueError(f"Historical variable '{variable}' is not supported; no operational fallback is allowed.")

        entry = self._entry(event_id, variable)
        with xr.open_dataset(entry["file_path"]) as dataset:
            data = dataset[variable]
            self._validate_depth(data, depth_index)
            indices = _window_indices(dataset["time"].values, phase)
            selected = data.isel(time=indices, depth=depth_index)
            values = selected.mean(dim="time", skipna=True).values
            actual_depth = float(dataset["depth"].isel(depth=depth_index).item())
            payload = _slice_payload(
                data,
                values,
                f"{ANALYSIS_WINDOWS[phase]['dates'][0]}/{ANALYSIS_WINDOWS[phase]['dates'][-1]}",
                actual_depth,
                long_name=f"{data.attrs.get('long_name', variable)} {ANALYSIS_WINDOWS[phase]['label']} mean",
            )

        scale = self._shared_phase_scale(event_id, variable, depth_index)
        return {
            "analysis_mode": "phase_mean",
            "phase": phase,
            "label": ANALYSIS_WINDOWS[phase]["label"],
            "dates": list(ANALYSIS_WINDOWS[phase]["dates"]),
            "sample_count": len(ANALYSIS_WINDOWS[phase]["dates"]),
            "color_scale": scale,
            "slice": payload,
        }

    @lru_cache(maxsize=64)
    def difference(self, event_id: str, variable: str, comparison: str, depth_index: int) -> dict[str, Any]:
        if variable not in {"thetao", "so"}:
            raise ValueError("Historical differences support thetao or so only.")
        if comparison not in COMPARISONS:
            raise ValueError(f"Unknown historical comparison '{comparison}'.")
        phase_b, phase_a, label = COMPARISONS[comparison]
        entry = self._entry(event_id, variable)
        with xr.open_dataset(entry["file_path"]) as dataset:
            data = dataset[variable]
            self._validate_depth(data, depth_index)
            first = data.isel(time=_window_indices(dataset["time"].values, phase_a), depth=depth_index).mean(dim="time", skipna=True)
            second = data.isel(time=_window_indices(dataset["time"].values, phase_b), depth=depth_index).mean(dim="time", skipna=True)
            first_values = first.values
            second_values = second.values
            paired = np.isfinite(first_values) & np.isfinite(second_values)
            difference = np.where(paired, second_values - first_values, np.nan)
            actual_depth = float(dataset["depth"].isel(depth=depth_index).item())
            source_units = data.attrs.get("units", "N/A")
            display_units = "degrees_C difference" if source_units == "degrees_C" else f"{source_units} difference"
            payload = _slice_payload(
                data,
                difference,
                label,
                actual_depth,
                units=display_units,
                long_name=f"Historical Ocean Difference: {label}",
            )
        stats = _finite_statistics(difference)
        maximum_absolute = max(abs(stats["minimum"]), abs(stats["maximum"]))
        return {
            "analysis_mode": "difference",
            "comparison": comparison,
            "label": label,
            "minuend_phase": phase_b,
            "subtrahend_phase": phase_a,
            "finite_paired_cell_count": stats["finite_count"],
            "mean_difference": stats["mean"],
            "minimum_difference": stats["minimum"],
            "maximum_difference": stats["maximum"],
            "color_scale": {"min": -maximum_absolute, "max": maximum_absolute},
            "slice": payload,
        }

    @lru_cache(maxsize=64)
    def probe(self, event_id: str, requested_event_time: str, latitude: float, longitude: float) -> dict[str, Any]:
        entries = {variable: self._entry(event_id, variable) for variable in HISTORICAL_DATASET_IDS}
        with (
            xr.open_dataset(entries["thetao"]["file_path"]) as temperature,
            xr.open_dataset(entries["so"]["file_path"]) as salinity,
            xr.open_dataset(entries["uo"]["file_path"]) as u_dataset,
            xr.open_dataset(entries["vo"]["file_path"]) as v_dataset,
        ):
            _assert_same_coordinates(temperature, salinity)
            _assert_same_coordinates(u_dataset, v_dataset)
            _assert_same_coordinates(temperature, u_dataset)
            match = nearest_source_time(requested_event_time, [str(value) for value in temperature["time"].values])
            latitude_values = temperature["latitude"].values
            longitude_values = temperature["longitude"].values
            if not (float(latitude_values.min()) <= latitude <= float(latitude_values.max()) and float(longitude_values.min()) <= longitude <= float(longitude_values.max())):
                raise ValueError("Requested historical probe position is outside the Amphan ocean domain.")
            latitude_index = int(np.abs(latitude_values - latitude).argmin())
            longitude_index = int(np.abs(longitude_values - longitude).argmin())
            selector = {"time": match["time_index"], "latitude": latitude_index, "longitude": longitude_index}
            temperature_values = temperature["thetao"].isel(**selector).values
            salinity_values = salinity["so"].isel(**selector).values
            u_values = u_dataset["uo"].isel(**selector).values
            v_values = v_dataset["vo"].isel(**selector).values
            joint = np.isfinite(u_values) & np.isfinite(v_values)
            speed = np.where(joint, np.hypot(u_values, v_values), np.nan)
            direction = np.full(speed.shape, np.nan, dtype=float)
            moving = joint & (speed != 0)
            direction[moving] = (np.degrees(np.arctan2(u_values[moving], v_values[moving])) + 360.0) % 360.0
            depths = [float(value) for value in temperature["depth"].values]

            def scalar_profile(values: np.ndarray, units: str) -> dict[str, Any]:
                return {
                    "units": units,
                    "levels": [
                        {"depth": depth, "value": float(value) if np.isfinite(value) else None}
                        for depth, value in zip(depths, values, strict=True)
                    ],
                }

            current_levels = [
                {
                    "depth": depth,
                    "u": float(u) if np.isfinite(u) else None,
                    "v": float(v) if np.isfinite(v) else None,
                    "speed": float(item_speed) if np.isfinite(item_speed) else None,
                    "direction_toward_degrees": float(item_direction) if np.isfinite(item_direction) else None,
                }
                for depth, u, v, item_speed, item_direction in zip(depths, u_values, v_values, speed, direction, strict=True)
            ]

        return {
            **{key: value for key, value in match.items() if key != "time_index"},
            "track_position": {"latitude": latitude, "longitude": longitude},
            "matched_model_grid_position": {
                "latitude": float(latitude_values[latitude_index]),
                "longitude": float(longitude_values[longitude_index]),
                "latitude_index": latitude_index,
                "longitude_index": longitude_index,
            },
            "depth_units": "m",
            "temperature": scalar_profile(temperature_values, temperature["thetao"].attrs.get("units", "N/A")),
            "salinity": scalar_profile(salinity_values, salinity["so"].attrs.get("units", "N/A")),
            "currents": {"units": u_dataset["uo"].attrs.get("units", "N/A"), "levels": current_levels},
            "source": f"{MODEL} Reanalysis",
            "product_id": PRODUCT_ID,
            "dataset_id": COPERNICUS_DATASET_ID,
            "sampling_method": "nearest_model_grid_point",
            "value_classification": "model_reanalysis",
        }

    @staticmethod
    def _validate_depth(variable: xr.DataArray, depth_index: int) -> None:
        depth_count = variable.sizes.get("depth", 0)
        if depth_index < 0 or depth_index >= depth_count:
            raise ValueError(f"Depth index {depth_index} is out of range for {depth_count} source levels.")

    def _current_phase_mean(self, event_id: str, phase: str, depth_index: int) -> dict[str, Any]:
        u_entry = self._entry(event_id, "uo")
        v_entry = self._entry(event_id, "vo")
        with xr.open_dataset(u_entry["file_path"]) as u_dataset, xr.open_dataset(v_entry["file_path"]) as v_dataset:
            _assert_same_coordinates(u_dataset, v_dataset)
            self._validate_depth(u_dataset["uo"], depth_index)
            indices = _window_indices(u_dataset["time"].values, phase)
            u_selected = u_dataset["uo"].isel(time=indices, depth=depth_index)
            v_selected = v_dataset["vo"].isel(time=indices, depth=depth_index)
            joint = np.isfinite(u_selected.values) & np.isfinite(v_selected.values)
            u_values = np.where(joint, u_selected.values, 0.0)
            v_values = np.where(joint, v_selected.values, 0.0)
            joint_count = joint.sum(axis=0)
            mean_u = np.divide(
                u_values.sum(axis=0),
                joint_count,
                out=np.full(joint_count.shape, np.nan, dtype=float),
                where=joint_count > 0,
            )
            mean_v = np.divide(
                v_values.sum(axis=0),
                joint_count,
                out=np.full(joint_count.shape, np.nan, dtype=float),
                where=joint_count > 0,
            )
            actual_depth = float(u_dataset["depth"].isel(depth=depth_index).item())
            actual_time = f"{ANALYSIS_WINDOWS[phase]['dates'][0]}/{ANALYSIS_WINDOWS[phase]['dates'][-1]}"
            u_payload = _slice_payload(u_dataset["uo"], mean_u, actual_time, actual_depth, long_name=f"Mean eastward velocity, {ANALYSIS_WINDOWS[phase]['label']}")
            v_payload = _slice_payload(v_dataset["vo"], mean_v, actual_time, actual_depth, long_name=f"Mean northward velocity, {ANALYSIS_WINDOWS[phase]['label']}")
        return {
            "analysis_mode": "phase_mean",
            "phase": phase,
            "label": ANALYSIS_WINDOWS[phase]["label"],
            "dates": list(ANALYSIS_WINDOWS[phase]["dates"]),
            "sample_count": len(ANALYSIS_WINDOWS[phase]["dates"]),
            "joint_finite_pairing": True,
            "vector_mean_method": "mean_u_and_mean_v_from_joint_finite_pairs",
            "uo": u_payload,
            "vo": v_payload,
        }

    @lru_cache(maxsize=64)
    def _shared_phase_scale(self, event_id: str, variable: str, depth_index: int) -> dict[str, float]:
        entry = self._entry(event_id, variable)
        minima: list[float] = []
        maxima: list[float] = []
        with xr.open_dataset(entry["file_path"]) as dataset:
            data = dataset[variable]
            self._validate_depth(data, depth_index)
            for phase in ANALYSIS_WINDOWS:
                values = data.isel(time=_window_indices(dataset["time"].values, phase), depth=depth_index).mean(dim="time", skipna=True).values
                finite = values[np.isfinite(values)]
                if finite.size:
                    minima.append(float(finite.min()))
                    maxima.append(float(finite.max()))
        if not minima:
            raise ValueError("No finite historical phase values are available for a shared scale.")
        return {"min": min(minima), "max": max(maxima)}


historical_analysis_service = HistoricalAnalysisService()
