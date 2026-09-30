import { assertCompatibleCurrentMetadata, assertCompatibleCurrentSlices, buildCurrentProbeProfile, buildScalarProbeProfile, canActivateProbe, clearProbeState, currentDirectionToward, currentProfileFromResponse, currentSpeed, nearestTimestamp, nearestValidGridColumn, pointInsideGridDomain, probeCacheKey, scalarProfileFromResponse } from './oceanProbe.ts'
import type { TemperatureSlice } from './temperatureSlice.ts'
import type { DatasetMetadata } from '../services/api.ts'

const assert = (value: boolean, message: string) => { if (!value) throw new Error(message) }
const metadata = (datasetId: string, variable: string): DatasetMetadata => ({
  dataset_id: datasetId,
  provenance: { provider: null, product_id: null, model_source: null, institution: null },
  dimensions: { time: 2, depth: 2, latitude: 2, longitude: 2 },
  variables: [variable],
  time_coordinate: 'time',
  vertical_coordinate: 'depth',
  latitude_coordinate: 'latitude',
  longitude_coordinate: 'longitude',
  global_attributes: {},
  depth_coordinate_name: 'depth',
  depth_units: 'm',
  depth_values: [0.5, 37],
  selectable_depth_indices: [0, 1],
  time_coordinate_name: 'time',
  time_units: null,
  time_values: ['2026-09-21T00:00:00', '2026-09-21T06:00:00'],
})
const base = { dimension_order: ['latitude', 'longitude'] as ['latitude', 'longitude'], time_coord_name: 'time', depth_coord_name: 'depth', lat_coord_name: 'latitude', lon_coord_name: 'longitude', actual_time: '2026-09-21T06:00:00', lat_vals: [10, 11], lon_vals: [80, 82], var_standard_name: '', var_long_name: '', var_units: 'degrees_C', depth_units: 'm', lat_units: 'degrees_north', lon_units: 'degrees_east', total_count: 4 }
const slice = (variable: string, depth: number, data: Array<Array<number | null>>, units = 'degrees_C'): TemperatureSlice => {
  const finite = data.flat().filter((value): value is number => value !== null)
  return { ...base, var_name: variable, actual_depth: depth, slice_data: data, var_units: units, finite_count: finite.length, missing_count: 4 - finite.length, tmin: Math.min(...finite), tmax: Math.max(...finite), tmean: finite.reduce((sum, value) => sum + value, 0) / finite.length }
}

const scalarSlices = [slice('thetao', 0.5, [[null, 20], [21, 22]]), slice('thetao', 37, [[null, null], [18, 19]])]
const matched = nearestValidGridColumn(scalarSlices, { latitude: 10.1, longitude: 80.1 })
assert(matched.latitude === 11 && matched.longitude === 80, 'nearest valid grid column selected')
const scalar = buildScalarProbeProfile('temperature', 'thetao', '2026-09-21T00:00:00', { latitude: 10.1, longitude: 80.1 }, scalarSlices)
assert(scalar.matched.latitude === 11 && scalar.matched.longitude === 80, 'requested and matched coordinates retained')
assert(scalar.levels[0].depth === 0.5 && scalar.levels[1].depth === 37, 'nonuniform real depths preserved')
assert(scalar.levels[1].value === 18, 'nearest grid profile sampled')
const missingScalar = buildScalarProbeProfile('temperature', 'thetao', '2026-09-21T00:00:00', { latitude: 10.1, longitude: 81.9 }, scalarSlices)
assert(missingScalar.levels[1].value === null, 'missing profile values remain null')
assert(pointInsideGridDomain({ latitude: 10.5, longitude: 81 }, base.lat_vals, base.lon_vals), 'inside domain accepted')
assert(!pointInsideGridDomain({ latitude: 12, longitude: 81 }, base.lat_vals, base.lon_vals), 'outside domain rejected')

assert(currentSpeed(3, 4) === 5, 'current speed')
assert(currentDirectionToward(1, 0) === 90 && currentDirectionToward(0, -1) === 180 && currentDirectionToward(0, 0) === null, 'current direction toward true bearing')
const uSlices = [slice('uo', 0.5, [[1, null], [0, 2]], 'm s-1'), slice('uo', 37, [[null, null], [3, 4]], 'm s-1')]
const vSlices = [slice('vo', 0.5, [[0, null], [1, 0]], 'm s-1'), slice('vo', 37, [[null, null], [4, null]], 'm s-1')]
const currents = buildCurrentProbeProfile('arabian-sea-uo', 'arabian-sea-vo', '2026-09-21T00:00:00', { latitude: 10.9, longitude: 80.1 }, uSlices, vSlices)
assert(currents.levels[0].speed === 1 && currents.levels[1].speed === 5, 'paired current profile')
assert(currents.uDatasetId === 'arabian-sea-uo' && currents.vDatasetId === 'arabian-sea-vo', 'current profile preserves resolved dataset identity')
assert(currents.levels.every((level) => level.depth === 0.5 || level.depth === 37), 'current real depths')
const missingCurrents = buildCurrentProbeProfile('arabian-sea-uo', 'arabian-sea-vo', '2026-09-21T00:00:00', { latitude: 10.9, longitude: 81.9 }, uSlices, vSlices)
assert(missingCurrents.levels[1].speed === null && missingCurrents.levels[1].directionTowardDegrees === null, 'missing current pair remains unavailable')
let incompatibleRejected = false
try { buildCurrentProbeProfile('arabian-sea-uo', 'arabian-sea-vo', '2026-09-21T00:00:00', { latitude: 10.9, longitude: 80.1 }, uSlices, vSlices.map((item) => ({ ...item, actual_time: '2026-09-22T00:00:00' }))) } catch { incompatibleRejected = true }
assert(incompatibleRejected, 'incompatible U and V timestamps rejected')
let incompatibleDepthRejected = false
try { assertCompatibleCurrentSlices(uSlices[0], { ...vSlices[0], actual_depth: 1.5 }) } catch { incompatibleDepthRejected = true }
assert(incompatibleDepthRejected, 'incompatible U and V depths rejected')
const uMetadata = metadata('arabian-sea-uo', 'uo')
const vMetadata = metadata('arabian-sea-vo', 'vo')
assertCompatibleCurrentMetadata(uMetadata, vMetadata, 1, 1)
let incompatibleMetadataRejected = false
try { assertCompatibleCurrentMetadata(uMetadata, { ...vMetadata, time_values: ['2026-09-21T00:00:00'] }, 1, 1) } catch { incompatibleMetadataRejected = true }
assert(incompatibleMetadataRejected, 'incompatible U and V metadata rejected')

const nearest = nearestTimestamp('2026-09-21T05:00:00', ['2026-09-21T00:00:00', '2026-09-21T06:00:00'])
assert(nearest.index === 1 && nearest.offsetMilliseconds === 60 * 60 * 1000, 'nearest valid timestamp and offset')
let missingTimeRejected = false
try { nearestTimestamp('2026-09-21T05:00:00', []) } catch { missingTimeRejected = true }
assert(missingTimeRejected, 'missing compatible timestamp rejected')
const probeSources = ['arabian-sea-temperature', 'arabian-sea-salinity', 'arabian-sea-uo', 'arabian-sea-vo']
assert(probeCacheKey(probeSources, 't', { latitude: 10, longitude: 80 }) === probeCacheKey(probeSources, 't', { latitude: 10, longitude: 80 }) && probeCacheKey(probeSources, 't', { latitude: 10, longitude: 80 }) !== probeCacheKey(['bay-of-bengal-temperature', ...probeSources.slice(1)], 't', { latitude: 10, longitude: 80 }) && probeCacheKey(probeSources, 't', { latitude: 10, longitude: 80 }) !== probeCacheKey(probeSources, 't2', { latitude: 10, longitude: 80 }) && probeCacheKey(probeSources, 't', { latitude: 10, longitude: 80 }) !== probeCacheKey(probeSources, 't', { latitude: 11, longitude: 80 }), 'probe cache key includes all datasets, time, and location')
assert(canActivateProbe(4, 4, false) && !canActivateProbe(3, 4, false) && !canActivateProbe(4, 4, true), 'stale and aborted probe result rejected')
const scalarResponse = scalarProfileFromResponse({
  dataset_id: 'temperature', variable: 'thetao', actual_time: '2026-09-21T06:00:00',
  matched: { latitude: 11, longitude: 80, latitude_index: 1, longitude_index: 0 },
  depth_units: 'm', units: 'degrees_C', levels: [{ depth: 0.5, value: 21 }],
}, '2026-09-21T00:00:00')
assert(scalarResponse.matched.latitudeIndex === 1 && scalarResponse.timeOffsetMilliseconds === 6 * 3_600_000, 'bounded scalar profile response preserves match and time offset')
const currentResponse = currentProfileFromResponse({
  u_dataset_id: 'uo', v_dataset_id: 'vo', actual_time: '2026-09-21T00:00:00',
  matched: { latitude: 11, longitude: 80, latitude_index: 1, longitude_index: 0 },
  depth_units: 'm', units: 'm s-1', levels: [{ depth: 0.5, u: 1, v: 0, speed: 1, direction_toward_degrees: 90 }],
}, '2026-09-21T00:00:00')
assert(currentResponse.levels[0].directionTowardDegrees === 90 && currentResponse.uDatasetId === 'uo', 'bounded current profile response preserves joint current values')
const cleared = clearProbeState()
assert(!cleared.enabled && cleared.location === null && cleared.frame === null, 'probe cleanup state')
for (let cycle = 0; cycle < 3; cycle += 1) {
  const enabled = { ...clearProbeState(), enabled: true as const, status: 'Select a probe.' }
  const selected = { ...enabled, location: { latitude: 10 + cycle * 0.1, longitude: 80 } }
  const disabled = clearProbeState()
  assert(selected.enabled && selected.location !== null && !disabled.enabled && disabled.location === null && disabled.frame === null, `probe enable, select, disable cycle ${cycle + 1}`)
}
console.log('ocean probe tests passed')
