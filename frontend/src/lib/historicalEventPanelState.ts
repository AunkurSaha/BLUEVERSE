import type { HistoricalEventDetail } from '../services/eventApi.ts'

export type HistoricalOceanAvailabilityState = 'IDLE' | 'LOADING' | 'AVAILABLE' | 'UNAVAILABLE' | 'ERROR'

export const historicalOceanAvailabilityState = (
  selectedEventId: string,
  detail: HistoricalEventDetail | null | undefined,
  loading: boolean,
  error: string | null,
): HistoricalOceanAvailabilityState => {
  if (!selectedEventId) return 'IDLE'
  if (loading) return 'LOADING'
  if (error) return 'ERROR'
  return detail?.historical_ocean_data?.status ?? 'UNAVAILABLE'
}
