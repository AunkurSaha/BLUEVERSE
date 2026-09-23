import sys
import os
import tempfile
import subprocess
import numpy as np
import xarray as xr

# Check if matplotlib is available
try:
    import matplotlib
    HAS_MATPLOTLIB = True
except ImportError:
    HAS_MATPLOTLIB = False

# We still need to import the process_slice function for unit tests
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
try:
    from plot_temperature_slice import process_slice
except ImportError:
    # If we can't import process_slice, we will skip the unit tests too.
    process_slice = None

def create_synthetic_netcdf(path):
    """Create a synthetic NetCDF file for testing."""
    # Create dimensions
    time = np.array([0, 1], dtype='int32')  # time indices
    depth = np.array([0, 10], dtype='float32')  # depth in meters (2 levels)
    latitude = np.array([-5, 5], dtype='float32')  # latitude degrees
    longitude = np.array([30, 40], dtype='float32')  # longitude degrees
    
    # Create coordinate variables with attributes
    ds = xr.Dataset(
        {
            'temperature': (['time', 'depth', 'latitude', 'longitude'], 
                            np.random.rand(2, 2, 2, 2).astype(np.float32)),
        },
        coords={
            'time': time,
            'depth': depth,
            'latitude': latitude,
            'longitude': longitude,
        }
    )
    
    # Add attributes
    ds.temperature.attrs['standard_name'] = 'sea_water_temperature'
    ds.temperature.attrs['long_name'] = 'Sea Water Temperature'
    ds.temperature.attrs['units'] = 'degrees_C'
    
    ds.time.attrs['standard_name'] = 'time'
    ds.depth.attrs['standard_name'] = 'depth'
    ds.depth.attrs['positive'] = 'down'
    ds.depth.attrs['units'] = 'm'
    ds.latitude.attrs['standard_name'] = 'latitude'
    ds.latitude.attrs['units'] = 'degrees_north'
    ds.longitude.attrs['standard_name'] = 'longitude'
    ds.longitude.attrs['units'] = 'degrees_east'
    
    # Save to file
    ds.to_netcdf(path)
    ds.close()

def test_process_slice():
    """Unit test for the process_slice function."""
    if process_slice is None:
        print('Skipping unit tests because process_slice could not be imported.')
        return
    with tempfile.TemporaryDirectory() as tmpdir:
        nc_file = os.path.join(tmpdir, 'synthetic.nc')
        create_synthetic_netcdf(nc_file)
        
        # Open the dataset
        ds = xr.open_dataset(nc_file)
        try:
            # Process the slice at time index 0, depth index 0
            result = process_slice(ds, 'temperature', 0, 0)
        finally:
            ds.close()
        
        # Check the returned dictionary
        assert result['var_name'] == 'temperature'
        assert result['var_standard_name'] == 'sea_water_temperature'
        assert result['var_long_name'] == 'Sea Water Temperature'
        assert result['var_units'] == 'degrees_C'
        # Check that actual_time and actual_depth are present
        assert result['actual_time'] is not None
        assert result['actual_depth'] is not None
        assert result['slice_data'].shape == (2, 2)  # latitude=2, longitude=2
        assert result['total_count'] == 4
        assert result['finite_count'] == 4  # because we used random values without NaN
        assert result['missing_count'] == 0
        assert result['tmin'] >= 0.0 and result['tmin'] <= 1.0
        assert result['tmax'] >= 0.0 and result['tmax'] <= 1.0
        assert result['tmean'] >= 0.0 and result['tmean'] <= 1.0

def test_process_slice_with_nan():
    """Test that NaN values are handled correctly."""
    if process_slice is None:
        print('Skipping unit tests because process_slice could not be imported.')
        return
    with tempfile.TemporaryDirectory() as tmpdir:
        nc_file = os.path.join(tmpdir, 'synthetic_nan.nc')
        # We'll create a dataset with a NaN value at time=0, depth=0, latitude=5, longitude=40
        data = np.ones((2, 2, 2, 2), dtype=np.float32)  # fill with 1.0
        # Set a NaN at [time=0, depth=0, latitude=1 (index 1), longitude=1 (index 1)]
        data[0, 0, 1, 1] = np.nan
        ds = xr.Dataset(
            {
                'temperature': (['time', 'depth', 'latitude', 'longitude'], data),
            },
            coords={
                'time': np.array([0, 1], dtype='int32'),
                'depth': np.array([0, 10], dtype='float32'),
                'latitude': np.array([-5, 5], dtype='float32'),
                'longitude': np.array([30, 40], dtype='float32'),
            }
        )
        ds.temperature.attrs['standard_name'] = 'sea_water_temperature'
        ds.temperature.attrs['long_name'] = 'Sea Water Temperature'
        ds.temperature.attrs['units'] = 'degrees_C'
        ds.time.attrs['standard_name'] = 'time'
        ds.depth.attrs['standard_name'] = 'depth'
        ds.depth.attrs['positive'] = 'down'
        ds.depth.attrs['units'] = 'm'
        ds.latitude.attrs['standard_name'] = 'latitude'
        ds.latitude.attrs['units'] = 'degrees_north'
        ds.longitude.attrs['standard_name'] = 'longitude'
        ds.longitude.attrs['units'] = 'degrees_east'
        ds.to_netcdf(nc_file)
        ds.close()
        
        # Open and process
        ds = xr.open_dataset(nc_file)
        try:
            result = process_slice(ds, 'temperature', 0, 0)  # time=0, depth=0
        finally:
            ds.close()
        
        # The slice at time=0, depth=0 is [[1.0, 1.0], [1.0, np.nan]]
        assert result['slice_data'].shape == (2, 2)
        assert result['total_count'] == 4
        assert result['finite_count'] == 3  # one NaN
        assert result['missing_count'] == 1
        assert np.isclose(result['tmin'], 1.0)
        assert np.isclose(result['tmax'], 1.0)
        assert np.isclose(result['tmean'], 1.0)

def test_script_integration():
    """Integration test: run the script and check output.
    This test requires matplotlib and is skipped if matplotlib is not available.
    """
    if not HAS_MATPLOTLIB:
        print('Skipping integration test because matplotlib is not available.')
        return
    with tempfile.TemporaryDirectory() as tmpdir:
        nc_file = os.path.join(tmpdir, 'synthetic.nc')
        create_synthetic_netcdf(nc_file)
        
        out_file = os.path.join(tmpdir, 'output.png')
        
        # Get the absolute path to the script
        script_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        script_path = os.path.join(script_dir, 'scripts', 'plot_temperature_slice.py')
        
        # Run the script
        result = subprocess.run([
            sys.executable, 
            script_path,
            nc_file,
            '--variable', 'temperature',
            '--output', out_file
        ], capture_output=True, text=True)
        
        # Check that the script ran successfully
        assert result.returncode == 0, f"Script failed. STDOUT: {result.stdout} STDERR: {result.stderr}"
        
        # Check that the output file was created
        assert os.path.exists(out_file), 'Output file was not created.'
        
        # Check that the output contains expected strings
        assert 'Variable: temperature' in result.stdout
        assert 'Standard name: sea_water_temperature' in result.stdout
        assert 'Selected time index: 0' in result.stdout
        assert 'Selected depth index: 0' in result.stdout
        assert 'Slice shape: (2, 2)' in result.stdout  # latitude=2, longitude=2

if __name__ == '__main__':
    test_process_slice()
    test_process_slice_with_nan()
    test_script_integration()
    print("All tests passed.")
