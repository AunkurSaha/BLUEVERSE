import type { TemperatureSlice } from '../lib/temperatureSlice'

const API_BASE = '/api'

export type Dataset = string

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
