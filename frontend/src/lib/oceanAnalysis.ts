import { selectRepresentativeDepthIndexes } from './subsurfaceFrame.ts'
import type { TemperatureSlice } from './temperatureSlice.ts'

export const ISOSURFACE_QUALITIES = ['low', 'medium', 'high'] as const
export type IsosurfaceQuality = (typeof ISOSURFACE_QUALITIES)[number]
export const TRANSECT_SAMPLE_COUNTS = [50, 100, 200] as const

export const selectIsosurfaceDepthIndexes = (selectable: number[], quality: IsosurfaceQuality): number[] => {
  const count = quality === 'low' ? 8 : quality === 'medium' ? 20 : selectable.length
  if (quality === 'high') return [...new Set(selectable)]
  return selectRepresentativeDepthIndexes(selectable, count)
}

export const isosurfaceCacheKey = (dataset: string, timeIndex: number, target: number, quality: IsosurfaceQuality, depths: number[]): string =>
  `${dataset}-thetao-${timeIndex}-${target}-${quality}-${depths.join(',')}`

export const transectCacheKey = (dataset: string, timeIndex: number, start: [number, number], end: [number, number], samples: number): string =>
  `${dataset}-thetao-${timeIndex}-${start.join(',')}-${end.join(',')}-${samples}-nearest_grid_point`

export const targetWithinVolumeRange = (slices: TemperatureSlice[], target: number): boolean =>
  slices.length > 0 && Number.isFinite(target) && target >= Math.min(...slices.map((slice) => slice.tmin)) && target <= Math.max(...slices.map((slice) => slice.tmax))

export const hasTemperatureCrossing = (values: Array<number | null>, target: number): boolean => {
  const finite = values.filter((value): value is number => value !== null && Number.isFinite(value))
  return finite.length > 1 && Math.min(...finite) <= target && target <= Math.max(...finite)
}

export const displayDepth = (realDepth: number, verticalScale: number): number => -realDepth * verticalScale

const radians = (degrees: number): number => degrees * Math.PI / 180
export const greatCircleKilometres = (start: [number, number], end: [number, number]): number => {
  const [lat1, lon1] = start.map(radians) as [number, number]
  const [lat2, lon2] = end.map(radians) as [number, number]
  const a = Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export interface TransectPoint { latitude: number; longitude: number; distanceKm: number }
export const sampleTransect = (start: [number, number], end: [number, number], count: number): TransectPoint[] => {
  if (!Number.isInteger(count) || count < 2 || count > 200) throw new Error('Transect samples must be an integer between 2 and 200.')
  const total = greatCircleKilometres(start, end)
  const toVector = ([latitude, longitude]: [number, number]): [number, number, number] => {
    const lat = radians(latitude); const lon = radians(longitude)
    return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)]
  }
  const a = toVector(start); const b = toVector(end)
  const angle = Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])))
  return Array.from({ length: count }, (_, index) => {
    const fraction = index / (count - 1)
    if (angle === 0) return { latitude: start[0], longitude: start[1], distanceKm: 0 }
    const scaleA = Math.sin((1 - fraction) * angle) / Math.sin(angle); const scaleB = Math.sin(fraction * angle) / Math.sin(angle)
    const vector = [scaleA * a[0] + scaleB * b[0], scaleA * a[1] + scaleB * b[1], scaleA * a[2] + scaleB * b[2]]
    return { latitude: Math.atan2(vector[2], Math.hypot(vector[0], vector[1])) * 180 / Math.PI, longitude: Math.atan2(vector[1], vector[0]) * 180 / Math.PI, distanceKm: total * fraction }
  })
}

/** Samples the nearest grid coordinate; a missing source cell remains null. */
export const nearestGridValue = (slice: TemperatureSlice, latitude: number, longitude: number): number | null => {
  const nearest = (coordinates: number[], value: number) => coordinates.reduce((best, coordinate, index) => Math.abs(coordinate - value) < Math.abs(coordinates[best] - value) ? index : best, 0)
  return slice.slice_data[nearest(slice.lat_vals, latitude)]?.[nearest(slice.lon_vals, longitude)] ?? null
}
