import sys
import xarray as xr
import numpy as np

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
        # Also consider the variable name as a hint (case-insensitive)
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
            # Check for standard_names that indicate vertical coordinate (depth or pressure)
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

def main():
    if len(sys.argv) < 2:
        print('Usage: python inspect_netcdf.py <netcdf_file>')
        sys.exit(1)
    
    filepath = sys.argv[1]
    try:
        # Open dataset lazily
        ds = xr.open_dataset(filepath)
    except Exception as e:
        print(f'Error opening dataset: {e}')
        sys.exit(1)
    
    print(f'Dataset: {filepath}')
    print('='*60)
    
    # Dataset dimensions
    print('Dimensions:')
    for dim, size in ds.sizes.items():
        print(f'  {dim}: {size}')
    print()
    
    # Coordinate variables
    print('Coordinate variables:')
    for name, coord in ds.coords.items():
        print(f'  {name}:')
        print(f'    shape: {coord.shape}')
        print(f'    dtype: {coord.dtype}')
        # Print attrs if any
        if coord.attrs:
            for attr, val in coord.attrs.items():
                print(f'    {attr}: {val}')
    print()
    
    # Data variables
    print('Data variables:')
    for name, var in ds.data_vars.items():
        print(f'  {name}:')
        print(f'    shape: {var.shape}')
        print(f'    dtype: {var.dtype}')
        # Check for standard_name, long_name, units
        standard_name = var.attrs.get('standard_name')
        long_name = var.attrs.get('long_name')
        units = var.attrs.get('units')
        if standard_name:
            print(f'    standard_name: {standard_name}')
        if long_name:
            print(f'    long_name: {long_name}')
        if units:
            print(f'    units: {units}')
        # Check for valid_min, valid_max, cell_methods
        valid_min = var.attrs.get('valid_min')
        valid_max = var.attrs.get('valid_max')
        if valid_min is not None:
            print(f'    valid_min: {valid_min}')
        if valid_max is not None:
            print(f'    valid_max: {valid_max}')
        cell_methods = var.attrs.get('cell_methods')
        if cell_methods:
            print(f'    cell_methods: {cell_methods}')
        # Check for scale_factor and add_offset in encoding
        encoding = var.encoding
        scale_factor = encoding.get('scale_factor')
        add_offset = encoding.get('add_offset')
        if scale_factor is not None:
            print(f'    scale_factor: {scale_factor}')
        if add_offset is not None:
            print(f'    add_offset: {add_offset}')
    print()
    
    # Coordinate detection and reporting
    coord_types = ['latitude', 'longitude', 'time', 'vertical']
    for coord_type in coord_types:
        candidates = get_coordinate_candidates(ds, coord_type)
        print(f'{coord_type.capitalize()} coordinate detection:')
        if len(candidates) == 0:
            print('  Not detected')
        elif len(candidates) == 1:
            coord_name = candidates[0]
            print(f'  Detected: {coord_name}')
            # Now, if it's a coordinate variable, we can try to get range and other metadata
            if coord_name in ds.coords:
                coord = ds.coords[coord_name]
                # Print units, standard_name, etc. from the coordinate
                units = coord.attrs.get('units')
                standard_name = coord.attrs.get('standard_name')
                if units:
                    print(f'    units: {units}')
                if standard_name:
                    print(f'    standard_name: {standard_name}')
                # Try to compute min and max if the coordinate is numeric and size is reasonable
                # We'll load the coordinate values (should be small)
                try:
                    coord_vals = coord.values
                    # Check if we can compute min/max (i.e., the values are comparable)
                    if np.issubdtype(coord_vals.dtype, np.number) or np.issubdtype(coord_vals.dtype, np.datetime64):
                        # For datetime64, we can do min/max
                        min_val = np.min(coord_vals)
                        max_val = np.max(coord_vals)
                        print(f'    range: {min_val} to {max_val}')
                    else:
                        print(f'    range: not computable (non-numeric or non-datetime)')
                except Exception as e:
                    print(f'    range: could not be computed ({e})')
                # For vertical, also check positive direction
                if coord_type == 'vertical':
                    positive = coord.attrs.get('positive')
                    if positive:
                        print(f'    positive: {positive}')
            else:
                print(f'    Note: {coord_name} is not a coordinate variable in this dataset.')
        else:
            print('  Ambiguous candidates:')
            for cand in candidates:
                print(f'    {cand}')
            print('  (Not selecting one automatically)')
        print()
    
    # Dataset global attributes
    print('Dataset global attributes:')
    for attr, val in ds.attrs.items():
        print(f'  {attr}: {val}')
    print()
    
    # Close the dataset
    ds.close()

if __name__ == '__main__':
    main()
