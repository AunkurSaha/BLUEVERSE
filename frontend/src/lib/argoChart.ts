import type { ArgoProfileDetail, ArgoModelCollocation } from '../services/argoApi.ts'

/**
 * A contiguous run of plottable (depth, temperature) points.
 * Segments break wherever either value is null so the chart never
 * connects across missing observations.
 */
export interface ChartSegment {
  points: Array<{ temperature: number; depth: number }>
}

export interface ProfileChartData {
  observation: ChartSegment[]
  model: ChartSegment[]
  depthMin: number
  depthMax: number
  tempMin: number
  tempMax: number
  usableLevelCount: number
  totalLevelCount: number
}

const emptyData = (totalLevelCount: number, usableLevelCount: number): ProfileChartData => ({
  observation: [],
  model: [],
  depthMin: 0,
  depthMax: 0,
  tempMin: 0,
  tempMax: 0,
  usableLevelCount,
  totalLevelCount,
})

/**
 * Build observation profile segments from ARGO levels.
 * Uses potential temperature (the scientifically comparable field).
 * No interpolation: null depth or temperature breaks the segment.
 */
export const buildObservationSegments = (
  profile: ArgoProfileDetail,
): { segments: ChartSegment[]; usableLevelCount: number } => {
  const usable = profile.levels.filter((level) => level.usable)
  const segments: ChartSegment[] = []
  let current: ChartSegment | null = null

  for (const level of usable) {
    if (level.depth_m === null || level.potential_temperature_c === null) {
      current = null
      continue
    }
    if (!current) {
      current = { points: [] }
      segments.push(current)
    }
    current.points.push({
      temperature: level.potential_temperature_c,
      depth: level.depth_m,
    })
  }

  return { segments, usableLevelCount: usable.length }
}

/**
 * Build matched-pair model/observation series from a collocation result.
 * Only eligible results with pairs produce series; null metrics stay null.
 */
export const buildCollocationSeries = (
  collocation: ArgoModelCollocation,
): { observation: ChartSegment[]; model: ChartSegment[] } => {
  if (collocation.status !== 'eligible' || collocation.pairs.length === 0) {
    return { observation: [], model: [] }
  }
  const sorted = [...collocation.pairs].sort((a, b) => a.model_depth_m - b.model_depth_m)
  return {
    observation: [
      {
        points: sorted.map((pair) => ({
          temperature: pair.observation_potential_temperature_c,
          depth: pair.observation_depth_m,
        })),
      },
    ],
    model: [
      {
        points: sorted.map((pair) => ({
          temperature: pair.model_thetao_c,
          depth: pair.model_depth_m,
        })),
      },
    ],
  }
}

export const buildProfileChartData = (
  profile: ArgoProfileDetail,
  collocation: ArgoModelCollocation | null,
): ProfileChartData => {
  const { segments, usableLevelCount } = buildObservationSegments(profile)
  const comparison = collocation ? buildCollocationSeries(collocation) : null

  const allPoints = [
    ...segments.flatMap((segment) => segment.points),
    ...(comparison ? comparison.observation.flatMap((segment) => segment.points) : []),
    ...(comparison ? comparison.model.flatMap((segment) => segment.points) : []),
  ]
  if (allPoints.length === 0) {
    return emptyData(profile.levels.length, usableLevelCount)
  }

  const depths = allPoints.map((point) => point.depth)
  const temps = allPoints.map((point) => point.temperature)
  const depthMin = Math.min(...depths)
  const depthMax = Math.max(...depths)
  let tempMin = Math.min(...temps)
  let tempMax = Math.max(...temps)
  if (tempMin === tempMax) {
    tempMin -= 0.5
    tempMax += 0.5
  }

  return {
    observation: segments,
    model: comparison ? comparison.model : [],
    depthMin,
    depthMax,
    tempMin,
    tempMax,
    usableLevelCount,
    totalLevelCount: profile.levels.length,
  }
}

export const formatCelsius = (value: number | null): string =>
  value === null ? 'Not available' : `${value.toFixed(4)} °C`

export const formatKilometers = (value: number | null): string =>
  value === null ? 'Not available' : `${value.toFixed(2)} km`

export const formatHours = (value: number | null): string =>
  value === null ? 'Not available' : `${value.toFixed(2)} h`

export const formatDepthMeters = (value: number | null): string =>
  value === null ? 'Not available' : `${value.toFixed(1)} m`

export const formatOptionalText = (value: string | null): string =>
  value === null || value === '' ? 'Not provided' : value

export const formatObservationTime = (value: string | null): string => {
  if (!value) return 'Not provided'
  // Parse as UTC to avoid timezone conversion issues
  const parsed = new Date(value + 'Z')
  if (Number.isNaN(parsed.getTime())) return value
  return `${parsed.toISOString().replace('T', ' ').replace(/:\d{2}(\.\d+)?Z$/, ' UTC')}`
}

/** Human-readable label for a backend collocation status. No fabricated science. */
export const describeCollocationStatus = (status: CollocationStatusLabel): string => {
  switch (status) {
    case 'eligible':
      return 'Model–observation collocation available.'
    case 'no_vertical_overlap':
      return 'No overlapping model depth range is available for this profile.'
    case 'no_valid_pairs':
      return 'No valid matched pairs: observations or model values are missing at matched depths.'
    case 'outside_time_tolerance':
      return 'No model time step within the temporal tolerance for this profile.'
    case 'outside_spatial_tolerance':
      return 'No model grid point within the spatial tolerance for this profile.'
    case 'not_found':
      return 'Profile not found.'
    default:
      return `Collocation unavailable (status: ${status}).`
  }
}

export type CollocationStatusLabel = ArgoModelCollocation['status']





