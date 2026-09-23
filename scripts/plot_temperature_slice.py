import sys
import os
import argparse
import numpy as np
import xarray as xr

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
        - slice_data: 2D numpy array (latitude x longitude)
        - time_coord_name, depth_coord_name, lat_coord_name, lon_coord_name
        - actual_time, actual_depth
        - lat_vals, lon_vals
        - variable attributes (standard_name, long_name, units)
        - finite count, total count, missing count, tmin, tmax, tmean
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

    # Return a dictionary with all the needed information
    return {
        'slice_data': slice_data,
        'time_coord_name': time_coord_name,
        'depth_coord_name': depth_coord_name,
        'lat_coord_name': lat_coord_name,
        'lon_coord_name': lon_coord_name,
        'actual_time': actual_time,
        'actual_depth': actual_depth,
        'lat_vals': lat_vals,
        'lon_vals': lon_vals,
        'var_standard_name': var.attrs.get('standard_name', 'N/A'),
        'var_long_name': var.attrs.get('long_name', 'N/A'),
        'var_units': var.attrs.get('units', 'N/A'),
        'depth_units': depth_coord.attrs.get('units', ''),
        'lat_units': lat_coord.attrs.get('units', ''),
        'lon_units': lon_coord.attrs.get('units', ''),
        'finite_count': finite_count,
        'total_count': total_count,
        'missing_count': missing_count,
        'tmin': tmin,
        'tmax': tmax,
        'tmean': tmean,
        'var_name': var_name
    }

def plot_slice(processed_dict, output_path):
    '''
    Create and save a plot from the processed dictionary.
    '''
    import matplotlib
    matplotlib.use('Agg')  # Non-interactive backend
    import matplotlib.pyplot as plt
    
    slice_data = processed_dict['slice_data']
    lat_vals = processed_dict['lat_vals']
    lon_vals = processed_dict['lon_vals']
    var_name = processed_dict['var_name']
    var_standard_name = processed_dict['var_standard_name']
    var_long_name = processed_dict['var_long_name']
    var_units = processed_dict['var_units']
    actual_time = processed_dict['actual_time']
    actual_depth = processed_dict['actual_depth']
    depth_units = processed_dict['depth_units']

    # Create plot
    plt.figure(figsize=(8, 6))
    try:
        mesh = plt.pcolormesh(lon_vals, lat_vals, slice_data, shading='auto')
    except Exception as e:
        # Fallback to contourf if pcolormesh fails
        plt.contourf(lon_vals, lat_vals, slice_data)
        mesh = plt.gca().collections[0]

    plt.colorbar(mesh, label=f'{var_long_name} ({var_units})')
    plt.xlabel(f'Longitude ({processed_dict["lon_units"]})')
    plt.ylabel(f'Latitude ({processed_dict["lat_units"]})')
    title = f'{var_long_name}\n'
    title += f'Time: {actual_time}, Depth: {actual_depth} {depth_units}'
    plt.title(title)
    plt.tight_layout()

    # Ensure output directory exists
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Save figure
    plt.savefig(output_path, dpi=150)
    plt.close()

def main():
    parser = argparse.ArgumentParser(description='Plot a 2D slice of a NetCDF variable.')
    parser.add_argument('netcdf_path', help='Path to the NetCDF file')
    parser.add_argument('--variable', default='thetao', help='Variable name to plot (default: thetao)')
    parser.add_argument('--time-index', type=int, default=0, help='Time index to select (default: 0)')
    parser.add_argument('--depth-index', type=int, default=0, help='Depth index to select (default: 0)')
    parser.add_argument('--output', default='outputs/temperature_slice.png', help='Output PNG path (default: outputs/temperature_slice.png)')
    args = parser.parse_args()

    # Open dataset lazily
    try:
        ds = xr.open_dataset(args.netcdf_path)
    except Exception as e:
        print(f'Error opening dataset: {e}')
        sys.exit(1)

    try:
        # Process the slice
        processed = process_slice(ds, args.variable, args.time_index, args.depth_index)
    except Exception as e:
        print(f'Error processing slice: {e}')
        ds.close()
        sys.exit(1)
    finally:
        ds.close()

    # Report information
    print(f'Variable: {processed["var_name"]}')
    print(f'Standard name: {processed["var_standard_name"]}')
    print(f'Long name: {processed["var_long_name"]}')
    print(f'Units: {processed["var_units"]}')
    print(f'Selected time index: {args.time_index}')
    print(f'Actual timestamp: {processed["actual_time"]}')
    print(f'Selected depth index: {args.depth_index}')
    print(f'Actual model depth: {processed["actual_depth"]} {processed["depth_units"]}')
    print(f'Latitude range: {np.nanmin(processed["lat_vals"]):.3f} to {np.nanmax(processed["lat_vals"]):.3f} {processed["lat_units"]}')
    print(f'Longitude range: {np.nanmin(processed["lon_vals"]):.3f} to {np.nanmax(processed["lon_vals"]):.3f} {processed["lon_units"]}')
    print(f'Slice shape: {processed["slice_data"].shape}')
    print(f'Finite values: {processed["finite_count"]}/{processed["total_count"]}')
    print(f'Missing/non-finite values: {processed["missing_count"]}/{processed["total_count"]}')
    print(f'Minimum finite temperature: {processed["tmin"]:.3f} {processed["var_units"]}')
    print(f'Maximum finite temperature: {processed["tmax"]:.3f} {processed["var_units"]}')
    print(f'Mean finite temperature: {processed["tmean"]:.3f} {processed["var_units"]}')

    # Plot and save
    try:
        plot_slice(processed, args.output)
        print(f'Saved plot to: {args.output}')
    except Exception as e:
        print(f'Error creating or saving plot: {e}')
        sys.exit(1)

if __name__ == '__main__':
    main()
