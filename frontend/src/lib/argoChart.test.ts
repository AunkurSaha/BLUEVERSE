import {
  buildCollocationSeries,
  buildObservationSegments,
  buildProfileChartData,
  describeCollocationStatus,
  formatCelsius,
  formatDepthMeters,
  formatHours,
  formatKilometers,
  formatObservationTime,
} from './argoChart.ts'
import type { ArgoModelCollocation, ArgoProfileDetail, ArgoProfileLevel } from '../services/argoApi.ts'

const fail = (message: string): never => {
  throw new Error(message)
}

const assertEqual = <T>(actual: T, expected: T, label: string): void => {
  if (actual !== expected) fail(`${label}: expected ${expected}, got ${actual}`)
}

const assertTrue = (value: boolean, label: string): void => {
  if (!value) fail(label)
}

const makeLevel = (overrides: Partial<ArgoProfileLevel>): ArgoProfileLevel => ({
  level_index: 0,
  pressure_dbar: 10,
  depth_m: 10,
  in_situ_temperature_c: 28,
  potential_temperature_c: 28,
  practical_salinity: 34,
  pressure_qc: 1,
  temperature_qc: 1,
  salinity_qc: 1,
  usable: true,
  ...overrides,
})

const makeProfile = (levels: ArgoProfileLevel[]): ArgoProfileDetail => ({
  profile_id: '0000000-00',
  platform_number: '0000000',
  cycle_number: '0',
  observation_time: '2026-09-18T16:27:35',
  latitude: 16.5,
  longitude: 88.25,
  data_mode: 'A',
  direction: 'A',
  sampling_scheme: 'Primary sampling',
  level_count: levels.length,
  usable_level_count: levels.filter((l) => l.usable).length,
  pressure_min_dbar: null,
  pressure_max_dbar: null,
  depth_min_m: null,
  depth_max_m: null,
  temperature_min_c: null,
  temperature_max_c: null,
  salinity_min: null,
  salinity_max: null,
  pressure_source: 'PRES',
  temperature_source: 'TEMP_ADJUSTED',
  salinity_source: 'PSAL_ADJUSTED',
  provider: 'Argo GDAC / IFREMER',
  source_format: 'NetCDF',
  standard: 'Argo profile format',
  provenance: {},
  levels,
})

const makeCollocation = (overrides: Partial<ArgoModelCollocation>): ArgoModelCollocation => ({
  profile_id: '0000000-00',
  status: 'eligible',
  observation_time: '2026-09-18T16:27:35',
  model_time: '2026-09-18T18:00:00',
  time_difference_hours: 1.54,
  observation_latitude: 16.499,
  observation_longitude: 88.281,
  model_latitude: 16.5,
  model_longitude: 88.25,
  spatial_distance_km: 3.31,
  matched_pair_count: 2,
  bias_c: -0.3762,
  rmse_c: 0.6344,
  mae_c: 0.4841,
  residual_min_c: -1.3475,
  residual_max_c: 0.3305,
  pairs: [
    {
      model_depth_m: 21.6,
      observation_depth_m: 21.97,
      vertical_gap_m: 0.37,
      pressure_dbar: 22.1,
      observation_potential_temperature_c: 29.7,
      model_thetao_c: 28.52,
      residual_c: -1.18,
    },
    {
      model_depth_m: 6.44,
      observation_depth_m: 6.26,
      vertical_gap_m: 0.18,
      pressure_dbar: 6.3,
      observation_potential_temperature_c: 30.05,
      model_thetao_c: 29.89,
      residual_c: -0.16,
    },
  ],
  method: 'model-level-centric vertical matching',
  provenance: {},
  ...overrides,
})

// --- Observation segments: null gaps must break the curve, not connect across ---
{
  const profile = makeProfile([
    makeLevel({ level_index: 0, depth_m: 5, potential_temperature_c: 30 }),
    makeLevel({ level_index: 1, depth_m: 10, potential_temperature_c: null }),
    makeLevel({ level_index: 2, depth_m: 15, potential_temperature_c: 28 }),
    makeLevel({ level_index: 3, depth_m: null, potential_temperature_c: 27 }),
    makeLevel({ level_index: 4, depth_m: 20, potential_temperature_c: 26, usable: false }),
  ])
  const { segments, usableLevelCount } = buildObservationSegments(profile)
  assertEqual(usableLevelCount, 4, 'usable count')
  assertEqual(segments.length, 2, 'null values must split segments')
  assertEqual(segments[0].points.length, 1, 'first segment length')
  assertEqual(segments[1].points.length, 1, 'second segment length')
  assertEqual(segments[1].points[0].depth, 15, 'unusable levels are excluded')
}

// --- Collocation series: sorted by model depth, only for eligible results ---
{
  const series = buildCollocationSeries(makeCollocation({}))
  assertEqual(series.observation[0].points[0].depth, 6.26, 'pairs sorted shallowest first')
  assertEqual(series.model[0].points[1].temperature, 28.52, 'model thetao passthrough')

  const empty = buildCollocationSeries(makeCollocation({ status: 'no_vertical_overlap', pairs: [], matched_pair_count: 0 }))
  assertEqual(empty.observation.length, 0, 'no_vertical_overlap yields no observation series')
  assertEqual(empty.model.length, 0, 'no_vertical_overlap yields no model series')
}

// --- Chart data: ranges include matched model points ---
{
  const data = buildProfileChartData(
    makeProfile([makeLevel({ depth_m: 5, potential_temperature_c: 30 })]),
    makeCollocation({}),
  )
  assertEqual(data.depthMin, 5, 'depth min from observation')
  assertEqual(data.depthMax, 21.97, 'depth max includes matched pairs')
  assertEqual(data.tempMin, 28.52, 'temp min includes model thetao')
  assertEqual(data.model.length, 1, 'model series included when eligible')
}

// --- Null formatting: no fabricated zeros ---
{
  assertEqual(formatCelsius(null), 'Not available', 'null bias must not render as 0')
  assertEqual(formatCelsius(-0.2145), '-0.2145 °C', 'bias formatting')
  assertEqual(formatKilometers(3.31), '3.31 km', 'distance formatting')
  assertEqual(formatHours(1.54), '1.54 h', 'time difference formatting')
  assertEqual(formatDepthMeters(null), 'Not available', 'null depth')
  assertEqual(formatObservationTime('2026-09-18T16:27:35'), '2026-09-18 16:27 UTC', 'time formatting')
}

// --- Status descriptions ---
{
  assertEqual(
    describeCollocationStatus('no_vertical_overlap'),
    'No overlapping model depth range is available for this profile.',
    'no_vertical_overlap copy',
  )
  assertTrue(describeCollocationStatus('eligible').length > 0, 'eligible copy')
  assertTrue(
    describeCollocationStatus('some_future_status').includes('some_future_status'),
    'unknown status is surfaced, not hidden',
  )
}

console.log('argoChart tests passed')
