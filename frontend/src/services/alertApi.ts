const API_BASE = '/api'

export type AlertSeverity = 'normal' | 'moderate' | 'high' | 'not_assessable'
export type AlertFilter = 'all' | 'moderate_plus' | 'high'

export interface AlertThresholds {
  normal_max_c: number
  moderate_max_c: number
  label: string
}

export interface ArgoPairAlert {
  alert_id: string
  platform_type: 'ARGO'
  platform_id: string
  profile_number: string
  variable: 'sea_water_potential_temperature'
  units: 'degrees_C'
  observation_time: string
  model_time: string
  time_offset_hours: number
  observation_latitude: number
  observation_longitude: number
  model_latitude: number
  model_longitude: number
  horizontal_distance_km: number
  observation_pressure_dbar: number
  observation_depth_m: number
  model_depth_m: number
  vertical_difference_m: number
  observation_value: number
  model_value: number
  residual: number
  absolute_residual: number
  severity: AlertSeverity
  qc_status: string
  collocation_status: string
  provenance: Record<string, unknown>
}

export interface ArgoProfileAlertSummary {
  profile_id: string
  platform_type: 'ARGO'
  platform_id: string
  profile_number: string
  observation_time: string | null
  observation_latitude: number | null
  observation_longitude: number | null
  matched_pair_count: number
  normal_count: number
  moderate_count: number
  high_count: number
  maximum_absolute_residual: number | null
  residual_at_maximum: number | null
  depth_of_maximum_residual: number | null
  bias: number | null
  rmse: number | null
  mae: number | null
  severity: AlertSeverity
  collocation_status: string
  not_assessable_reason: string | null
}

export interface ArgoProfileAlertDetail {
  summary: ArgoProfileAlertSummary
  alerts: ArgoPairAlert[]
  thresholds: AlertThresholds
  provenance: Record<string, unknown>
}

export interface ArgoAlertListResponse {
  thresholds: AlertThresholds
  summaries: ArgoProfileAlertSummary[]
}

async function requestJson<T>(url: string, failureMessage: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`${failureMessage}: ${response.status}`)
  return response.json() as Promise<T>
}

export const fetchArgoAlerts = (signal?: AbortSignal): Promise<ArgoAlertListResponse> =>
  requestJson(`${API_BASE}/alerts/argo`, 'Failed to fetch model-observation alerts', signal)

export const fetchArgoAlertDetail = (
  platformId: string,
  profileNumber: string,
  signal?: AbortSignal,
): Promise<ArgoProfileAlertDetail> =>
  requestJson(
    `${API_BASE}/alerts/argo/${encodeURIComponent(platformId)}/${encodeURIComponent(profileNumber)}`,
    'Failed to fetch model-observation alert evidence',
    signal,
  )
