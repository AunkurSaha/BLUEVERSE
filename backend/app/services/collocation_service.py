import xarray as xr
import numpy as np
import os
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import math

from .argo_service import ArgoService
import gsw

# Constants
EARTH_RADIUS_KM = 6371.0
ACCEPTED_QC = {1, 2}
SPATIAL_TOLERANCE_KM = 100.0
TEMPORAL_TOLERANCE_HOURS = 12.0
# VERTICAL_TOLERANCE_M is kept for backward compatibility with tests; actual tolerance is computed per model level
VERTICAL_TOLERANCE_M = 0


class CollocationService:
    def __init__(self, model_file_path: str = "data/raw/bay_of_bengal_temperature_argo_window.nc",
                 argo_data_dir: str = "data/raw/argo"):
        """
        Initialize the collocation service.

        Args:
            model_file_path: Path to the model NetCDF file (relative to project root)
            argo_data_dir: Path to the ARGO data directory (relative to project root)
        """
        # Construct absolute paths
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        self.model_file_path = os.path.join(base_dir, model_file_path)
        self.argo_service = ArgoService(argo_data_dir=argo_data_dir)

        # Load model dataset
        self._load_model_dataset()

    def _load_model_dataset(self):
        """Load the model dataset and verify thetao standard_name."""
        try:
            self.model_ds = xr.open_dataset(self.model_file_path, engine="netcdf4")
        except Exception as e:
            raise RuntimeError(f"Failed to load model dataset from {self.model_file_path}: {e}")

        # Verify thetao variable exists and has correct standard_name
        if 'thetao' not in self.model_ds.variables:
            raise ValueError("Model dataset must contain 'thetao' variable")

        thetao = self.model_ds['thetao']
        if 'standard_name' in thetao.attrs and thetao.attrs['standard_name'] != 'sea_water_potential_temperature':
            raise ValueError(f"thetao standard_name must be 'sea_water_potential_temperature', got {thetao.attrs.get('standard_name')}")
        # If standard_name attribute is missing, we assume it's correct based on the variable name

        # Extract coordinates
        self.model_time = self.model_ds['time'].values  # datetime64 array
        # Get model depth levels (positive downward convention)
        depth_var = self.model_ds['lev'] if 'lev' in self.model_ds.dims else self.model_ds['depth']
        self.model_depth = np.abs(depth_var.values)  # Ensure positive downward
        self.model_latitude = self.model_ds['latitude'].values  # degrees north
        self.model_longitude = self.model_ds['longitude'].values  # degrees east

    def haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate the great-circle distance between two points on Earth.

        Args:
            lat1, lon1: Latitude and longitude of point 1 in decimal degrees
            lat2, lon2: Latitude and longitude of point 2 in decimal degrees

        Returns:
            Distance in kilometers
        """
        # Convert decimal degrees to radians
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)

        # Haversine formula
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
        c = 2 * math.asin(math.sqrt(a))
        return EARTH_RADIUS_KM * c

    def find_nearest_model_time(self, target_time: datetime) -> Tuple[int, float]:
        """
        Find the nearest model time index to the target time.

        Args:
            target_time: Target datetime

        Returns:
            Tuple of (model_time_index, time_difference_hours)
        """
        # Convert target_time to numpy datetime64 for subtraction
        target_time_np = np.datetime64(target_time)
        # Ensure model_time is in datetime64[ns] for consistency
        model_times_ns = self.model_time.astype('datetime64[ns]')
        # Compute differences in hours
        diffs = model_times_ns - target_time_np  # this gives timedelta64[ns]
        # Convert to hours
        diffs_h = diffs / np.timedelta64(1, 'h')
        absolute_diffs_h = np.abs(diffs_h)
        # Find index of minimum difference
        min_idx = int(np.argmin(absolute_diffs_h))
        time_diff_hours = float(absolute_diffs_h[min_idx])
        return min_idx, time_diff_hours

    def find_nearest_model_grid_point(self, target_lat: float, target_lon: float) -> Tuple[float, float, float, int, int]:
        """
        Find the nearest model grid point to the target latitude and longitude.

        Args:
            target_lat: Target latitude in degrees
            target_lon: Target longitude in degrees

        Returns:
            Tuple of (nearest_lat, nearest_lon, distance_km, lat_index, lon_index)
        """
        # Compute distances to all grid points
        min_distance = float('inf')
        min_lat_idx = 0
        min_lon_idx = 0
        nearest_lat = self.model_latitude[0]
        nearest_lon = self.model_longitude[0]

        for i, lat in enumerate(self.model_latitude):
            for j, lon in enumerate(self.model_longitude):
                dist = self.haversine_distance(target_lat, target_lon, lat, lon)
                if dist < min_distance:
                    min_distance = dist
                    min_lat_idx = i
                    min_lon_idx = j
                    nearest_lat = lat
                    nearest_lon = lon

        return nearest_lat, nearest_lon, min_distance, min_lat_idx, min_lon_idx

    def _vertical_matching(self, model_depths, argo_depths, model_lat_idx, model_lon_idx, model_time_idx, model_ds):
        """
        Perform model-level-centric vertical matching
        Each model depth may contribute AT MOST ONCE
        (Copy of phase8c_collocation.py vertical_matching function, without prints)
        """
        # Convert to arrays if needed
        model_depths = np.array(model_depths)
        argo_depths = np.array(argo_depths)

        # Find model depths that are within ARGO observation coverage
        argo_min_depth = np.min(argo_depths)
        argo_max_depth = np.max(argo_depths)

        # Model depths within ARGO coverage (remember: depth is positive downward)
        # So we want model depths that are between argo_min_depth and argo_max_depth
        coverage_mask = (model_depths >= argo_min_depth) & (model_depths <= argo_max_depth)
        model_depths_in_coverage = model_depths[coverage_mask]
        model_depth_indices_in_coverage = np.where(coverage_mask)[0]

        if len(model_depths_in_coverage) == 0:
            return [], [], []

        # For each model depth, find nearest valid ARGO observation depth
        matched_model_indices = []
        matched_argo_indices = []
        vertical_separations = []

        # Keep track of which ARGO points have been used
        argo_used = np.zeros(len(argo_depths), dtype=bool)

        for i, model_depth_idx in enumerate(model_depth_indices_in_coverage):
            model_depth = model_depths[model_depth_idx]

            # Find nearest ARGO observation depth that hasn't been used yet
            # Calculate distances to all unused ARGO points
            distances = np.abs(argo_depths - model_depth)
            # Mask used points
            distances[argo_used] = np.inf

            if np.all(np.isinf(distances)):
                # No unused ARGO points left
                break

            nearest_argo_idx = np.argmin(distances)
            nearest_distance = distances[nearest_argo_idx]

            # Calculate vertical tolerance
            # Find adjacent model levels
            level_position = np.where(model_depth_indices_in_coverage == model_depth_idx)[0]
            if len(level_position) > 0:
                level_pos = level_position[0]

                if level_pos == 0:
                    # Top level - only deeper adjacent
                    if len(model_depths_in_coverage) > 1:
                        deeper_adjacent = model_depths_in_coverage[level_pos + 1]
                        tolerance = 0.5 * (deeper_adjacent - model_depth)
                    else:
                        # Only one level in coverage
                        tolerance = np.inf  # Accept any match
                elif level_pos == len(model_depths_in_coverage) - 1:
                    # Bottom level - only shallower adjacent
                    shallower_adjacent = model_depths_in_coverage[level_pos - 1]
                    tolerance = 0.5 * (model_depth - shallower_adjacent)
                else:
                    # Interior level - both adjacent
                    shallower_adjacent = model_depths_in_coverage[level_pos - 1]
                    deeper_adjacent = model_depths_in_coverage[level_pos + 1]
                    tolerance = 0.5 * min(
                        model_depth - shallower_adjacent,
                        deeper_adjacent - model_depth
                    )
            else:
                # Fallback: use global minimum spacing
                if len(model_depths) > 1:
                    depth_diffs = np.diff(model_depths)
                    min_spacing = np.min(depth_diffs[depth_diffs > 0]) if np.any(depth_diffs > 0) else np.inf
                    tolerance = 0.5 * min_spacing
                else:
                    tolerance = np.inf

            # Accept if within tolerance
            if nearest_distance <= tolerance:
                matched_model_indices.append(model_depth_idx)
                matched_argo_indices.append(nearest_argo_idx)
                vertical_separations.append(nearest_distance)
                # Mark ARGO point as used
                argo_used[nearest_argo_idx] = True

        return matched_model_indices, matched_argo_indices, vertical_separations

    def get_argo_profile(self, profile_id: str) -> Optional[Dict[str, Any]]:
        """
        Get ARGO profile by ID using the ArgoService.

        Args:
            profile_id: Profile ID in format "platform_number-cycle_number"

        Returns:
            ARGO profile data (summary and levels) or None if not found
        """
        return self.argo_service.get_argo_profile(profile_id)

    def collocate_profile(self, profile_id: str) -> Dict[str, Any]:
        """
        Perform collocation of an ARGO profile with the model.

        Args:
            profile_id: ARGO profile ID

        Returns:
            Dictionary containing collocation results
        """
        # Get ARGO profile
        argo_profile = self.get_argo_profile(profile_id)
        if argo_profile is None:
            return {
                "profile_id": profile_id,
                "status": "not_found",
                "error": f"ARGO profile {profile_id} not found"
            }

        summary = argo_profile["summary"]
        levels = argo_profile["levels"]

        # Extract ARGO profile metadata
        argo_time_str = summary["observation_time"]
        if argo_time_str is None:
            return {
                "profile_id": profile_id,
                "status": "error",
                "error": "ARGO profile missing observation time"
            }
        # Parse ARGO time (string in ISO format)
        try:
            argo_time = datetime.fromisoformat(argo_time_str.replace('Z', '+00:00'))
        except Exception:
            # Try alternative format
            try:
                argo_time = datetime.strptime(argo_time_str, "%Y-%m-%dT%H:%M:%S")
            except Exception:
                return {
                    "profile_id": profile_id,
                    "status": "error",
                    "error": f"Unable to parse ARGO observation time: {argo_time_str}"
                }

        argo_lat = summary["latitude"]
        argo_lon = summary["longitude"]
        if argo_lat is None or argo_lon is None:
            return {
                "profile_id": profile_id,
                "status": "error",
                "error": "ARGO profile missing latitude or longitude"
            }

        # Find nearest model time
        model_time_idx, time_diff_hours = self.find_nearest_model_time(argo_time)
        nearest_model_time = self.model_time[model_time_idx].astype('datetime64[s]').astype(datetime)
        # Check temporal tolerance
        if time_diff_hours > TEMPORAL_TOLERANCE_HOURS:
            return {
                "profile_id": profile_id,
                "status": "outside_time_tolerance",
                "observation_time": argo_time_str,
                "model_time": nearest_model_time.isoformat(),
                "time_difference_hours": time_diff_hours,
                "observation_latitude": argo_lat,
                "observation_longitude": argo_lon,
                "model_latitude": None,
                "model_longitude": None,
                "spatial_distance_km": None,
                "matched_pair_count": 0,
                "bias_c": None,
                "rmse_c": None,
                "mae_c": None,
                "residual_min_c": None,
                "residual_max_c": None,
                "pairs": [],
                "method": "model-level-centric vertical matching",
                "provenance": {
                    "provider": "Argo GDAC / IFREMER",
                    "source_format": "NetCDF",
                    "standard": "Argo profile format",
                    "model_source": "BOB temperature argo window"
                }
            }

        # Find nearest model grid point
        nearest_model_lat, nearest_model_lon, spatial_distance_km, model_lat_idx, model_lon_idx = \
            self.find_nearest_model_grid_point(argo_lat, argo_lon)
        # Check spatial tolerance
        if spatial_distance_km > SPATIAL_TOLERANCE_KM:
            return {
                "profile_id": profile_id,
                "status": "outside_spatial_tolerance",
                "observation_time": argo_time_str,
                "model_time": nearest_model_time.isoformat(),
                "time_difference_hours": time_diff_hours,
                "observation_latitude": argo_lat,
                "observation_longitude": argo_lon,
                "model_latitude": nearest_model_lat,
                "model_longitude": nearest_model_lon,
                "spatial_distance_km": spatial_distance_km,
                "matched_pair_count": 0,
                "bias_c": None,
                "rmse_c": None,
                "mae_c": None,
                "residual_min_c": None,
                "residual_max_c": None,
                "pairs": [],
                "method": "model-level-centric vertical matching",
                "provenance": {
                    "provider": "Argo GDAC / IFREMER",
                    "source_format": "NetCDF",
                    "standard": "Argo profile format",
                    "model_source": "BOB temperature argo window"
                }
            }

        # Extract model data at the nearest grid point and nearest time
        # We already have the index of the nearest model time from the tolerance checks
        # (model_time_idx is the index of the nearest model time)

        # Extract thetao at the nearest grid point and time
        # Shape: (time, depth, latitude, longitude)
        thetao_slice = self.model_ds['thetao'][model_time_idx, :, model_lat_idx, model_lon_idx]
        model_thetao_vals = thetao_slice.values  # 1D array of depth
        model_depth_vals = self.model_depth  # 1D array of depth

        # Filter ARGO levels to only those with finite pressure (for vertical matching)
        usable_argo_levels = []
        for level in levels:
            # Only require pressure_dbar to be present and finite for vertical matching
            if level["pressure_dbar"] is None or not np.isfinite(level["pressure_dbar"]):
                continue
            usable_argo_levels.append(level)

        if not usable_argo_levels:
            return {
                "profile_id": profile_id,
                "status": "no_valid_pairs",
                "observation_time": argo_time_str,
                "model_time": nearest_model_time.isoformat(),
                "time_difference_hours": time_diff_hours,
                "observation_latitude": argo_lat,
                "observation_longitude": argo_lon,
                "model_latitude": nearest_model_lat,
                "model_longitude": nearest_model_lon,
                "spatial_distance_km": spatial_distance_km,
                "matched_pair_count": 0,
                "bias_c": None,
                "rmse_c": None,
                "mae_c": None,
                "residual_min_c": None,
                "residual_max_c": None,
                "pairs": [],
                "method": "model-level-centric vertical matching",
                "provenance": {
                    "provider": "Argo GDAC / IFREMER",
                    "source_format": "NetCDF",
                    "standard": "Argo profile format",
                    "model_source": "BOB temperature argo window"
                }
            }

        # Keep ARGO levels in original order (after filtering for usable levels)
        argo_depths = [level["depth_m"] for level in usable_argo_levels]  # depth_m is positive downward
        argo_pressures = [level["pressure_dbar"] for level in usable_argo_levels]
        # For potential temperature, we use the value from the level (which may be None or NaN if temp/sal missing)
        # Convert None to np.nan for consistency in NaN checking later
        argo_potential_temps = []
        for level in usable_argo_levels:
            val = level["potential_temperature_c"]
            if val is None:
                argo_potential_temps.append(np.nan)
            else:
                argo_potential_temps.append(val)

        # Perform model-level-centric vertical matching (using model depths in original order)
        matched_model_indices, matched_argo_indices, vertical_separations = self._vertical_matching(
            model_depth_vals, argo_depths, model_lat_idx, model_lon_idx, model_time_idx, self.model_ds
        )

        # If no pairs were formed, return no_vertical_overlap
        if not matched_model_indices:
            return {
                "profile_id": profile_id,
                "status": "no_vertical_overlap",
                "observation_time": argo_time_str,
                "model_time": nearest_model_time.isoformat(),
                "time_difference_hours": time_diff_hours,
                "observation_latitude": argo_lat,
                "observation_longitude": argo_lon,
                "model_latitude": nearest_model_lat,
                "model_longitude": nearest_model_lon,
                "spatial_distance_km": spatial_distance_km,
                "matched_pair_count": 0,
                "bias_c": None,
                "rmse_c": None,
                "mae_c": None,
                "residual_min_c": None,
                "residual_max_c": None,
                "pairs": [],
                "method": "model-level-centric vertical matching",
                "provenance": {
                    "provider": "Argo GDAC / IFREMER",
                    "source_format": "NetCDF",
                    "standard": "Argo profile format",
                    "model_source": "BOB temperature argo window"
                }
            }

        # Extract model thetao values for matched model indices
        model_thetao_values = [model_thetao_vals[i] for i in matched_model_indices]
        # Get corresponding ARGO potential temperature values
        argo_pt0_values = [argo_potential_temps[i] for i in matched_argo_indices]

        # Identify valid pairs where both model and observation values are not NaN
        valid_pairs_mask = ~(np.isnan(model_thetao_values) | np.isnan(argo_pt0_values))

        if not np.any(valid_pairs_mask):
            return {
                "profile_id": profile_id,
                "status": "no_valid_pairs",
                "observation_time": argo_time_str,
                "model_time": nearest_model_time.isoformat(),
                "time_difference_hours": time_diff_hours,
                "observation_latitude": argo_lat,
                "observation_longitude": argo_lon,
                "model_latitude": nearest_model_lat,
                "model_longitude": nearest_model_lon,
                "spatial_distance_km": spatial_distance_km,
                "matched_pair_count": 0,
                "bias_c": None,
                "rmse_c": None,
                "mae_c": None,
                "residual_min_c": None,
                "residual_max_c": None,
                "pairs": [],
                "method": "model-level-centric vertical matching",
                "provenance": {
                    "provider": "Argo GDAC / IFREMER",
                    "source_format": "NetCDF",
                    "standard": "Argo profile format",
                    "model_source": "BOB temperature argo window"
                }
            }

        # Apply mask to get valid pairs
        model_thetao_values_valid = [model_thetao_values[i] for i in range(len(model_thetao_values)) if valid_pairs_mask[i]]
        argo_pt0_values_valid = [argo_pt0_values[i] for i in range(len(argo_pt0_values)) if valid_pairs_mask[i]]
        matched_model_indices_valid = [matched_model_indices[i] for i in range(len(matched_model_indices)) if valid_pairs_mask[i]]
        matched_argo_indices_valid = [matched_argo_indices[i] for i in range(len(matched_argo_indices)) if valid_pairs_mask[i]]
        vertical_separations_valid = [vertical_separations[i] for i in range(len(vertical_separations)) if i < len(matched_model_indices) and valid_pairs_mask[i]]

        # Build pairs list using the exact schema field names
        pairs = []
        for i, (model_idx, argo_idx) in enumerate(zip(matched_model_indices_valid, matched_argo_indices_valid)):
            pair = {
                "model_depth_m": float(model_depth_vals[model_idx]),  # Fixed: use model_depth_vals, not argo_depths
                "observation_depth_m": float(argo_depths[argo_idx]),
                "vertical_gap_m": float(vertical_separations_valid[i]),
                "pressure_dbar": float(argo_pressures[argo_idx]),
                "observation_potential_temperature_c": float(argo_pt0_values_valid[i]),
                "model_thetao_c": float(model_thetao_values_valid[i]),
                "residual_c": float(model_thetao_values_valid[i] - argo_pt0_values_valid[i])
            }
            pairs.append(pair)

        # Compute metrics from pairs
        residuals = [pair["residual_c"] for pair in pairs]
        if residuals:
            bias = np.mean(residuals)
            rmse = np.sqrt(np.mean(np.array(residuals) ** 2))
            mae = np.mean(np.abs(residuals))
            residual_min = np.min(residuals)
            residual_max = np.max(residuals)
        else:
            bias = 0.0
            rmse = 0.0
            mae = 0.0
            residual_min = 0.0
            residual_max = 0.0

        # Return successful collocation
        return {
            "profile_id": profile_id,
            "status": "eligible",
            "observation_time": argo_time_str,
            "model_time": nearest_model_time.isoformat(),
            "time_difference_hours": time_diff_hours,
            "observation_latitude": argo_lat,
            "observation_longitude": argo_lon,
            "model_latitude": nearest_model_lat,
            "model_longitude": nearest_model_lon,
            "spatial_distance_km": spatial_distance_km,
            "matched_pair_count": len(pairs),
            "bias_c": float(bias),
            "rmse_c": float(rmse),
            "mae_c": float(mae),
            "residual_min_c": float(residual_min),
            "residual_max_c": float(residual_max),
            "pairs": pairs,
            "method": "model-level-centric vertical matching",
            "provenance": {
                "provider": "Argo GDAC / IFREMER",
                "source_format": "NetCDF",
                "standard": "Argo profile format",
                "model_source": "BOB temperature argo window"
            }
        }

    def close(self):
        """Close the model dataset."""
        if hasattr(self, 'model_ds'):
            self.model_ds.close()