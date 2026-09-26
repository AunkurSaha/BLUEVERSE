export interface TemperatureSlice {
  slice_data: Array<Array<number | null>>
  dimension_order: ['latitude', 'longitude']
  time_coord_name: string
  depth_coord_name: string
  lat_coord_name: string
  lon_coord_name: string
  actual_time: string
  actual_depth: number
  lat_vals: number[]
  lon_vals: number[]
  var_standard_name: string
  var_long_name: string
  var_units: string
  depth_units: string
  lat_units: string
  lon_units: string
  finite_count: number
  total_count: number
  missing_count: number
  tmin: number
  tmax: number
  tmean: number
  var_name: string
}

export interface GeographicExtent {
  west: number
  south: number
  east: number
  north: number
}

export interface PreparedTemperatureSlice {
  slice: TemperatureSlice
  extent: GeographicExtent
  latAscending: boolean
  lonAscending: boolean
  imageDataUrl: string
  /**
   * Fixed color range used for rasterization. When provided, identical
   * temperatures map to identical colors across all timestamps at a depth,
   * which makes temporal change visually comparable. Per-slice statistics on
   * `slice` (tmin/tmax/tmean) always remain the real current-slice values.
   */
  colorScale: { min: number; max: number } | null
}

export type TemperatureSliceFailureKind = 'empty' | 'invalid'

export class TemperatureSliceValidationError extends Error {
  readonly kind: TemperatureSliceFailureKind

  constructor(message: string, kind: TemperatureSliceFailureKind = 'invalid') {
    super(message)
    this.name = 'TemperatureSliceValidationError'
    this.kind = kind
  }
}

const cividisStops: Array<[number, number, number]> = [
  [0, 34, 78],
  [26, 56, 111],
  [67, 78, 108],
  [97, 101, 111],
  [125, 124, 120],
  [155, 148, 118],
  [188, 174, 108],
  [222, 201, 88],
  [254, 232, 56],
]

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const median = (values: number[]): number => {
  if (values.length === 0) {
    throw new TemperatureSliceValidationError('Cannot calculate a median of an empty list.')
  }

  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

const nearlyEqual = (left: number, right: number, tolerance: number): boolean =>
  Math.abs(left - right) <= tolerance

interface CoordinateAnalysis {
  ascending: boolean
  spacing: number
}

const analyzeCoordinates = (values: number[], coordinateName: string): CoordinateAnalysis => {
  if (values.length < 2) {
    throw new TemperatureSliceValidationError(
      `${coordinateName} must contain at least two coordinates to infer raster cell edges.`,
    )
  }

  if (values.some((value) => !isFiniteNumber(value))) {
    throw new TemperatureSliceValidationError(`${coordinateName} contains a non-finite coordinate.`)
  }

  const differences = values.slice(1).map((value, index) => value - values[index])
  if (differences.some((difference) => !isFiniteNumber(difference) || difference === 0)) {
    throw new TemperatureSliceValidationError(
      `${coordinateName} must be strictly monotonic for raster rendering.`,
    )
  }

  const ascending = differences.every((difference) => difference > 0)
  const descending = differences.every((difference) => difference < 0)
  if (!ascending && !descending) {
    throw new TemperatureSliceValidationError(
      `${coordinateName} is not monotonic; the source grid cannot be mapped safely to a raster.`,
    )
  }

  const spacing = median(differences)
  const maximumDeviation = Math.max(
    ...differences.map((difference) => Math.abs(difference - spacing)),
  )
  // NetCDF coordinates are commonly stored as single-precision values. A 0.1%
  // relative tolerance accepts unavoidable floating-point quantization while
  // rejecting genuinely irregular grids that a rectangular raster would warp.
  const spacingTolerance = Math.max(Math.abs(spacing) * 1e-3, 1e-12)
  if (maximumDeviation > spacingTolerance) {
    throw new TemperatureSliceValidationError(
      `${coordinateName} spacing is irregular; a regular raster would warp the source grid.`,
    )
  }

  return { ascending, spacing }
}

const calculateExtent = (
  latitudes: number[],
  longitudes: number[],
): {
  extent: GeographicExtent
  latitude: CoordinateAnalysis
  longitude: CoordinateAnalysis
} => {
  const latitude = analyzeCoordinates(latitudes, 'Latitude')
  const longitude = analyzeCoordinates(longitudes, 'Longitude')

  const southEdge = latitudes[0] - latitude.spacing / 2
  const northEdge = latitudes[latitudes.length - 1] + latitude.spacing / 2
  const westEdge = longitudes[0] - longitude.spacing / 2
  const eastEdge = longitudes[longitudes.length - 1] + longitude.spacing / 2

  const extent: GeographicExtent = {
    west: Math.min(westEdge, eastEdge),
    south: Math.min(southEdge, northEdge),
    east: Math.max(westEdge, eastEdge),
    north: Math.max(southEdge, northEdge),
  }

  if (
    !isFiniteNumber(extent.west) ||
    !isFiniteNumber(extent.south) ||
    !isFiniteNumber(extent.east) ||
    !isFiniteNumber(extent.north) ||
    extent.west >= extent.east ||
    extent.south >= extent.north
  ) {
    throw new TemperatureSliceValidationError('The derived raster extent is invalid.')
  }

  return { extent, latitude, longitude }
}

export const validateTemperatureSlice = (slice: TemperatureSlice): {
  extent: GeographicExtent
  latAscending: boolean
  lonAscending: boolean
} => {
  if (
    !Array.isArray(slice.dimension_order) ||
    slice.dimension_order.length !== 2 ||
    slice.dimension_order[0] !== 'latitude' ||
    slice.dimension_order[1] !== 'longitude'
  ) {
    throw new TemperatureSliceValidationError(
      'Unsupported temperature slice dimension order; expected latitude, longitude.',
    )
  }

  if (
    !Array.isArray(slice.slice_data) ||
    !Array.isArray(slice.lat_vals) ||
    !Array.isArray(slice.lon_vals)
  ) {
    throw new TemperatureSliceValidationError('Temperature slice arrays are missing.')
  }

  const rowCount = slice.slice_data.length
  const columnCount = slice.lon_vals.length
  if (rowCount === 0 || columnCount === 0) {
    throw new TemperatureSliceValidationError('The temperature grid is empty.', 'empty')
  }

  if (rowCount !== slice.lat_vals.length) {
    throw new TemperatureSliceValidationError(
      'Temperature rows do not match the latitude coordinate count.',
    )
  }

  if (slice.slice_data.some((row) => !Array.isArray(row) || row.length !== columnCount)) {
    throw new TemperatureSliceValidationError(
      'Temperature columns do not match the longitude coordinate count.',
    )
  }

  const finiteValues: number[] = []
  for (const row of slice.slice_data) {
    for (const value of row) {
      if (value === null) continue
      if (!isFiniteNumber(value)) {
        throw new TemperatureSliceValidationError(
          'The temperature grid contains a value that is neither a finite number nor null.',
        )
      }
      finiteValues.push(value)
    }
  }

  const totalCells = rowCount * columnCount
  if (slice.total_count !== totalCells) {
    throw new TemperatureSliceValidationError(
      'The reported total cell count does not match the grid.',
    )
  }

  if (slice.finite_count !== finiteValues.length) {
    throw new TemperatureSliceValidationError(
      'The reported valid cell count does not match the grid.',
    )
  }

  if (slice.missing_count !== totalCells - finiteValues.length) {
    throw new TemperatureSliceValidationError(
      'The reported missing cell count does not match the grid.',
    )
  }

  if (finiteValues.length === 0) {
    throw new TemperatureSliceValidationError(
      'No valid temperature cells are available in the selected slice.',
      'empty',
    )
  }

  const computedMin = Math.min(...finiteValues)
  const computedMax = Math.max(...finiteValues)
  const computedMean = finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length

  if (!isFiniteNumber(slice.tmin) || !isFiniteNumber(slice.tmax) || !isFiniteNumber(slice.tmean)) {
    throw new TemperatureSliceValidationError('Temperature statistics are missing or non-finite.')
  }

  const extremumTolerance = Math.max(1, Math.abs(computedMax)) * 1e-12
  const meanTolerance = Math.max(1, Math.abs(computedMean)) * 1e-6
  if (
    !nearlyEqual(slice.tmin, computedMin, extremumTolerance) ||
    !nearlyEqual(slice.tmax, computedMax, extremumTolerance) ||
    !nearlyEqual(slice.tmean, computedMean, meanTolerance)
  ) {
    throw new TemperatureSliceValidationError(
      'Temperature statistics do not match the supplied grid values.',
    )
  }

  if (slice.tmin > slice.tmax || slice.tmean < slice.tmin || slice.tmean > slice.tmax) {
    throw new TemperatureSliceValidationError('Temperature statistics are not internally consistent.')
  }

  if (!isFiniteNumber(slice.actual_depth)) {
    throw new TemperatureSliceValidationError('The selected depth is non-finite.')
  }

  if (typeof slice.actual_time !== 'string' || slice.actual_time.length === 0) {
    throw new TemperatureSliceValidationError('The selected time is missing.')
  }

  const { extent, latitude, longitude } = calculateExtent(slice.lat_vals, slice.lon_vals)
  return {
    extent,
    latAscending: latitude.ascending,
    lonAscending: longitude.ascending,
  }
}

export const temperatureRgba = (
  value: number | null,
  minimum: number,
  maximum: number,
): [number, number, number, number] => {
  if (value === null) return [0, 0, 0, 0]
  if (!isFiniteNumber(value) || !isFiniteNumber(minimum) || !isFiniteNumber(maximum)) {
    throw new TemperatureSliceValidationError('Cannot color a non-finite temperature value.')
  }

  const normalized =
    maximum === minimum
      ? 0.5
      : Math.min(1, Math.max(0, (value - minimum) / (maximum - minimum)))
  const scaledPosition = normalized * (cividisStops.length - 1)
  const lowerIndex = Math.min(
    cividisStops.length - 2,
    Math.max(0, Math.floor(scaledPosition)),
  )
  const upperIndex = lowerIndex + 1
  const fraction = scaledPosition - lowerIndex
  const lower = cividisStops[lowerIndex]
  const upper = cividisStops[upperIndex]

  return [
    Math.round(lower[0] + (upper[0] - lower[0]) * fraction),
    Math.round(lower[1] + (upper[1] - lower[1]) * fraction),
    Math.round(lower[2] + (upper[2] - lower[2]) * fraction),
    255,
  ]
}

export const getImageCoordinates = (
  latitudeIndex: number,
  longitudeIndex: number,
  latitudeCount: number,
  longitudeCount: number,
  latAscending: boolean,
  lonAscending: boolean,
): { x: number; y: number } => ({
  x: lonAscending ? longitudeIndex : longitudeCount - 1 - longitudeIndex,
  y: latAscending ? latitudeCount - 1 - latitudeIndex : latitudeIndex,
})

const createTemperatureDataUrl = (
  slice: TemperatureSlice,
  latAscending: boolean,
  lonAscending: boolean,
  colorScale: { min: number; max: number },
): string => {
  const canvas = document.createElement('canvas')
  const width = slice.lon_vals.length
  const height = slice.lat_vals.length
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new TemperatureSliceValidationError('The browser could not create a 2D raster context.')
  }

  const imageData = context.createImageData(width, height)
  for (let latitudeIndex = 0; latitudeIndex < slice.slice_data.length; latitudeIndex += 1) {
    const row = slice.slice_data[latitudeIndex]
    for (let longitudeIndex = 0; longitudeIndex < row.length; longitudeIndex += 1) {
      const [red, green, blue, alpha] = temperatureRgba(
        row[longitudeIndex],
        colorScale.min,
        colorScale.max,
      )
      const { x, y } = getImageCoordinates(
        latitudeIndex,
        longitudeIndex,
        height,
        width,
        latAscending,
        lonAscending,
      )
      const offset = (y * width + x) * 4
      imageData.data[offset] = red
      imageData.data[offset + 1] = green
      imageData.data[offset + 2] = blue
      imageData.data[offset + 3] = alpha
    }
  }

  context.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/png')
}

/**
 * Resolve the color range used for rasterization. Without an override the
 * slice's own range is used; with a fixed temporal scale the override must be
 * finite and ordered. DOM-free so it can be tested outside the browser.
 */
export const resolveColorScale = (
  slice: TemperatureSlice,
  colorScale?: { min: number; max: number },
): { min: number; max: number } => {
  if (colorScale === undefined) {
    return { min: slice.tmin, max: slice.tmax }
  }
  if (
    !isFiniteNumber(colorScale.min) ||
    !isFiniteNumber(colorScale.max) ||
    colorScale.min > colorScale.max
  ) {
    throw new TemperatureSliceValidationError(
      'The fixed temporal color scale is missing, non-finite, or inverted.',
    )
  }
  return colorScale
}

/**
 * Compute the fixed temporal color scale for one depth from the real
 * per-timestamp statistics: the minimum tmin and maximum tmax across all
 * timestamps. No data is modified; this only widens the color mapping.
 */
export const computeTemporalScale = (
  stats: Array<{ tmin: number; tmax: number }>,
): { min: number; max: number } => {
  if (stats.length === 0) {
    throw new TemperatureSliceValidationError(
      'Cannot compute a temporal color scale without any timestamps.',
    )
  }
  for (const stat of stats) {
    if (!isFiniteNumber(stat.tmin) || !isFiniteNumber(stat.tmax) || stat.tmin > stat.tmax) {
      throw new TemperatureSliceValidationError(
        'Per-timestamp statistics are non-finite or inverted; cannot compute a temporal scale.',
      )
    }
  }
  return {
    min: Math.min(...stats.map((s) => s.tmin)),
    max: Math.max(...stats.map((s) => s.tmax)),
  }
}

export const prepareTemperatureSlice = (
  slice: TemperatureSlice,
  colorScale?: { min: number; max: number },
): PreparedTemperatureSlice => {
  const validation = validateTemperatureSlice(slice)
  const resolvedScale = resolveColorScale(slice, colorScale)

  return {
    slice,
    extent: validation.extent,
    latAscending: validation.latAscending,
    lonAscending: validation.lonAscending,
    imageDataUrl: createTemperatureDataUrl(
      slice,
      validation.latAscending,
      validation.lonAscending,
      resolvedScale,
    ),
    colorScale: colorScale ?? null,
  }
}

export const cividisCssGradient = (): string =>
  `linear-gradient(to right, ${cividisStops
    .map(([red, green, blue]) => `rgb(${red}, ${green}, ${blue})`)
    .join(', ')})`

export const formatDisplayUnit = (sourceUnit: string): string =>
  sourceUnit === 'degrees_C' ? '°C' : sourceUnit

export const formatNumber = (value: number, fractionDigits = 3): string =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })

export const formatGridShape = (slice: TemperatureSlice): string =>
  `${slice.lat_vals.length} × ${slice.lon_vals.length}`

export const formatSelectedTime = (value: string): string => {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(:\d{2})?(?:\.\d+)?$/.exec(value)
  if (!match) return value
  const seconds = match[3] && match[3] !== ':00' ? match[3] : ''
  return `${match[1]} ${match[2]}${seconds}`
}
