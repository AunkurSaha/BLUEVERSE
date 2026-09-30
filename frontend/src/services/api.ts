import type { TemperatureSlice } from '../lib/temperatureSlice'

const API_BASE = '/api'

export type Dataset = string

export type DatasetKind = 'model_grid' | 'historical_model_grid' | 'observation_trajectory'

export interface DatasetCatalogEntry {
  id: string
  dataset_kind: DatasetKind
  description: string | null
}

export type BackendStatus = 'checking' | 'online' | 'offline'

export interface DatasetMetadata {
  dataset_id: string
  provenance: {
    provider: string | null
    product_id: string | null
    model_source: string | null
    institution: string | null
  }
  dimensions: Record<string, number>
  variables: string[]
  time_coordinate: string | null
  vertical_coordinate: string | null
  latitude_coordinate: string | null
  longitude_coordinate: string | null
  global_attributes: Record<string, unknown>
  // Additional fields for depth exploration
  depth_coordinate_name: string | null
  depth_units: string | null
  depth_values: number[] | null
  selectable_depth_indices: number[] | null
  // Additional fields for time exploration
  time_coordinate_name: string | null
  time_units: string | null
  time_values: string[] | null
}

export interface ScalarProfileResponse {
  dataset_id: string
  variable: string
  actual_time: string
  matched: { latitude: number; longitude: number; latitude_index: number; longitude_index: number }
  depth_units: string
  units: string
  levels: Array<{ depth: number; value: number | null }>
}

export interface CurrentProfileResponse {
  u_dataset_id: string
  v_dataset_id: string
  actual_time: string
  matched: { latitude: number; longitude: number; latitude_index: number; longitude_index: number }
  depth_units: string
  units: string
  levels: Array<{ depth: number; u: number | null; v: number | null; speed: number | null; direction_toward_degrees: number | null }>
}

interface JsonRequestOptions {
  signal?: AbortSignal
}

async function requestJson<T>(
  url: string,
  failureMessage: string,
  options: JsonRequestOptions = {},
): Promise<T> {
  const response = await fetch(url, { signal: options.signal })
  if (!response.ok) {
    throw new Error(`${failureMessage}: ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const fetchHealth = async (signal?: AbortSignal): Promise<{ status: string }> =>
  requestJson('/health', 'Health check failed', { signal })

export const fetchDatasets = async (signal?: AbortSignal): Promise<Dataset[]> =>
  requestJson(`${API_BASE}/datasets`, 'Failed to fetch datasets', { signal })

export const fetchDatasetCatalog = async (signal?: AbortSignal): Promise<DatasetCatalogEntry[]> =>
  requestJson(`${API_BASE}/datasets/catalog`, 'Failed to fetch dataset catalog', { signal })

export const fetchDatasetMetadata = async (
  datasetId: string,
  signal?: AbortSignal,
): Promise<DatasetMetadata> =>
  requestJson(
    `${API_BASE}/datasets/${encodeURIComponent(datasetId)}/metadata`,
    'Failed to fetch dataset metadata',
    { signal },
  )

export const fetchTemperatureSlice = async (
  datasetId: string,
  variable: string,
  timeIndex: number,
  depthIndex: number,
  signal?: AbortSignal,
): Promise<TemperatureSlice> =>
  requestJson(
    `${API_BASE}/datasets/${encodeURIComponent(datasetId)}/slice?variable=${encodeURIComponent(
      variable,
    )}&time_index=${encodeURIComponent(timeIndex)}&depth_index=${encodeURIComponent(depthIndex)}`,
    'Failed to load temperature slice',
    { signal },
  )

export const fetchScalarProfile = async (
  datasetId: string,
  variable: string,
  timeIndex: number,
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<ScalarProfileResponse> => requestJson(
  `${API_BASE}/datasets/${encodeURIComponent(datasetId)}/profile?variable=${encodeURIComponent(variable)}&time_index=${encodeURIComponent(timeIndex)}&latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`,
  'Failed to load model profile',
  { signal },
)

export const fetchCurrentProfile = async (
  uDatasetId: string,
  vDatasetId: string,
  timeIndex: number,
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<CurrentProfileResponse> => requestJson(
  `${API_BASE}/datasets/${encodeURIComponent(uDatasetId)}/current-profile?v_dataset_id=${encodeURIComponent(vDatasetId)}&time_index=${encodeURIComponent(timeIndex)}&latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`,
  'Failed to load current profile',
  { signal },
)
