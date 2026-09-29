import { createIdempotentCleanup, eventAndModelTimesAreDistinct, historicalEventEntityId, parseHistoricalEventEntityId, selectedTrackPoint } from './historicalEvents.ts'
import { EventApiClient, type HistoricalEventTrack } from '../services/eventApi.ts'
import {
  canActivateHistoricalRequest,
  HISTORICAL_DATASETS,
  historicalCacheKey,
  historicalCurrentDatasets,
  historicalDatasetForVariable,
  matchHistoricalOceanTime,
} from './historicalOcean.ts'

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message)
}

const track = {
  event_id: 'cyclone-amphan-2020',
  points: [
    { time: '2020-05-16T00:00:00Z', latitude: 10.4, longitude: 87, wind: 25, pressure: 1000, status: 'D', agency: 'RSMC New Delhi (IMD)' },
    { time: '2020-05-16T03:00:00Z', latitude: 10.7, longitude: 86.5, wind: null, pressure: 1000, status: null, agency: 'RSMC New Delhi (IMD)' },
  ],
} as HistoricalEventTrack

assert(selectedTrackPoint(track, 99) === track.points[1], 'Timeline selection must clamp to the real track range.')
const entityId = historicalEventEntityId(track.event_id, 1)
assert(parseHistoricalEventEntityId(track.event_id, entityId) === 1, 'Track point entity identity must round trip.')
assert(parseHistoricalEventEntityId(track.event_id, 'alert-other') === null, 'Unrelated Cesium entities must be ignored.')
assert(eventAndModelTimesAreDistinct(track.points[0].time, '2026-09-21T12:00:00Z'), 'Historical and active model years must remain distinct.')

let cleanupCount = 0
for (let cycle = 0; cycle < 3; cycle += 1) {
  const cleanup = createIdempotentCleanup(() => { cleanupCount += 1 })
  cleanup()
  cleanup()
}
assert(cleanupCount === 3, 'Three show/hide cycles must dispose exactly one event layer resource per cycle.')

let requestCount = 0
const client = new EventApiClient(async <T,>(url: string): Promise<T> => {
  requestCount += 1
  return ({ url } as unknown) as T
})
await Promise.all([client.detail(track.event_id), client.detail(track.event_id)])
await Promise.all([client.track(track.event_id), client.track(track.event_id)])
assert(requestCount === 2, 'Detail and track requests must each be cached after the first load.')

assert(historicalDatasetForVariable('thetao') === HISTORICAL_DATASETS.thetao, 'Historical temperature must resolve only to the Amphan dataset.')
assert(historicalDatasetForVariable('so') === HISTORICAL_DATASETS.so, 'Historical salinity must resolve only to the Amphan dataset.')
assert(historicalCurrentDatasets().u === HISTORICAL_DATASETS.uo && historicalCurrentDatasets().v === HISTORICAL_DATASETS.vo, 'Historical currents must resolve to distinct Amphan U/V datasets.')

const historicalTimes = Array.from({ length: 12 }, (_, index) => `2020-05-${String(index + 13).padStart(2, '0')}T00:00:00.000000000`)
assert(historicalTimes.length === 12, 'Historical ocean timeline must expose 12 daily source fields.')
const matched = matchHistoricalOceanTime('2020-05-20T09:00:00Z', historicalTimes)
assert(matched.index === 7 && matched.absoluteOffsetHours === 9, 'Track time must match the nearest daily ocean field with an honest offset.')
const tie = matchHistoricalOceanTime('2020-05-20T12:00:00Z', historicalTimes)
assert(tie.index === 7, 'An equal-distance time match must choose the earlier source timestamp.')

const commonKey = {
  context: 'historical-event' as const,
  eventId: 'cyclone-amphan-2020',
  variable: 'thetao' as const,
  timeIndex: 5,
  phase: 'before' as const,
  comparison: 'during-before' as const,
  depthIndex: 10,
}
const dailyKey = historicalCacheKey({ ...commonKey, mode: 'daily' })
const phaseKey = historicalCacheKey({ ...commonKey, mode: 'phase_mean' })
const differenceKey = historicalCacheKey({ ...commonKey, mode: 'difference' })
const currentContextKey = historicalCacheKey({ ...commonKey, context: 'current', mode: 'daily' })
const afterPhaseKey = historicalCacheKey({ ...commonKey, mode: 'phase_mean', phase: 'after' })
const afterDifferenceKey = historicalCacheKey({ ...commonKey, mode: 'difference', comparison: 'after-before' })
assert(dailyKey !== phaseKey && phaseKey !== differenceKey, 'Daily, phase, and difference cache identities must remain isolated.')
assert(dailyKey !== currentContextKey, 'Current and historical contexts must have distinct cache identities.')
assert(phaseKey !== afterPhaseKey, 'Before and after phase products must have distinct cache identities.')
assert(differenceKey !== afterDifferenceKey, 'Difference operands must be part of cache identity.')
assert(!dailyKey.includes('2026'), 'Historical cache identity must not resolve through a 2026 dataset.')
assert(canActivateHistoricalRequest(4, 4, false, 'historical-event'), 'The active historical request may render.')
assert(!canActivateHistoricalRequest(3, 4, false, 'historical-event'), 'A stale historical response must not render.')
assert(!canActivateHistoricalRequest(4, 4, false, 'current'), 'A historical response must not overwrite current context.')

console.log('historical event tests passed')
