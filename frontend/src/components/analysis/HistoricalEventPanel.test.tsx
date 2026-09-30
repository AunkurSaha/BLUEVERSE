import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import HistoricalEventPanel from './HistoricalEventPanel'
import type { HistoricalEventDetail, HistoricalEventSummary, HistoricalEventTrack } from '../../services/eventApi'
import type { HistoricalOceanConfiguration } from '../../services/historicalOceanApi'

const assertIncludes = (value: string, expected: string) => {
  if (!value.includes(expected)) throw new Error(`Expected rendered panel to include: ${expected}`)
}

const summary: HistoricalEventSummary = {
  id: 'cyclone-amphan-2020',
  name: 'Cyclone Amphan',
  event_type: 'tropical_cyclone',
  basin: 'North Indian',
  region_id: 'bay-of-bengal',
  start_time: '2020-05-16T00:00:00Z',
  end_time: '2020-05-21T12:00:00Z',
  source: 'NOAA IBTrACS v04r01',
  source_event_id: '2020136N10088',
  agency: 'RSMC New Delhi (IMD)',
  status: 'historical',
  supported_analysis: ['track'],
  provenance: 'Test fixture derived from the event API contract.',
}

const detailWithoutCapability: HistoricalEventDetail = {
  ...summary,
  track_point_count: 1,
  track_bounds: { west: 87, south: 10, east: 87, north: 10 },
  duration_hours: 0,
  maximum_wind: 25,
  minimum_pressure: 1000,
  units: { latitude: 'degrees_north', longitude: 'degrees_east', wind: 'kts', pressure: 'mb' },
  source_series: 'NEWDELHI_*',
  source_url: 'https://example.test/ibtracs.csv',
  retrieval_date: '2026-09-30',
}

const track: HistoricalEventTrack = {
  event_id: summary.id,
  source: summary.source,
  source_event_id: summary.source_event_id,
  agency: summary.agency,
  source_series: 'NEWDELHI_*',
  source_url: 'https://example.test/ibtracs.csv',
  source_file: 'ibtracs.csv',
  source_sha256: 'fixture',
  retrieval_date: '2026-09-30',
  units: detailWithoutCapability.units,
  status_field: 'NEWDELHI_GRADE',
  point_count: 1,
  bounds: detailWithoutCapability.track_bounds,
  duration_hours: 0,
  maximum_wind: 25,
  minimum_pressure: 1000,
  points: [{ time: summary.start_time, latitude: 10, longitude: 87, wind: 25, pressure: 1000, status: 'D', agency: summary.agency }],
}

const configuration: HistoricalOceanConfiguration = {
  event_id: summary.id,
  product_id: 'GLOBAL_MULTIYEAR_PHY_001_030',
  dataset_id: 'cmems_mod_glo_phy_my_0.083deg_P1D-m',
  model: 'GLORYS12V1',
  provider: 'Mercator Ocean International',
  classification: 'Reanalysis',
  historical_time_window: '13-24 May 2020',
  dataset_ids: {
    thetao: 'amphan-2020-temperature',
    so: 'amphan-2020-salinity',
    uo: 'amphan-2020-uo',
    vo: 'amphan-2020-vo',
  },
  analysis_windows: [
    { id: 'before', label: 'Before', dates: ['2020-05-13', '2020-05-14', '2020-05-15'], sample_count: 3 },
    { id: 'during', label: 'During', dates: ['2020-05-16', '2020-05-17', '2020-05-18', '2020-05-19', '2020-05-20', '2020-05-21'], sample_count: 6 },
    { id: 'after', label: 'After', dates: ['2020-05-22', '2020-05-23', '2020-05-24'], sample_count: 3 },
  ],
}

const noop = () => undefined
const baseProps: ComponentProps<typeof HistoricalEventPanel> = {
  events: [summary],
  selectedEventId: summary.id,
  detail: detailWithoutCapability,
  track,
  visible: false,
  selectedPointIndex: 0,
  analysisContext: 'current',
  analysisMode: 'daily',
  historicalVariable: 'thetao',
  historicalPhase: 'before',
  historicalComparison: 'during-before',
  configuration: null,
  configurationLoading: false,
  configurationError: null,
  historicalTimeValues: [],
  historicalTimeIndex: 0,
  historicalOceanTime: null,
  currentOperationalModelTime: null,
  differenceSummary: null,
  oceanLoading: false,
  oceanError: null,
  loading: false,
  error: null,
  onEventSelect: noop,
  onVisibilityChange: noop,
  onPointSelect: noop,
  onRetry: noop,
  onEnterHistoricalOcean: noop,
  onReturnToCurrentOcean: noop,
  onAnalysisModeChange: noop,
  onHistoricalVariableChange: noop,
  onHistoricalPhaseChange: noop,
  onHistoricalComparisonChange: noop,
  onHistoricalTimeChange: noop,
  onInspectTrackPoint: noop,
}

const render = (overrides: Partial<ComponentProps<typeof HistoricalEventPanel>> = {}) =>
  renderToStaticMarkup(<HistoricalEventPanel {...baseProps} {...overrides} />)

const missingMetadata = render()
assertIncludes(missingMetadata, 'Historical ocean data is not available for this event.')
assertIncludes(missingMetadata, 'Historical Ocean Unavailable')
assertIncludes(missingMetadata, 'disabled=""')

const loading = render({ detail: undefined, track: undefined, loading: true })
assertIncludes(loading, 'Loading historical event')

const listBeforeDetail = render({ events: [summary], detail: undefined, track: undefined, loading: true })
assertIncludes(listBeforeDetail, 'Cyclone Amphan (2020)')

const available = render({
  detail: { ...detailWithoutCapability, historical_ocean_data: { status: 'AVAILABLE', variables: ['Temperature'], dataset_ids: ['amphan-2020-temperature'] } },
  configuration,
})
assertIncludes(available, '>Available</p>')
assertIncludes(available, 'Explore Historical Ocean')
const availableLabelIndex = available.indexOf('Explore Historical Ocean')
const availableButtonStart = available.lastIndexOf('<button', availableLabelIndex)
const availableButtonOpenEnd = available.indexOf('>', availableButtonStart)
const availableButtonOpeningTag = available.slice(availableButtonStart, availableButtonOpenEnd)
if (availableButtonStart < 0 || /\sdisabled=/.test(availableButtonOpeningTag)) throw new Error(`Available historical exploration must render an enabled button. Received: ${availableButtonOpeningTag}`)

const unavailable = render({
  detail: { ...detailWithoutCapability, historical_ocean_data: { status: 'UNAVAILABLE', variables: [], dataset_ids: [] } },
})
assertIncludes(unavailable, 'Historical ocean data is not available for this event.')
assertIncludes(unavailable, 'Historical Ocean Unavailable')
assertIncludes(unavailable, 'disabled=""')

const capabilityError = render({ configurationError: 'Unable to load historical ocean configuration' })
assertIncludes(capabilityError, 'Historical ocean availability could not be checked.')
assertIncludes(capabilityError, 'Retry Availability Check')
assertIncludes(capabilityError, 'Unable to load historical ocean configuration')

const requestError = render({ detail: undefined, track: undefined, error: 'Historical availability request timed out.' })
assertIncludes(requestError, 'Historical ocean availability could not be checked.')
assertIncludes(requestError, '>Retry</button>')

const empty = render({ events: undefined, selectedEventId: '', detail: undefined, track: undefined })
assertIncludes(empty, 'No events loaded')

const phaseMean = render({ analysisContext: 'historical-event', analysisMode: 'phase_mean', historicalPhase: 'after', configuration })
assertIncludes(phaseMean, 'After Phase Mean')
assertIncludes(phaseMean, '22–24 May 2020')
assertIncludes(phaseMean, '13–15 May')
assertIncludes(phaseMean, '16–21 May')
assertIncludes(phaseMean, 'n=6')
assertIncludes(phaseMean, 'Selected Cyclone Track Point')
assertIncludes(phaseMean, '2020-05-16 00:00 UTC')
assertIncludes(phaseMean, 'not an exact temporal match')
const difference = render({ analysisContext: 'historical-event', analysisMode: 'difference', historicalComparison: 'after-before', configuration })
assertIncludes(difference, 'After · 22–24 May 2020 − Before · 13–15 May 2020 (phase means)')

console.log('historical event panel runtime-state tests passed')
