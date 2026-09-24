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
        pass

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
            'global_attributes': global_attrs
        }

    def get_slice(self, dataset_id: str, var_name: str, time_index: int, depth_index: int) -> Dict[str, Any]:
        """Get a slice of data and metadata."""
        dataset_info = dataset_registry.get(dataset_id)
        if not dataset_info:
            raise ValueError(f"Dataset ID '{dataset_id}' not registered.")
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
