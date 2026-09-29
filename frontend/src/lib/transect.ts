import { nearestGridValue, sampleTransect, type TransectPoint } from './oceanAnalysis.ts'
import type { TemperatureSlice } from './temperatureSlice.ts'

export interface GeoPoint { latitude: number; longitude: number }
export interface ModelDomain { south: number; north: number; west: number; east: number }
export interface TransectFrame {
  datasetId: string
  timeIndex: number
  actualTime: string
  points: TransectPoint[]
  depths: number[]
  depthUnits: string
  values: Array<Array<number | null>>
  units: string
  colorScale: { min: number; max: number }
}

export const supportsTransectVariable = (variable: string): variable is 'thetao' => variable === 'thetao'

export const pointInDomain = (point: GeoPoint, domain: ModelDomain): boolean =>
  Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && point.latitude >= domain.south && point.latitude <= domain.north && point.longitude >= domain.west && point.longitude <= domain.east

export const canActivateTransect = (generation: number, activeGeneration: number, aborted: boolean): boolean => !aborted && generation === activeGeneration

export const buildTransectFrame = (datasetId: string, timeIndex: number, start: GeoPoint, end: GeoPoint, sampleCount: number, slices: TemperatureSlice[]): TransectFrame => {
  if (slices.length === 0) throw new Error('Transect requires at least one real model depth slice.')
  const orderedSlices = [...slices].sort((left, right) => left.actual_depth - right.actual_depth)
  if (orderedSlices.some((slice, index) => !Number.isFinite(slice.actual_depth) || (index > 0 && slice.actual_depth === orderedSlices[index - 1].actual_depth))) throw new Error('Transect source depths must be finite and unique.')
  const reference = orderedSlices[0]
  const sameCoordinates = (left: number[], right: number[]) => left.length === right.length && left.every((value, index) => value === right[index])
  if (orderedSlices.some((slice) => slice.var_name !== 'thetao' || slice.actual_time !== reference.actual_time || !sameCoordinates(slice.lat_vals, reference.lat_vals) || !sameCoordinates(slice.lon_vals, reference.lon_vals))) throw new Error('Transect slices must share one temperature grid and timestamp.')
  const points = sampleTransect([start.latitude, start.longitude], [end.latitude, end.longitude], sampleCount)
  const values = orderedSlices.map((slice) => points.map((point) => nearestGridValue(slice, point.latitude, point.longitude)))
  const finite = values.flat().filter((value): value is number => value !== null && Number.isFinite(value))
  if (finite.length === 0) throw new Error('Insufficient valid model data along the selected transect.')
  return { datasetId, timeIndex, actualTime: reference.actual_time, points, depths: orderedSlices.map((slice) => slice.actual_depth), depthUnits: reference.depth_units, values, units: reference.var_units, colorScale: { min: Math.min(...finite), max: Math.max(...finite) } }
}
