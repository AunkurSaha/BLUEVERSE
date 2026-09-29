import type { TemperatureSlice } from './temperatureSlice.ts'
import { greatCircleKilometres } from './oceanAnalysis.ts'
import type { DatasetMetadata } from '../services/api.ts'

export interface ProbeLocation { latitude: number; longitude: number }
export interface ProbeGridMatch extends ProbeLocation { latitudeIndex: number; longitudeIndex: number }
export interface ProbeLevel { depth: number; value: number | null }
export interface ProbeCurrentLevel { depth: number; u: number | null; v: number | null; speed: number | null; directionTowardDegrees: number | null }

interface ProbeProfileBase {
  actualTime: string
  timeOffsetMilliseconds: number
  matched: ProbeGridMatch
  depthUnits: string
  units: string
}

export interface ProbeScalarProfile extends ProbeProfileBase {
  datasetId: string
  variable: string
  levels: ProbeLevel[]
}

export interface ProbeCurrentProfile extends ProbeProfileBase {
  uDatasetId: string
  vDatasetId: string
  levels: ProbeCurrentLevel[]
}

export interface OceanProbeFrame {
  requested: ProbeLocation
  globalTime: string
  temperature: ProbeScalarProfile | null
  salinity: ProbeScalarProfile | null
  currents: ProbeCurrentProfile | null
  errors: { temperature: string | null; salinity: string | null; currents: string | null }
}

const timestampMilliseconds = (value: string): number => {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) throw new Error(`Invalid model timestamp: ${value}`)
  return timestamp
}

export const nearestTimestamp = (target: string, values: string[]): { index: number; actualTime: string; offsetMilliseconds: number } => {
  if (values.length === 0) throw new Error('No compatible timestamp is available.')
  const targetMilliseconds = timestampMilliseconds(target)
  let bestIndex = -1
  let bestDistance = Number.POSITIVE_INFINITY
  values.forEach((value, index) => {
    const distance = Math.abs(timestampMilliseconds(value) - targetMilliseconds)
    if (distance < bestDistance) { bestDistance = distance; bestIndex = index }
  })
  const actualTime = values[bestIndex]
  return { index: bestIndex, actualTime, offsetMilliseconds: timestampMilliseconds(actualTime) - targetMilliseconds }
}

export const probeCacheKey = (datasetIds: string[], globalTime: string, location: ProbeLocation): string =>
  `${datasetIds.join('|')}-${globalTime}-${location.latitude.toFixed(8)}-${location.longitude.toFixed(8)}-nearest-valid-grid-column`

export const canActivateProbe = (generation: number, activeGeneration: number, aborted: boolean): boolean =>
  !aborted && generation === activeGeneration

const sameCoordinates = (left: number[], right: number[]): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index])

const sameStrings = (left: string[] | null, right: string[] | null): boolean =>
  left !== null && right !== null && left.length === right.length && left.every((value, index) => value === right[index])

const orderedCompatibleSlices = (slices: TemperatureSlice[], variable: string): TemperatureSlice[] => {
  if (slices.length === 0) throw new Error(`Variable unavailable: ${variable}.`)
  const ordered = [...slices].sort((left, right) => left.actual_depth - right.actual_depth)
  const reference = ordered[0]
  if (ordered.some((slice, index) =>
    slice.var_name !== variable ||
    slice.actual_time !== reference.actual_time ||
    slice.depth_units !== reference.depth_units ||
    slice.var_units !== reference.var_units ||
    !sameCoordinates(slice.lat_vals, reference.lat_vals) ||
    !sameCoordinates(slice.lon_vals, reference.lon_vals) ||
    !Number.isFinite(slice.actual_depth) ||
    (index > 0 && slice.actual_depth === ordered[index - 1].actual_depth)
  )) throw new Error(`${variable} profile slices do not share one compatible grid, timestamp, unit, and unique depth axis.`)
  return ordered
}

export const pointInsideGridDomain = (location: ProbeLocation, latitudes: number[], longitudes: number[]): boolean => {
  if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude) || latitudes.length === 0 || longitudes.length === 0) return false
  const south = Math.min(...latitudes); const north = Math.max(...latitudes)
  const west = Math.min(...longitudes); const east = Math.max(...longitudes)
  return location.latitude >= south && location.latitude <= north && location.longitude >= west && location.longitude <= east
}

export const nearestValidGridColumn = (slices: TemperatureSlice[], location: ProbeLocation): ProbeGridMatch => {
  if (slices.length === 0) throw new Error('No model slices are available for grid matching.')
  const reference = slices[0]
  if (!pointInsideGridDomain(location, reference.lat_vals, reference.lon_vals)) throw new Error('Selected point is outside the model domain.')
  let best: ProbeGridMatch | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (let latitudeIndex = 0; latitudeIndex < reference.lat_vals.length; latitudeIndex += 1) {
    for (let longitudeIndex = 0; longitudeIndex < reference.lon_vals.length; longitudeIndex += 1) {
      const hasValue = slices.some((slice) => {
        const value = slice.slice_data[latitudeIndex]?.[longitudeIndex]
        return value !== null && Number.isFinite(value)
      })
      if (!hasValue) continue
      const latitude = reference.lat_vals[latitudeIndex]
      const longitude = reference.lon_vals[longitudeIndex]
      const distance = greatCircleKilometres([location.latitude, location.longitude], [latitude, longitude])
      if (distance < bestDistance) { bestDistance = distance; best = { latitude, longitude, latitudeIndex, longitudeIndex } }
    }
  }
  if (!best) throw new Error('No valid data at location.')
  return best
}

export const currentSpeed = (u: number, v: number): number => Math.hypot(u, v)

/** Direction the current flows toward, clockwise from true north. */
export const currentDirectionToward = (u: number, v: number): number | null => {
  if (!Number.isFinite(u) || !Number.isFinite(v)) throw new Error('Current components must be finite.')
  if (u === 0 && v === 0) return null
  return (Math.atan2(u, v) * 180 / Math.PI + 360) % 360
}

export const assertCompatibleCurrentSlices = (
  uSlice: TemperatureSlice,
  vSlice: TemperatureSlice,
): void => {
  if (
    uSlice.var_name !== 'uo' ||
    vSlice.var_name !== 'vo' ||
    uSlice.actual_time !== vSlice.actual_time ||
    uSlice.actual_depth !== vSlice.actual_depth ||
    uSlice.depth_units !== vSlice.depth_units ||
    uSlice.var_units !== vSlice.var_units ||
    !sameCoordinates(uSlice.lat_vals, vSlice.lat_vals) ||
    !sameCoordinates(uSlice.lon_vals, vSlice.lon_vals)
  ) {
    throw new Error('U and V cannot be paired at a compatible time, depth, grid, and unit.')
  }
}

export const assertCompatibleCurrentMetadata = (
  uMetadata: DatasetMetadata,
  vMetadata: DatasetMetadata,
  timeIndex: number,
  depthIndex: number,
): void => {
  const uDepths = uMetadata.depth_values
  const vDepths = vMetadata.depth_values
  const uSelectable = uMetadata.selectable_depth_indices
  const vSelectable = vMetadata.selectable_depth_indices
  if (
    !uMetadata.variables.includes('uo') ||
    !vMetadata.variables.includes('vo') ||
    !sameStrings(uMetadata.time_values, vMetadata.time_values) ||
    uDepths === null ||
    vDepths === null ||
    !sameCoordinates(uDepths, vDepths) ||
    uSelectable === null ||
    vSelectable === null ||
    !sameCoordinates(uSelectable, vSelectable) ||
    !uSelectable.includes(depthIndex) ||
    !vSelectable.includes(depthIndex) ||
    timeIndex < 0 ||
    timeIndex >= (uMetadata.time_values?.length ?? 0)
  ) {
    throw new Error('U and V metadata do not share compatible variables, timestamps, and selectable depths.')
  }
}

export const buildScalarProbeProfile = (
  datasetId: string,
  variable: string,
  globalTime: string,
  requested: ProbeLocation,
  slices: TemperatureSlice[],
): ProbeScalarProfile => {
  const ordered = orderedCompatibleSlices(slices, variable)
  const matched = nearestValidGridColumn(ordered, requested)
  return {
    datasetId,
    variable,
    actualTime: ordered[0].actual_time,
    timeOffsetMilliseconds: timestampMilliseconds(ordered[0].actual_time) - timestampMilliseconds(globalTime),
    matched,
    depthUnits: ordered[0].depth_units,
    units: ordered[0].var_units,
    levels: ordered.map((slice) => ({ depth: slice.actual_depth, value: slice.slice_data[matched.latitudeIndex]?.[matched.longitudeIndex] ?? null })),
  }
}

export const buildCurrentProbeProfile = (
  uDatasetId: string,
  vDatasetId: string,
  globalTime: string,
  requested: ProbeLocation,
  uSlices: TemperatureSlice[],
  vSlices: TemperatureSlice[],
): ProbeCurrentProfile => {
  const uOrdered = orderedCompatibleSlices(uSlices, 'uo')
  const vOrdered = orderedCompatibleSlices(vSlices, 'vo')
  if (uOrdered.length !== vOrdered.length) throw new Error('U and V do not share compatible depth levels.')
  uOrdered.forEach((slice, index) => assertCompatibleCurrentSlices(slice, vOrdered[index]))
  const pairedSlices = uOrdered.map((slice, index) => ({ ...slice, slice_data: slice.slice_data.map((row, latitudeIndex) => row.map((u, longitudeIndex) => {
    const v = vOrdered[index].slice_data[latitudeIndex]?.[longitudeIndex]
    return u !== null && v !== null && Number.isFinite(u) && Number.isFinite(v) ? currentSpeed(u, v) : null
  })) }))
  const matched = nearestValidGridColumn(pairedSlices, requested)
  return {
    uDatasetId,
    vDatasetId,
    actualTime: uOrdered[0].actual_time,
    timeOffsetMilliseconds: timestampMilliseconds(uOrdered[0].actual_time) - timestampMilliseconds(globalTime),
    matched,
    depthUnits: uOrdered[0].depth_units,
    units: uOrdered[0].var_units,
    levels: uOrdered.map((slice, index) => {
      const u = slice.slice_data[matched.latitudeIndex]?.[matched.longitudeIndex] ?? null
      const v = vOrdered[index].slice_data[matched.latitudeIndex]?.[matched.longitudeIndex] ?? null
      if (u === null || v === null || !Number.isFinite(u) || !Number.isFinite(v)) return { depth: slice.actual_depth, u, v, speed: null, directionTowardDegrees: null }
      return { depth: slice.actual_depth, u, v, speed: currentSpeed(u, v), directionTowardDegrees: currentDirectionToward(u, v) }
    }),
  }
}

export const clearProbeState = (): { enabled: false; location: null; frame: null; status: string } => ({
  enabled: false,
  location: null,
  frame: null,
  status: 'Ocean Probe is disabled.',
})
