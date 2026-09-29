import type { TemperatureSlice } from '../lib/temperatureSlice'

const API_BASE = '/api/events'

export type HistoricalVariable = 'thetao' | 'so' | 'currents'
export type HistoricalPhase = 'before' | 'during' | 'after'
export type HistoricalComparison = 'during-before' | 'after-before'

export interface HistoricalAnalysisWindow {
  id: HistoricalPhase
  label: string
  dates: string[]
  sample_count: number
}

export interface HistoricalOceanConfiguration {
  event_id: string
  product_id: string
  dataset_id: string
  model: string
  provider: string
  classification: 'Reanalysis'
  historical_time_window: string
  dataset_ids: Record<'thetao' | 'so' | 'uo' | 'vo', string>
  analysis_windows: HistoricalAnalysisWindow[]
}

export interface HistoricalPhaseMeanResponse {
  analysis_mode: 'phase_mean'
  phase: HistoricalPhase
  label: string
  dates: string[]
  sample_count: number
  color_scale?: { min: number; max: number }
  joint_finite_pairing?: boolean
  vector_mean_method?: string
  slice?: TemperatureSlice
  uo?: TemperatureSlice
  vo?: TemperatureSlice
}

export interface HistoricalDifferenceResponse {
  analysis_mode: 'difference'
  comparison: HistoricalComparison
  label: string
  minuend_phase: HistoricalPhase
  subtrahend_phase: HistoricalPhase
  finite_paired_cell_count: number
  mean_difference: number
  minimum_difference: number
  maximum_difference: number
  color_scale: { min: number; max: number }
  slice: TemperatureSlice
}

export interface HistoricalProbeResponse {
  requested_event_time: string
  matched_model_time: string
  absolute_offset_hours: number
  matching_method: 'nearest_available_source_time'
  track_position: { latitude: number; longitude: number }
  matched_model_grid_position: {
    latitude: number
    longitude: number
    latitude_index: number
    longitude_index: number
  }
  depth_units: string
  temperature: { units: string; levels: Array<{ depth: number; value: number | null }> }
  salinity: { units: string; levels: Array<{ depth: number; value: number | null }> }
  currents: {
    units: string
    levels: Array<{
      depth: number
      u: number | null
      v: number | null
      speed: number | null
      direction_toward_degrees: number | null
    }>
  }
  source: string
  product_id: string
  dataset_id: string
  sampling_method: 'nearest_model_grid_point'
  value_classification: 'model_reanalysis'
}

const requestJson = async <T>(url: string, signal?: AbortSignal): Promise<T> => {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`Historical ocean request failed: ${response.status}`)
  return response.json() as Promise<T>
}

export const fetchHistoricalOceanConfiguration = (eventId: string, signal?: AbortSignal) =>
  requestJson<HistoricalOceanConfiguration>(`${API_BASE}/${encodeURIComponent(eventId)}/ocean/config`, signal)

export const fetchHistoricalPhaseMean = (
  eventId: string,
  variable: HistoricalVariable,
  phase: HistoricalPhase,
  depthIndex: number,
  signal?: AbortSignal,
) => requestJson<HistoricalPhaseMeanResponse>(
  `${API_BASE}/${encodeURIComponent(eventId)}/ocean/phase-mean?variable=${variable}&phase=${phase}&depth_index=${depthIndex}`,
  signal,
)

export const fetchHistoricalDifference = (
  eventId: string,
  variable: Exclude<HistoricalVariable, 'currents'>,
  comparison: HistoricalComparison,
  depthIndex: number,
  signal?: AbortSignal,
) => requestJson<HistoricalDifferenceResponse>(
  `${API_BASE}/${encodeURIComponent(eventId)}/ocean/difference?variable=${variable}&comparison=${comparison}&depth_index=${depthIndex}`,
  signal,
)

export const fetchHistoricalProbe = (
  eventId: string,
  requestedEventTime: string,
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
) => requestJson<HistoricalProbeResponse>(
  `${API_BASE}/${encodeURIComponent(eventId)}/ocean/probe?requested_event_time=${encodeURIComponent(requestedEventTime)}&latitude=${latitude}&longitude=${longitude}`,
  signal,
)
