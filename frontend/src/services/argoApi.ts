const API_BASE = '/api'

export interface ArgoProfileLevel {
  level_index: number
  pressure_dbar: number | null
  depth_m: number | null
  in_situ_temperature_c: number | null
  potential_temperature_c: number | null
  practical_salinity: number | null
  pressure_qc: number | null
  temperature_qc: number | null
  salinity_qc: number | null
  usable: boolean
}

export interface ArgoProfileSummary {
  profile_id: string
  platform_number: string
  cycle_number: string
  observation_time: string | null
  latitude: number | null
  longitude: number | null
  data_mode: string | null
  direction: string | null
  sampling_scheme: string | null
  level_count: number
  usable_level_count: number
  pressure_min_dbar: number | null
  pressure_max_dbar: number | null
  depth_min_m: number | null
  depth_max_m: number | null
  temperature_min_c: number | null
  temperature_max_c: number | null
  salinity_min: number | null
  salinity_max: number | null
  pressure_source: string
  temperature_source: string
  salinity_source: string
  provider: string
  source_format: string
  standard: string
  provenance: Record<string, unknown>
}

export interface ArgoProfileDetail extends ArgoProfileSummary {
  levels: ArgoProfileLevel[]
}

export interface CollocationPair {
  model_depth_m: number
  observation_depth_m: number
  vertical_gap_m: number
  pressure_dbar: number
  observation_potential_temperature_c: number
  model_thetao_c: number
  residual_c: number
}

export type CollocationStatus =
  | 'eligible'
  | 'no_vertical_overlap'
  | 'no_valid_pairs'
  | 'outside_time_tolerance'
  | 'outside_spatial_tolerance'
  | 'not_found'
  | 'error'
  | string

export interface ArgoModelCollocation {
  profile_id: string
  status: CollocationStatus
  observation_time: string | null
  model_time: string | null
  time_difference_hours: number | null
  observation_latitude: number | null
  observation_longitude: number | null
  model_latitude: number | null
  model_longitude: number | null
  spatial_distance_km: number | null
  matched_pair_count: number
  bias_c: number | null
  rmse_c: number | null
  mae_c: number | null
  residual_min_c: number | null
  residual_max_c: number | null
  pairs: CollocationPair[]
  method: string
  provenance: Record<string, unknown>
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

export const fetchArgoProfiles = async (signal?: AbortSignal): Promise<ArgoProfileSummary[]> =>
  requestJson(`${API_BASE}/observations/argo`, 'Failed to fetch ARGO profiles', { signal })

export const fetchArgoProfile = async (
  profileId: string,
  signal?: AbortSignal,
): Promise<ArgoProfileDetail> =>
  requestJson(
    `${API_BASE}/observations/argo/${encodeURIComponent(profileId)}`,
    'Failed to fetch ARGO profile',
    { signal },
  )

export const fetchArgoCollocation = async (
  profileId: string,
  signal?: AbortSignal,
): Promise<ArgoModelCollocation> =>
  requestJson(
    `${API_BASE}/observations/argo/${encodeURIComponent(profileId)}/collocation`,
    'Failed to fetch collocation',
    { signal },
  )
