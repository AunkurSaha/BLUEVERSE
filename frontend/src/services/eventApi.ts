const API_BASE = '/api/events'

export interface EventUnits {
  latitude: string
  longitude: string
  wind: string
  pressure: string
}

export interface EventBounds {
  west: number
  south: number
  east: number
  north: number
}

export interface HistoricalEventSummary {
  id: string
  name: string
  event_type: 'tropical_cyclone'
  basin: string
  region_id: string
  start_time: string
  end_time: string
  source: string
  source_event_id: string
  agency: string
  status: 'historical'
  supported_analysis: string[]
  provenance: string
}

export interface HistoricalOceanData {
  status: 'AVAILABLE' | 'UNAVAILABLE'
  variables: string[]
  dataset_ids: string[]
}

export interface HistoricalEventDetail extends HistoricalEventSummary {
  track_point_count: number
  track_bounds: EventBounds
  duration_hours: number
  maximum_wind: number | null
  minimum_pressure: number | null
  units: EventUnits
  source_series: string
  source_url: string
  retrieval_date: string
  // Optional during frontend/backend version skew while capability metadata resolves.
  historical_ocean_data?: HistoricalOceanData
}

export interface HistoricalTrackPoint {
  time: string
  latitude: number
  longitude: number
  wind: number | null
  pressure: number | null
  status: string | null
  agency: string
}

export interface HistoricalEventTrack {
  event_id: string
  source: string
  source_event_id: string
  agency: string
  source_series: string
  source_url: string
  source_file: string
  source_sha256: string
  retrieval_date: string
  units: EventUnits
  status_field: string
  point_count: number
  bounds: EventBounds
  duration_hours: number
  maximum_wind: number | null
  minimum_pressure: number | null
  points: HistoricalTrackPoint[]
}

type JsonRequester = <T>(url: string) => Promise<T>

const requestJson: JsonRequester = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Historical event request failed: ${response.status}`)
  return response.json() as Promise<T>
}

export class EventApiClient {
  private readonly request: JsonRequester
  private listPromise: Promise<HistoricalEventSummary[]> | null = null
  private readonly detailPromises = new Map<string, Promise<HistoricalEventDetail>>()
  private readonly trackPromises = new Map<string, Promise<HistoricalEventTrack>>()

  constructor(request: JsonRequester = requestJson) {
    this.request = request
  }

  list(): Promise<HistoricalEventSummary[]> {
    if (!this.listPromise) {
      this.listPromise = this.request<HistoricalEventSummary[]>(API_BASE).catch((error) => {
        this.listPromise = null
        throw error
      })
    }
    return this.listPromise
  }

  detail(eventId: string): Promise<HistoricalEventDetail> {
    const existing = this.detailPromises.get(eventId)
    if (existing) return existing
    const request = this.request<HistoricalEventDetail>(`${API_BASE}/${encodeURIComponent(eventId)}`)
      .catch((error) => {
        this.detailPromises.delete(eventId)
        throw error
      })
    this.detailPromises.set(eventId, request)
    return request
  }

  track(eventId: string): Promise<HistoricalEventTrack> {
    const existing = this.trackPromises.get(eventId)
    if (existing) return existing
    const request = this.request<HistoricalEventTrack>(`${API_BASE}/${encodeURIComponent(eventId)}/track`)
      .catch((error) => {
        this.trackPromises.delete(eventId)
        throw error
      })
    this.trackPromises.set(eventId, request)
    return request
  }
}

export const eventApi = new EventApiClient()
