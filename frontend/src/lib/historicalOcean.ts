import type { OceanProbeFrame, ProbeLocation } from './oceanProbe.ts'
import type { HistoricalComparison, HistoricalPhase, HistoricalProbeResponse, HistoricalVariable } from '../services/historicalOceanApi.ts'

export type AnalysisContext = 'current' | 'historical-event'
export type HistoricalAnalysisMode = 'daily' | 'phase_mean' | 'difference'

export const HISTORICAL_EVENT_ID = 'cyclone-amphan-2020'
export const HISTORICAL_DATASETS = {
  thetao: 'amphan-2020-temperature',
  so: 'amphan-2020-salinity',
  uo: 'amphan-2020-uo',
  vo: 'amphan-2020-vo',
} as const

export const historicalDatasetForVariable = (variable: HistoricalVariable): string =>
  variable === 'thetao'
    ? HISTORICAL_DATASETS.thetao
    : variable === 'so'
      ? HISTORICAL_DATASETS.so
      : HISTORICAL_DATASETS.uo

export const historicalCurrentDatasets = () => ({
  u: HISTORICAL_DATASETS.uo,
  v: HISTORICAL_DATASETS.vo,
})

const timestamp = (value: string): number => {
  const millisecondPrecision = value.replace(/\.(\d{3})\d+$/, '.$1')
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(millisecondPrecision)
    ? millisecondPrecision
    : `${millisecondPrecision}Z`
  const parsed = Date.parse(normalized)
  if (!Number.isFinite(parsed)) throw new Error(`Invalid timestamp: ${value}`)
  return parsed
}

export const matchHistoricalOceanTime = (requested: string, sourceTimes: string[]) => {
  if (sourceTimes.length === 0) throw new Error('No historical ocean timestamps are available.')
  const requestedMilliseconds = timestamp(requested)
  const index = sourceTimes.reduce((best, value, candidate) => {
    const candidateTime = timestamp(value)
    const bestTime = timestamp(sourceTimes[best])
    const candidateDistance = Math.abs(candidateTime - requestedMilliseconds)
    const bestDistance = Math.abs(bestTime - requestedMilliseconds)
    return candidateDistance < bestDistance || (candidateDistance === bestDistance && candidateTime < bestTime)
      ? candidate
      : best
  }, 0)
  return {
    index,
    requestedEventTime: requested,
    matchedModelTime: sourceTimes[index],
    absoluteOffsetHours: Math.abs(timestamp(sourceTimes[index]) - requestedMilliseconds) / 3_600_000,
    matchingMethod: 'nearest_available_source_time' as const,
  }
}

export const historicalCacheKey = ({
  context,
  eventId,
  variable,
  mode,
  timeIndex,
  phase,
  comparison,
  depthIndex,
}: {
  context: AnalysisContext
  eventId: string
  variable: HistoricalVariable
  mode: HistoricalAnalysisMode
  timeIndex: number
  phase: HistoricalPhase
  comparison: HistoricalComparison
  depthIndex: number
}): string => [context, eventId, variable, mode, mode === 'daily' ? `time:${timeIndex}` : mode === 'phase_mean' ? `phase:${phase}` : `comparison:${comparison}`, `depth:${depthIndex}`].join('|')

export const canActivateHistoricalRequest = (
  requestId: number,
  activeRequestId: number,
  aborted: boolean,
  context: AnalysisContext,
): boolean => !aborted && requestId === activeRequestId && context === 'historical-event'

export const historicalProbeCacheKey = (
  eventId: string,
  sourceTime: string,
  location: ProbeLocation,
): string => `historical-event|${eventId}|${sourceTime}|${location.latitude.toFixed(8)}|${location.longitude.toFixed(8)}|nearest-model-grid-point`

export const historicalProbeToOceanProbeFrame = (response: HistoricalProbeResponse): OceanProbeFrame => {
  const matched = {
    latitude: response.matched_model_grid_position.latitude,
    longitude: response.matched_model_grid_position.longitude,
    latitudeIndex: response.matched_model_grid_position.latitude_index,
    longitudeIndex: response.matched_model_grid_position.longitude_index,
  }
  const signedOffsetMilliseconds = timestamp(response.matched_model_time) - timestamp(response.requested_event_time)
  return {
    requested: response.track_position,
    globalTime: response.requested_event_time,
    temperature: {
      datasetId: HISTORICAL_DATASETS.thetao,
      variable: 'thetao',
      actualTime: response.matched_model_time,
      timeOffsetMilliseconds: signedOffsetMilliseconds,
      matched,
      depthUnits: response.depth_units,
      units: response.temperature.units,
      levels: response.temperature.levels,
    },
    salinity: {
      datasetId: HISTORICAL_DATASETS.so,
      variable: 'so',
      actualTime: response.matched_model_time,
      timeOffsetMilliseconds: signedOffsetMilliseconds,
      matched,
      depthUnits: response.depth_units,
      units: response.salinity.units,
      levels: response.salinity.levels,
    },
    currents: {
      uDatasetId: HISTORICAL_DATASETS.uo,
      vDatasetId: HISTORICAL_DATASETS.vo,
      actualTime: response.matched_model_time,
      timeOffsetMilliseconds: signedOffsetMilliseconds,
      matched,
      depthUnits: response.depth_units,
      units: response.currents.units,
      levels: response.currents.levels.map((level) => ({
        depth: level.depth,
        u: level.u,
        v: level.v,
        speed: level.speed,
        directionTowardDegrees: level.direction_toward_degrees,
      })),
    },
    errors: { temperature: null, salinity: null, currents: null },
  }
}
