import type { HistoricalEventTrack, HistoricalTrackPoint } from '../services/eventApi.ts'

export const formatHistoricalUtc = (value: string | null): string => {
  if (!value) return 'Unavailable'
  const millisecondPrecision = value.replace(/\.(\d{3})\d+$/, '.$1')
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(millisecondPrecision) ? millisecondPrecision : `${millisecondPrecision}Z`
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return value
  return `${parsed.toISOString().slice(0, 16).replace('T', ' ')} UTC`
}

export const selectedTrackPoint = (
  track: HistoricalEventTrack | null,
  index: number,
): HistoricalTrackPoint | null => {
  if (!track || track.points.length === 0) return null
  const safeIndex = Math.max(0, Math.min(index, track.points.length - 1))
  return track.points[safeIndex]
}

export const historicalEventEntityId = (eventId: string, index: number): string =>
  `historical-event-${eventId}-point-${index}`

export const parseHistoricalEventEntityId = (eventId: string, value: unknown): number | null => {
  if (typeof value !== 'string') return null
  const prefix = `historical-event-${eventId}-point-`
  if (!value.startsWith(prefix)) return null
  const index = Number(value.slice(prefix.length))
  return Number.isInteger(index) && index >= 0 ? index : null
}

export const createIdempotentCleanup = (dispose: () => void): (() => void) => {
  let disposed = false
  return () => {
    if (disposed) return
    disposed = true
    dispose()
  }
}

export const eventAndModelTimesAreDistinct = (
  eventTime: string | null,
  modelTime: string | null,
): boolean => {
  if (!eventTime || !modelTime) return true
  return new Date(eventTime).getUTCFullYear() !== new Date(modelTime).getUTCFullYear()
}
