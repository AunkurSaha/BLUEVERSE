import sys
import os
import xarray as xr
import numpy as np
import unittest

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

class TestDetectCoordinate(unittest.TestCase):
    def setUp(self):
        pass

    def test_standard_name_latitude(self):
        # Create a dataset with a coordinate that has standard_name='latitude'
        ds = xr.Dataset(coords={'lat': ([], 0, {'standard_name': 'latitude'})})
        candidates = get_coordinate_candidates(ds, 'latitude')
        self.assertEqual(candidates, ['lat'])
        # Ensure no false positives for other types
        self.assertEqual(get_coordinate_candidates(ds, 'longitude'), [])
        self.assertEqual(get_coordinate_candidates(ds, 'time'), [])
        self.assertEqual(get_coordinate_candidates(ds, 'vertical'), [])

    def test_standard_name_longitude(self):
        ds = xr.Dataset(coords={'lon': ([], 0, {'standard_name': 'longitude'})})
        candidates = get_coordinate_candidates(ds, 'longitude')
        self.assertEqual(candidates, ['lon'])

    def test_standard_name_time(self):
        ds = xr.Dataset(coords={'time': ([], 0, {'standard_name': 'time'})})
        candidates = get_coordinate_candidates(ds, 'time')
        self.assertEqual(candidates, ['time'])

    def test_standard_name_vertical_depth(self):
        ds = xr.Dataset(coords={'depth': ([], 0, {'standard_name': 'depth'})})
        candidates = get_coordinate_candidates(ds, 'vertical')
        self.assertEqual(candidates, ['depth'])

    def test_axis_latitude(self):
        ds = xr.Dataset(coords={'y': ([], 0, {'axis': 'Y'})})
        candidates = get_coordinate_candidates(ds, 'latitude')
        self.assertEqual(candidates, ['y'])

    def test_axis_longitude(self):
        ds = xr.Dataset(coords={'x': ([], 0, {'axis': 'X'})})
        candidates = get_coordinate_candidates(ds, 'longitude')
        self.assertEqual(candidates, ['x'])

    def test_axis_time(self):
        ds = xr.Dataset(coords={'t': ([], 0, {'axis': 'T'})})
        candidates = get_coordinate_candidates(ds, 'time')
        self.assertEqual(candidates, ['t'])

    def test_axis_vertical(self):
        ds = xr.Dataset(coords={'z': ([], 0, {'axis': 'Z'})})
        candidates = get_coordinate_candidates(ds, 'vertical')
        self.assertEqual(candidates, ['z'])

    def test_alias_latitude(self):
        ds = xr.Dataset(coords={'latitude': ([], 0)})  # No standard_name or axis, but name is latitude
        candidates = get_coordinate_candidates(ds, 'latitude')
        self.assertEqual(candidates, ['latitude'])

    def test_alias_longitude(self):
        ds = xr.Dataset(coords={'longitude': ([], 0)})
        candidates = get_coordinate_candidates(ds, 'longitude')
        self.assertEqual(candidates, ['longitude'])

    def test_alias_time(self):
        ds = xr.Dataset(coords={'time': ([], 0)})
        candidates = get_coordinate_candidates(ds, 'time')
        self.assertEqual(candidates, ['time'])

    def test_alias_vertical(self):
        ds = xr.Dataset(coords={'depth': ([], 0)})
        candidates = get_coordinate_candidates(ds, 'vertical')
        self.assertEqual(candidates, ['depth'])

    def test_no_match(self):
        ds = xr.Dataset(coords={'foo': ([], 0)})
        self.assertEqual(get_coordinate_candidates(ds, 'latitude'), [])
        self.assertEqual(get_coordinate_candidates(ds, 'longitude'), [])
        self.assertEqual(get_coordinate_candidates(ds, 'time'), [])
        self.assertEqual(get_coordinate_candidates(ds, 'vertical'), [])

    def test_exactly_one_candidate(self):
        ds = xr.Dataset(coords={'lat': ([], 0, {'standard_name': 'latitude'}), 'lon': ([], 0)})
        candidates = get_coordinate_candidates(ds, 'latitude')
        self.assertEqual(candidates, ['lat'])
        # The 'lon' should not be detected as latitude
        self.assertEqual(get_coordinate_candidates(ds, 'longitude'), ['lon'])

    def test_multiple_candidates_latitude(self):
        # Two coordinates that both indicate latitude
        ds = xr.Dataset(coords={
            'lat': ([], 0, {'standard_name': 'latitude'}),
            'latitude_alt': ([], 0, {'standard_name': 'latitude'})
        })
        candidates = get_coordinate_candidates(ds, 'latitude')
        # We expect both
        self.assertEqual(set(candidates), {'lat', 'latitude_alt'})
        self.assertEqual(len(candidates), 2)

    def test_multiple_candidates_mixed(self):
        # One latitude by standard_name, one by axis
        ds = xr.Dataset(coords={
            'lat': ([], 0, {'standard_name': 'latitude'}),
            'y': ([], 0, {'axis': 'Y'})
        })
        candidates = get_coordinate_candidates(ds, 'latitude')
        self.assertEqual(set(candidates), {'lat', 'y'})
        self.assertEqual(len(candidates), 2)

    def test_time_handling_datetime64(self):
        # We are not testing the time range calculation here, just detection
        times = np.array(['2020-01-01', '2020-01-02'], dtype='datetime64')
        ds = xr.Dataset(coords={'time': (('time',), times)})
        candidates = get_coordinate_candidates(ds, 'time')
        self.assertEqual(candidates, ['time'])

    def test_time_handling_numeric(self):
        # Numeric time with units attribute on the coordinate
        ds = xr.Dataset(coords={'time': (('time',), [0, 1, 2], {'units': 'days since 2020-01-01'})})
        candidates = get_coordinate_candidates(ds, 'time')
        self.assertEqual(candidates, ['time'])

    def test_fill_value_attrs(self):
        # This test is for the main script, but we can test that the function doesn't break
        # We'll just create a dummy dataset and run the detection.
        ds = xr.Dataset(coords={'lat': ([], 0, {'standard_name': 'latitude', '_FillValue': -999})})
        candidates = get_coordinate_candidates(ds, 'latitude')
        self.assertEqual(candidates, ['lat'])

    def test_fill_value_encoding(self):
        # Similarly, encoding is not checked in detection, but we can test that it doesn't break
        ds = xr.Dataset(coords={'lat': ([], 0, {'standard_name': 'latitude'})})
        # We cannot set encoding on a coordinate directly in xarray? Actually, we can.
        # But for simplicity, we'll just create a dataset and then assign encoding.
        # However, the detection function doesn't use encoding, so it's safe.
        ds = xr.Dataset(coords={'lat': ([], 0, {'standard_name': 'latitude'})})
        ds.lat.encoding['_FillValue'] = -999
        candidates = get_coordinate_candidates(ds, 'latitude')
        self.assertEqual(candidates, ['lat'])

if __name__ == '__main__':
    unittest.main()
