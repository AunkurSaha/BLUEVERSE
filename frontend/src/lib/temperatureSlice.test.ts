import {
  computeTemporalScale,
  formatSelectedTime,
  getImageCoordinates,
  resolveColorScale,
  temperatureRgba,
  validateTemperatureSlice,
  type TemperatureSlice,
} from './temperatureSlice.ts'

const fail = (message: string): never => {
  throw new Error(message)
}

const assertEqual = <T>(actual: T, expected: T, label: string): void => {
  if (!Object.is(actual, expected)) {
    fail(`${label}: expected ${String(expected)}, received ${String(actual)}`)
  }
}

const assertDeepEqual = <T>(actual: T, expected: T, label: string): void => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`)
  }
}

const assertThrows = (callback: () => void, pattern: RegExp, label: string): void => {
  try {
    callback()
  } catch (error) {
    if (error instanceof Error && pattern.test(error.message)) return
    fail(`${label}: wrong error: ${error instanceof Error ? error.message : String(error)}`)
  }
  fail(`${label}: expected an error`)
}

const createSlice = (): TemperatureSlice => ({
  slice_data: [
    [1, null],
    [3, 2],
  ],
  dimension_order: ['latitude', 'longitude'],
  time_coord_name: 'time',
  depth_coord_name: 'depth',
  lat_coord_name: 'latitude',
  lon_coord_name: 'longitude',
  actual_time: '2026-09-21T00:00:00.000000000',
  actual_depth: 0.5,
  lat_vals: [15, 16],
  lon_vals: [85, 86],
  var_standard_name: 'sea_water_potential_temperature',
  var_long_name: 'Temperature',
  var_units: 'degrees_C',
  depth_units: 'm',
  lat_units: 'degrees_north',
  lon_units: 'degrees_east',
  finite_count: 3,
  total_count: 4,
  missing_count: 1,
  tmin: 1,
  tmax: 3,
  tmean: 2,
  var_name: 'thetao',
})

const withDimensionOrder = (dimensionOrder: unknown): TemperatureSlice =>
  ({ ...createSlice(), dimension_order: dimensionOrder }) as TemperatureSlice

const validated = validateTemperatureSlice(createSlice())
assertDeepEqual(
  validated.extent,
  { west: 84.5, south: 14.5, east: 86.5, north: 16.5 },
  'ascending extent',
)
assertEqual(validated.latAscending, true, 'ascending latitude')
assertEqual(validated.lonAscending, true, 'ascending longitude')

const descending = createSlice()
descending.lat_vals = [16, 15]
descending.lon_vals = [86, 85]
descending.slice_data = [
  [1, 3],
  [null, 2],
]
const descendingValidation = validateTemperatureSlice(descending)
assertDeepEqual(
  descendingValidation.extent,
  { west: 84.5, south: 14.5, east: 86.5, north: 16.5 },
  'descending extent',
)
assertEqual(descendingValidation.latAscending, false, 'descending latitude')
assertEqual(descendingValidation.lonAscending, false, 'descending longitude')

assertDeepEqual(
  getImageCoordinates(0, 0, 2, 2, true, true),
  { x: 0, y: 1 },
  'ascending image mapping',
)
assertDeepEqual(
  getImageCoordinates(0, 0, 2, 2, false, false),
  { x: 1, y: 0 },
  'descending image mapping',
)
assertDeepEqual(temperatureRgba(null, 1, 3), [0, 0, 0, 0], 'null transparency')
assertEqual(temperatureRgba(1, 1, 3)[3], 255, 'minimum alpha')
assertEqual(temperatureRgba(3, 1, 3)[3], 255, 'maximum alpha')

const mismatchedRows = createSlice()
mismatchedRows.lat_vals = [15, 16, 17]
assertThrows(
  () => validateTemperatureSlice(mismatchedRows),
  /rows do not match/,
  'mismatched rows',
)

const unsupportedDimensionOrder = createSlice()
unsupportedDimensionOrder.dimension_order =
  ['longitude', 'latitude'] as unknown as TemperatureSlice['dimension_order']
assertThrows(
  () => validateTemperatureSlice(unsupportedDimensionOrder),
  /dimension order/,
  'unsupported dimension order',
)

assertThrows(
  () => validateTemperatureSlice(withDimensionOrder(undefined)),
  /dimension order/,
  'missing dimension order',
)

assertThrows(
  () => validateTemperatureSlice(withDimensionOrder(['latitude', 'lat'])),
  /dimension order/,
  'malformed dimension values',
)

const irregular = createSlice()
irregular.lat_vals = [15, 16, 18]
irregular.slice_data = [
  [1, null],
  [3, 2],
  [2, 2],
]
irregular.total_count = 6
irregular.finite_count = 5
irregular.missing_count = 1
irregular.tmin = 1
irregular.tmax = 3
irregular.tmean = 2
assertThrows(
  () => validateTemperatureSlice(irregular),
  /irregular/,
  'irregular latitude',
)

// --- Fixed temporal color scale -------------------------------------------

// Default behavior: no override resolves to the slice's own range.
assertDeepEqual(
  resolveColorScale(createSlice()),
  { min: 1, max: 3 },
  'resolveColorScale without override',
)

// A wider fixed temporal scale is accepted unchanged.
assertDeepEqual(
  resolveColorScale(createSlice(), { min: 0, max: 4 }),
  { min: 0, max: 4 },
  'resolveColorScale with fixed temporal scale',
)

// A constant scale (min === max) is valid; temperatureRgba maps it to 0.5.
assertDeepEqual(
  resolveColorScale(createSlice(), { min: 2, max: 2 }),
  { min: 2, max: 2 },
  'resolveColorScale constant scale',
)

assertThrows(
  () => resolveColorScale(createSlice(), { min: 3, max: 1 }),
  /inverted/,
  'inverted fixed scale rejected',
)
assertThrows(
  () => resolveColorScale(createSlice(), { min: Number.NaN, max: 3 }),
  /non-finite/,
  'non-finite fixed scale rejected',
)

// Identical values map to identical colors under a fixed scale, and the same
// value keeps its color regardless of the per-slice range it came from.
const fixedScale = { min: 0, max: 4 }
assertDeepEqual(
  temperatureRgba(2, fixedScale.min, fixedScale.max),
  temperatureRgba(2, fixedScale.min, fixedScale.max),
  'fixed scale deterministic coloring',
)
// Value 3 is the per-slice maximum of (1,3) but only 75% up the fixed (0,4)
// scale, so the two normalizations must produce different colors.
const sliceAColor = temperatureRgba(3, 1, 3)
const sliceAFixedColor = temperatureRgba(3, fixedScale.min, fixedScale.max)
if (JSON.stringify(sliceAColor) === JSON.stringify(sliceAFixedColor)) {
  fail('fixed scale coloring: fixed scale should differ from per-slice scale here')
}

// Values outside a wider fixed scale clamp instead of wrapping.
assertDeepEqual(
  temperatureRgba(10, 0, 4),
  temperatureRgba(4, 0, 4),
  'fixed scale clamps high values',
)
assertDeepEqual(
  temperatureRgba(-10, 0, 4),
  temperatureRgba(0, 0, 4),
  'fixed scale clamps low values',
)

// --- Temporal scale aggregation -------------------------------------------

assertDeepEqual(
  computeTemporalScale([
    { tmin: 25.677, tmax: 31.07 },
    { tmin: 25.672, tmax: 31.1 },
  ]),
  { min: 25.672, max: 31.1 },
  'temporal scale is min of tmin and max of tmax',
)

assertDeepEqual(
  computeTemporalScale([{ tmin: 20, tmax: 30 }]),
  { min: 20, max: 30 },
  'temporal scale with a single timestamp',
)

assertThrows(() => computeTemporalScale([]), /without any timestamps/, 'empty temporal scale')
assertThrows(
  () => computeTemporalScale([{ tmin: Number.NaN, tmax: 30 }]),
  /non-finite/,
  'non-finite temporal stats rejected',
)
assertThrows(
  () => computeTemporalScale([{ tmin: 31, tmax: 30 }]),
  /inverted/,
  'inverted temporal stats rejected',
)

// --- Timestamp formatting ---------------------------------------------------

assertEqual(
  formatSelectedTime('2026-09-21T00:00:00.000000000'),
  '2026-09-21 00:00',
  'nanosecond timestamp formatting',
)
assertEqual(
  formatSelectedTime('2026-09-21T06:30:00'),
  '2026-09-21 06:30',
  'minute-precision timestamp formatting',
)
assertEqual(
  formatSelectedTime('2026-09-21T06:30:45'),
  '2026-09-21 06:30:45',
  'nonzero seconds retained',
)
assertEqual(formatSelectedTime('not a timestamp'), 'not a timestamp', 'unparseable passthrough')

console.log('temperatureSlice scientific transform tests passed')
