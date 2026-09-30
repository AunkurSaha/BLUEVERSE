import xarray as xr
import numpy as np
import os
from typing import Dict, Any, Optional, Tuple

from .dataset_registry import dataset_registry

def get_coordinate_candidates(ds, coord_type):
    '''
    Returns a list of coordinate variable names that match the given type.
    coord_type: one of 'latitude', 'longitude', 'time', 'vertical'
    '''
    candidates = []
    for name, coord in ds.coords.items():
        attrs = coord.attrs
        standard_name = attrs.get('standard_name')
        axis = attrs.get('axis')
        lower_name = name.lower()
        
        if coord_type == 'latitude':
            if standard_name == 'latitude' or axis in ['Y', 'y'] or lower_name in ['lat', 'latitude', 'y']:
                candidates.append(name)
        elif coord_type == 'longitude':
            if standard_name == 'longitude' or axis in ['X', 'x'] or lower_name in ['lon', 'longitude', 'x']:
                candidates.append(name)
        elif coord_type == 'time':
            if standard_name == 'time' or axis in ['T', 't'] or lower_name in ['time', 't']:
                candidates.append(name)
        elif coord_type == 'vertical':
            vertical_standard_names = ['depth', 'sea_depth', 'sea_water_depth', 'pressure', 
                                       'sea_water_pressure', 'sea_water_sigma_coordinate',
                                       'sea_water_sigma_over_z_coordinate', 
                                       'sea_water_sigma_over_s_coordinate']
            if standard_name in vertical_standard_names or axis in ['Z', 'z'] or lower_name in ['depth', 'z', 'lev', 'level', 'height']:
                candidates.append(name)
    # Remove duplicates while preserving order
    seen = set()
    unique = []
    for item in candidates:
        if item not in seen:
            seen.add(item)
            unique.append(item)
    return unique

def get_primary_coordinate(ds, coord_type):
    '''
    Returns the primary coordinate variable name for the given type, or None if ambiguous/not found.
    Candidates are collected via get_coordinate_candidates.
    If exactly one candidate, return it.
    If zero candidates, return None.
    If more than one, return None (ambiguous).
    '''
    candidates = get_coordinate_candidates(ds, coord_type)
    if len(candidates) == 1:
        return candidates[0]
    return None

def process_slice(ds, var_name, time_index, depth_index):
    '''
    Process the dataset to extract the slice and compute statistics.
    Returns a dictionary with:
        - slice_data: 2D numpy array (latitude x longitude) -> we will convert to list
        - time_coord_name, depth_coord_name, lat_coord_name, lon_coord_name
        - actual_time, actual_depth (converted to Python types)
        - lat_vals, lon_vals (converted to list)
        - variable attributes (standard_name, long_name, units)
        - finite count, total count, missing count, tmin, tmax, tmean (as float or None)
        - depth units
        - lat_units, lon_units
    '''
    # Get variable
    if var_name not in ds.data_vars:
        raise ValueError(f'Variable "{var_name}" not found in dataset.')
    var = ds[var_name]

    # Detect coordinate names
    time_coord_name = get_primary_coordinate(ds, 'time')
    depth_coord_name = get_primary_coordinate(ds, 'vertical')
    lat_coord_name = get_primary_coordinate(ds, 'latitude')
    lon_coord_name = get_primary_coordinate(ds, 'longitude')

    # If any detection fails, raise an error
    if time_coord_name is None:
        raise ValueError('Could not unambiguously detect time coordinate.')
    if depth_coord_name is None:
        raise ValueError('Could not unambiguously detect vertical coordinate.')
    if lat_coord_name is None:
        raise ValueError('Could not unambiguously detect latitude coordinate.')
    if lon_coord_name is None:
        raise ValueError('Could not unambiguously detect longitude coordinate.')

    # Get the coordinate variables
    time_coord = ds[time_coord_name]
    depth_coord = ds[depth_coord_name]
    lat_coord = ds[lat_coord_name]
    lon_coord = ds[lon_coord_name]

    # Select the slice
    try:
        slice_var = var.isel({time_coord_name: time_index, depth_coord_name: depth_index})
    except Exception as e:
        raise ValueError(f'Error selecting indices: {e}')

    # Load the slice data
    try:
        slice_data = slice_var.values
    except Exception as e:
        raise ValueError(f'Error loading slice data: {e}')

    # Get the actual coordinate values for the selected indices
    try:
        actual_time = time_coord.isel({time_coord_name: time_index}).values
        actual_depth = depth_coord.isel({depth_coord_name: depth_index}).values
    except Exception as e:
        raise ValueError(f'Error getting coordinate values: {e}')

    # Get latitude and longitude arrays for plotting
    try:
        lat_vals = lat_coord.values
        lon_vals = lon_coord.values
    except Exception as e:
        raise ValueError(f'Error getting latitude/longitude values: {e}')

    # Check for NaNs and compute statistics
    finite_mask = np.isfinite(slice_data)
    finite_count = np.count_nonzero(finite_mask)
    total_count = slice_data.size
    missing_count = total_count - finite_count

    if finite_count == 0:
        raise ValueError('No finite values in the selected slice.')

    finite_vals = slice_data[finite_mask]
    tmin = np.nanmin(finite_vals)
    tmax = np.nanmax(finite_vals)
    tmean = np.nanmean(finite_vals)

    # Convert numpy types to Python types for JSON serialization
    def convert(obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, np.datetime64):
            return pd.Timestamp(obj).isoformat() if 'pd' in globals() else str(obj)
        else:
            return obj

    # Return a dictionary with all the needed information
    return {
        'slice_data': convert(slice_data),
        'dimension_order': ['latitude', 'longitude'],
        'time_coord_name': time_coord_name,
        'depth_coord_name': depth_coord_name,
        'lat_coord_name': lat_coord_name,
        'lon_coord_name': lon_coord_name,
        'actual_time': convert(actual_time),
        'actual_depth': convert(actual_depth),
        'lat_vals': convert(lat_vals),
        'lon_vals': convert(lon_vals),
        'var_standard_name': var.attrs.get('standard_name', 'N/A'),
        'var_long_name': var.attrs.get('long_name', 'N/A'),
        'var_units': var.attrs.get('units', 'N/A'),
        'depth_units': depth_coord.attrs.get('units', ''),
        'lat_units': lat_coord.attrs.get('units', ''),
        'lon_units': lon_coord.attrs.get('units', ''),
        'finite_count': int(finite_count),
        'total_count': int(total_count),
        'missing_count': int(missing_count),
        'tmin': convert(tmin) if finite_count > 0 else None,
        'tmax': convert(tmax) if finite_count > 0 else None,
        'tmean': convert(tmean) if finite_count > 0 else None,
        'var_name': var_name
    }

class NetCDFService:
    def __init__(self):
        self._metadata_cache = {}

    def get_dataset_metadata(self, dataset_id: str) -> Dict[str, Any]:
        """Get metadata for a dataset."""
        dataset_info = dataset_registry.get(dataset_id)
        if not dataset_info:
            raise ValueError(f"Dataset ID '{dataset_id}' not registered.")
        file_path = dataset_info['file_path']
        try:
            ds = xr.open_dataset(file_path)
        except Exception as e:
            raise ValueError(f"Error opening dataset: {e}")
        
        # Get coordinate names
        time_coord_name = get_primary_coordinate(ds, 'time')
        depth_coord_name = get_primary_coordinate(ds, 'vertical')
        lat_coord_name = get_primary_coordinate(ds, 'latitude')
        lon_coord_name = get_primary_coordinate(ds, 'longitude')
        
        # Get dimension sizes
        dimensions = {name: size for name, size in ds.sizes.items()}
        
        # Get variable list
        variables = list(ds.data_vars.keys())
        
        # Get global attributes
        global_attrs = dict(ds.attrs)
        
        # Prepare depth values and units if depth coordinate is found
        depth_values = None
        depth_units = None
        selectable_depth_indices = None
        if depth_coord_name is not None and depth_coord_name in ds.coords:
            depth_coord = ds[depth_coord_name]
            depth_values = depth_coord.values.tolist()  # Convert to list of Python floats
            depth_units = depth_coord.attrs.get('units', '')
            # A selectable level must contain at least one finite source value
            # across the dataset's first gridded scientific variable. This keeps
            # all-null coordinate levels out of the slice UI without changing
            # source coordinates or pretending they are observations.
            data_name = next((name for name, value in ds.data_vars.items() if depth_coord_name in value.dims), None)
            if data_name is not None:
                data_var = ds[data_name]
                selectable_depth_indices = [
                    index for index in range(depth_coord.sizes[depth_coord_name])
                    if np.isfinite(data_var.isel({depth_coord_name: index}).values).any()
                ]

        # Prepare time values and units if time coordinate is found
        time_values = None
        time_units = None
        if time_coord_name is not None and time_coord_name in ds.coords:
            time_coord = ds[time_coord_name]
            # Convert time values to ISO format strings for JSON serialization
            time_values = [str(t) for t in time_coord.values]
            time_units = time_coord.attrs.get('units')
            if time_units is None:
                time_units = time_coord.encoding.get('units', '')

        ds.close()

        return {
            'dataset_id': dataset_id,
            'provenance': {
                'provider': global_attrs.get('provider') or global_attrs.get('producer'),
                'product_id': global_attrs.get('product'),
                'model_source': global_attrs.get('source'),
                'institution': global_attrs.get('institution'),
            },
            'dimensions': dimensions,
            'variables': variables,
            'time_coordinate': time_coord_name,
            'vertical_coordinate': depth_coord_name,
            'latitude_coordinate': lat_coord_name,
            'longitude_coordinate': lon_coord_name,
            'global_attributes': global_attrs,
            # Additional fields for depth exploration
            'depth_coordinate_name': depth_coord_name,
            'depth_units': depth_units,
            'depth_values': depth_values,
            'selectable_depth_indices': selectable_depth_indices,
            # Additional fields for time exploration
            'time_coordinate_name': time_coord_name,
            'time_units': time_units,
            'time_values': time_values
        }

    def get_slice(self, dataset_id: str, var_name: str, time_index: int, depth_index: int) -> Dict[str, Any]:
        """Get a slice of data and metadata."""
        # Validate dataset existence and get metadata (cached)
        dataset_info = dataset_registry.get(dataset_id)
        if not dataset_info:
            raise ValueError(f"Dataset ID '{dataset_id}' not registered.")

        # Get metadata for depth validation
        metadata = self.get_dataset_metadata(dataset_id)
        depth_count = metadata['dimensions']['depth']
        if depth_index < 0 or depth_index >= depth_count:
            raise ValueError(f"Depth index {depth_index} is out of range. Valid range is 0 to {depth_count-1} for dataset with {depth_count} depth levels.")

        # Get metadata for time validation
        time_coord_name = metadata['time_coordinate']
        if time_coord_name is not None:
            time_count = metadata['dimensions'].get(time_coord_name, 0)
            if time_index < 0 or time_index >= time_count:
                raise ValueError(f"Time index {time_index} is out of range. Valid range is 0 to {time_count-1} for dataset with {time_count} time steps.")

        file_path = dataset_info['file_path']
        try:
            ds = xr.open_dataset(file_path)
        except Exception as e:
            raise ValueError(f"Error opening dataset: {e}")

        try:
            result = process_slice(ds, var_name, time_index, depth_index)
        except Exception as e:
            ds.close()
            raise e
        finally:
            ds.close()

        return result

    @staticmethod
    def _profile_context(ds, var_name: str, time_index: int):
        if var_name not in ds.data_vars:
            raise ValueError(f'Variable "{var_name}" not found in dataset.')
        names = {
            kind: get_primary_coordinate(ds, kind)
            for kind in ('time', 'vertical', 'latitude', 'longitude')
        }
        if any(value is None for value in names.values()):
            raise ValueError('Could not unambiguously detect profile coordinates.')
        time_name = names['time']
        depth_name = names['vertical']
        lat_name = names['latitude']
        lon_name = names['longitude']
        variable = ds[var_name]
        try:
            volume = variable.isel({time_name: time_index}).transpose(depth_name, lat_name, lon_name).values
            actual_time = ds[time_name].isel({time_name: time_index}).values
        except Exception as error:
            raise ValueError(f'Error selecting profile time: {error}') from error
        return {
            'variable': variable,
            'volume': volume,
            'actual_time': str(actual_time),
            'depths': np.asarray(ds[depth_name].values),
            'latitudes': np.asarray(ds[lat_name].values),
            'longitudes': np.asarray(ds[lon_name].values),
            'depth_units': ds[depth_name].attrs.get('units', ''),
        }

    @staticmethod
    def _nearest_valid_column(latitudes, longitudes, valid_columns, latitude: float, longitude: float):
        if not np.isfinite(latitude) or not np.isfinite(longitude):
            raise ValueError('Probe coordinates must be finite.')
        if not (float(np.min(latitudes)) <= latitude <= float(np.max(latitudes))):
            raise ValueError('Selected point is outside the model domain.')
        if not (float(np.min(longitudes)) <= longitude <= float(np.max(longitudes))):
            raise ValueError('Selected point is outside the model domain.')
        if not np.any(valid_columns):
            raise ValueError('No valid data at location.')

        latitude_grid, longitude_grid = np.meshgrid(latitudes, longitudes, indexing='ij')
        latitude_radians = np.radians(latitude)
        latitude_grid_radians = np.radians(latitude_grid)
        latitude_delta = latitude_grid_radians - latitude_radians
        longitude_delta = np.radians(longitude_grid - longitude)
        haversine = np.sin(latitude_delta / 2) ** 2 + np.cos(latitude_radians) * np.cos(latitude_grid_radians) * np.sin(longitude_delta / 2) ** 2
        distances = 2 * 6371.0088 * np.arctan2(np.sqrt(haversine), np.sqrt(np.maximum(0, 1 - haversine)))
        distances = np.where(valid_columns, distances, np.inf)
        latitude_index, longitude_index = np.unravel_index(np.argmin(distances), distances.shape)
        return {
            'latitude': float(latitudes[latitude_index]),
            'longitude': float(longitudes[longitude_index]),
            'latitude_index': int(latitude_index),
            'longitude_index': int(longitude_index),
        }

    def get_profile(self, dataset_id: str, var_name: str, time_index: int, latitude: float, longitude: float) -> Dict[str, Any]:
        dataset_info = dataset_registry.get(dataset_id)
        if not dataset_info:
            raise ValueError(f"Dataset ID '{dataset_id}' not registered.")
        with xr.open_dataset(dataset_info['file_path']) as ds:
            context = self._profile_context(ds, var_name, time_index)
            volume = context['volume']
            matched = self._nearest_valid_column(
                context['latitudes'], context['longitudes'], np.isfinite(volume).any(axis=0), latitude, longitude,
            )
            levels = []
            for depth_index, depth in enumerate(context['depths']):
                value = volume[depth_index, matched['latitude_index'], matched['longitude_index']]
                levels.append({'depth': float(depth), 'value': float(value) if np.isfinite(value) else None})
            return {
                'dataset_id': dataset_id,
                'variable': var_name,
                'actual_time': context['actual_time'],
                'matched': matched,
                'depth_units': context['depth_units'],
                'units': context['variable'].attrs.get('units', 'N/A'),
                'levels': levels,
            }

    def get_current_profile(self, u_dataset_id: str, v_dataset_id: str, time_index: int, latitude: float, longitude: float) -> Dict[str, Any]:
        u_info = dataset_registry.get(u_dataset_id)
        v_info = dataset_registry.get(v_dataset_id)
        if not u_info or not v_info:
            raise ValueError('Current component dataset is not registered.')
        with xr.open_dataset(u_info['file_path']) as u_ds, xr.open_dataset(v_info['file_path']) as v_ds:
            u_context = self._profile_context(u_ds, 'uo', time_index)
            v_context = self._profile_context(v_ds, 'vo', time_index)
            compatible = (
                u_context['actual_time'] == v_context['actual_time']
                and u_context['depth_units'] == v_context['depth_units']
                and u_context['variable'].attrs.get('units') == v_context['variable'].attrs.get('units')
                and np.array_equal(u_context['depths'], v_context['depths'])
                and np.array_equal(u_context['latitudes'], v_context['latitudes'])
                and np.array_equal(u_context['longitudes'], v_context['longitudes'])
            )
            if not compatible:
                raise ValueError('U and V do not share a compatible time, depth, grid, and unit.')
            u_volume = u_context['volume']
            v_volume = v_context['volume']
            paired = np.isfinite(u_volume) & np.isfinite(v_volume)
            matched = self._nearest_valid_column(
                u_context['latitudes'], u_context['longitudes'], paired.any(axis=0), latitude, longitude,
            )
            levels = []
            for depth_index, depth in enumerate(u_context['depths']):
                u_value = u_volume[depth_index, matched['latitude_index'], matched['longitude_index']]
                v_value = v_volume[depth_index, matched['latitude_index'], matched['longitude_index']]
                if not (np.isfinite(u_value) and np.isfinite(v_value)):
                    levels.append({'depth': float(depth), 'u': None, 'v': None, 'speed': None, 'direction_toward_degrees': None})
                    continue
                u_float = float(u_value)
                v_float = float(v_value)
                speed = float(np.hypot(u_float, v_float))
                direction = None if speed == 0 else float((np.degrees(np.arctan2(u_float, v_float)) + 360) % 360)
                levels.append({'depth': float(depth), 'u': u_float, 'v': v_float, 'speed': speed, 'direction_toward_degrees': direction})
            return {
                'u_dataset_id': u_dataset_id,
                'v_dataset_id': v_dataset_id,
                'actual_time': u_context['actual_time'],
                'matched': matched,
                'depth_units': u_context['depth_units'],
                'units': u_context['variable'].attrs.get('units', 'N/A'),
                'levels': levels,
            }



    def open_dataset(self, file_path: str):
        """Open a NetCDF dataset and return the xarray Dataset object.
        
        Note: The caller is responsible for closing the dataset when done.
        """
        try:
            return xr.open_dataset(file_path)
        except Exception as e:
            raise ValueError(f"Error opening dataset: {e}")
