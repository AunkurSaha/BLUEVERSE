import {
  computeTemporalScale,
  prepareTemperatureSlice,
  type PreparedTemperatureSlice,
  type TemperatureSlice,
} from './temperatureSlice.ts'

export const SUBSURFACE_LAYER_COUNTS = [5, 8, 12] as const
export type SubsurfaceLayerCount = (typeof SUBSURFACE_LAYER_COUNTS)[number]
export const VERTICAL_EXAGGERATIONS = [1, 5, 10, 20] as const
export type VerticalExaggeration = (typeof VERTICAL_EXAGGERATIONS)[number]

export interface SubsurfaceFrame {
  datasetId: string
  variable: 'thetao'
  timeIndex: number
  actualTime: string
  colorScale: { min: number; max: number }
  layers: Array<{
    depthIndex: number
    realDepth: number
    depthUnits: string
    prepared: PreparedTemperatureSlice
  }>
}

export interface SubsurfaceSample {
  variable: string
  actualTime: string
  realDepth: number
  depthUnits: string
  latitude: number
  longitude: number
  value: number | null
  units: string
}

export const sliceCacheKey = (
  datasetId: string,
  variable: string,
  timeIndex: number,
  depthIndex: number,
): string => `${datasetId}-${variable}-${timeIndex}-${depthIndex}`

/** Select real source-level indexes, distributed deterministically across depth. */
export const selectRepresentativeDepthIndexes = (
  selectableDepthIndexes: number[],
  requestedCount: number,
): number[] => {
  if (!Number.isInteger(requestedCount) || requestedCount < 2) {
    throw new Error('Representative depth sampling requires at least two levels.')
  }
  const uniqueIndexes = [...new Set(selectableDepthIndexes)]
  if (uniqueIndexes.length === 0) return []
  if (uniqueIndexes.length <= requestedCount) return uniqueIndexes

  return Array.from({ length: requestedCount }, (_, position) => {
    const sourcePosition = Math.round((position * (uniqueIndexes.length - 1)) / (requestedCount - 1))
    return uniqueIndexes[sourcePosition]
  })
}

/** Cesium heights are positive upward; source ocean depths are positive downward. */
export const displayHeightForDepth = (realDepth: number, verticalExaggeration: number): number =>
  -realDepth * verticalExaggeration

export const supportsSubsurfaceVariable = (variable: string): variable is 'thetao' => variable === 'thetao'

export const sharedFrameColorScale = (slices: TemperatureSlice[]): { min: number; max: number } =>
  computeTemporalScale(slices.map(({ tmin, tmax }) => ({ tmin, tmax })))

export const canActivateSubsurfaceFrame = (
  requestId: number,
  activeRequestId: number,
  aborted: boolean,
): boolean => !aborted && requestId === activeRequestId

export const buildSubsurfaceFrame = (
  datasetId: string,
  timeIndex: number,
  depthIndexes: number[],
  slices: TemperatureSlice[],
): SubsurfaceFrame => {
  if (depthIndexes.length === 0 || slices.length !== depthIndexes.length) {
    throw new Error('A subsurface frame requires one slice for every selected source depth.')
  }

  const actualTime = slices[0].actual_time
  if (slices.some((slice) => slice.var_name !== 'thetao' || slice.actual_time !== actualTime)) {
    throw new Error('A subsurface frame must contain temperature slices from one timestamp.')
  }

  const colorScale = sharedFrameColorScale(slices)
  return {
    datasetId,
    variable: 'thetao',
    timeIndex,
    actualTime,
    colorScale,
    layers: slices.map((slice, index) => ({
      depthIndex: depthIndexes[index],
      realDepth: slice.actual_depth,
      depthUnits: slice.depth_units,
      prepared: prepareTemperatureSlice(slice, colorScale),
    })),
  }
}
