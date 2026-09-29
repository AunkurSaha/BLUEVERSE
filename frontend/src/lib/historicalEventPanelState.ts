import type { HistoricalEventDetail } from '../services/eventApi.ts'

export type HistoricalOceanAvailabilityState = 'LOADING' | 'AVAILABLE' | 'UNAVAILABLE' | 'ERROR'

export const historicalOceanAvailabilityState = (
  detail: HistoricalEventDetail | null | undefined,
  configurationError: string | null,
): HistoricalOceanAvailabilityState => {
  if (configurationError) return 'ERROR'
  return detail?.historical_ocean_data?.status ?? 'LOADING'
}
