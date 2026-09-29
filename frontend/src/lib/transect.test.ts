import { buildTransectFrame, canActivateTransect, pointInDomain, supportsTransectVariable } from './transect.ts'
import type { TemperatureSlice } from './temperatureSlice.ts'
const assert = (value: boolean, message: string) => { if (!value) throw new Error(message) }
const base = { dimension_order: ['latitude', 'longitude'] as ['latitude', 'longitude'], time_coord_name: 'time', depth_coord_name: 'depth', lat_coord_name: 'latitude', lon_coord_name: 'longitude', actual_time: '2026-09-21T00:00:00', lat_vals: [10, 11], lon_vals: [80, 81], var_standard_name: 'sea_water_potential_temperature', var_long_name: 'Temperature', var_units: 'degrees_C', depth_units: 'm', lat_units: 'degrees_north', lon_units: 'degrees_east', total_count: 4, var_name: 'thetao' }
const slice = (depth: number, data: Array<Array<number | null>>): TemperatureSlice => ({ ...base, dimension_order: ['latitude', 'longitude'], actual_depth: depth, slice_data: data, finite_count: data.flat().filter((v) => v !== null).length, missing_count: data.flat().filter((v) => v === null).length, tmin: 1, tmax: 4, tmean: 2.5 })
const slices = [slice(5, [[1, 2], [3, null]]), slice(37, [[2, 2], [3, null]])]
for (const sampleCount of [50, 100, 200]) {
  const sampled = buildTransectFrame('d', 0, { latitude: 10, longitude: 80 }, { latitude: 11, longitude: 81 }, sampleCount, slices)
  assert(sampled.points.length === sampleCount && sampled.values.every((row) => row.length === sampleCount), `exact ${sampleCount} sample count`)
}
const frame = buildTransectFrame('d', 0, { latitude: 10, longitude: 80 }, { latitude: 11, longitude: 81 }, 50, slices)
assert(frame.depths[0] === 5 && frame.depths[1] === 37, 'nonuniform real depths preserved')
assert(frame.points[0].latitude === 10 && frame.points[0].longitude === 80 && Math.abs(frame.points[49].latitude - 11) < 1e-9, 'endpoints preserved')
assert(frame.values[0][0] === 1 && frame.values[0][49] === null, 'nearest grid coordinates sampled without filling missing cells')
assert(frame.values[0].some((value) => value === null), 'missing values remain null')
assert(frame.actualTime === base.actual_time, 'real source timestamp preserved')
assert(pointInDomain({ latitude: 10.5, longitude: 80.5 }, { south: 10, north: 11, west: 80, east: 81 }), 'inside endpoint')
assert(!pointInDomain({ latitude: 12, longitude: 80.5 }, { south: 10, north: 11, west: 80, east: 81 }), 'outside endpoint')
assert(canActivateTransect(3, 3, false) && !canActivateTransect(2, 3, false), 'stale frame rejected')
assert(supportsTransectVariable('thetao') && !supportsTransectVariable('so') && !supportsTransectVariable('currents'), 'Temperature-only gating')
const nextTimeSlices = slices.map((item) => ({ ...item, actual_time: '2026-09-22T00:00:00' }))
assert(buildTransectFrame('d', 1, { latitude: 10, longitude: 80 }, { latitude: 11, longitude: 81 }, 50, nextTimeSlices).actualTime === '2026-09-22T00:00:00', 'playback frame uses the next real source timestamp')
console.log('transect tests passed')
