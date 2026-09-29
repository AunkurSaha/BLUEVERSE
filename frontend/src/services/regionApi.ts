const API_BASE = '/api'

export type RegionDataStatus = 'DATA_BACKED' | 'NAVIGATION_ONLY' | 'UNAVAILABLE'

export interface RegionBounds {
  west: number
  south: number
  east: number
  north: number
}

export interface RegionCamera {
  longitude: number
  latitude: number
  height: number
  heading: number
  pitch: number
}

export interface RegionDataset {
  id: string
  label: string
  variable: string
  bounds: RegionBounds | null
  time_coverage: string | null
  depth_coverage: string | null
}

export interface RegionSummary {
  id: string
  name: string
  short_name: string
  description: string
  bounds: RegionBounds
  camera: RegionCamera
  data_status: RegionDataStatus
}

export interface RegionDetail extends RegionSummary {
  model_datasets: RegionDataset[]
  observation_sources: string[]
  supported_variables: string[]
  analysis_capabilities: string[]
  time_coverage: string | null
  notes: string[]
}

async function requestJson<T>(url: string, message: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`${message}: ${response.status}`)
  return response.json() as Promise<T>
}

export const fetchRegions = (signal?: AbortSignal): Promise<RegionSummary[]> =>
  requestJson(`${API_BASE}/regions`, 'Failed to fetch study regions', signal)

export const fetchRegion = (regionId: string, signal?: AbortSignal): Promise<RegionDetail> =>
  requestJson(
    `${API_BASE}/regions/${encodeURIComponent(regionId)}`,
    'Failed to fetch study region details',
    signal,
  )
