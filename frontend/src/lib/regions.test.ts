import {
  canActivateScientificRequest,
  currentDatasetsForRegion,
  datasetDisplayName,
  datasetForVariable,
  hasRegisteredModelCoverage,
  isValidCameraPreset,
  isValidRegionBounds,
  regionContainsLocation,
} from './regions.ts'
import type { RegionDetail } from '../services/regionApi.ts'

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message)
}

const bay: RegionDetail = {
  id: 'bay-of-bengal',
  name: 'Bay of Bengal',
  short_name: 'Bay of Bengal',
  description: 'Registered region',
  data_status: 'DATA_BACKED',
  bounds: { west: 80, south: 5, east: 100, north: 22 },
  camera: { longitude: 90, latitude: 13.5, height: 3_000_000, heading: 0, pitch: -90 },
  model_datasets: [
    { id: 'bay-of-bengal-temperature', label: 'Temperature', variable: 'thetao', bounds: null, time_coverage: null, depth_coverage: null },
    { id: 'bay-of-bengal-salinity', label: 'Salinity', variable: 'so', bounds: null, time_coverage: null, depth_coverage: null },
    { id: 'bay-of-bengal-uo', label: 'Eastward current', variable: 'uo', bounds: null, time_coverage: null, depth_coverage: null },
    { id: 'bay-of-bengal-vo', label: 'Northward current', variable: 'vo', bounds: null, time_coverage: null, depth_coverage: null },
  ],
  observation_sources: ['ARGO', 'Spray Glider'],
  supported_variables: ['Temperature', 'Salinity', 'Currents'],
  analysis_capabilities: ['Ocean Probe'],
  time_coverage: null,
  notes: [],
}

const arabian: RegionDetail = {
  ...bay,
  id: 'arabian-sea',
  name: 'Arabian Sea',
  short_name: 'Arabian Sea',
  data_status: 'DATA_BACKED',
  bounds: { west: 50, south: 5, east: 78, north: 25 },
  camera: { longitude: 64, latitude: 15, height: 4_200_000, heading: 0, pitch: -90 },
  model_datasets: [
    { id: 'arabian-sea-temperature', label: 'Temperature', variable: 'thetao', bounds: { west: 50, south: 5, east: 78, north: 25 }, time_coverage: '2026-09-21 00:00 UTC to 2026-09-22 18:00 UTC', depth_coverage: '0.494 m to 453.938 m' },
    { id: 'arabian-sea-salinity', label: 'Salinity', variable: 'so', bounds: { west: 50, south: 5, east: 78, north: 25 }, time_coverage: '2026-09-21 00:00 UTC to 2026-09-22 18:00 UTC', depth_coverage: '0.494 m to 453.938 m' },
    { id: 'arabian-sea-uo', label: 'Eastward current', variable: 'uo', bounds: { west: 50, south: 5, east: 78, north: 25 }, time_coverage: '2026-09-21 00:00 UTC to 2026-09-22 18:00 UTC', depth_coverage: '0.494 m to 453.938 m' },
    { id: 'arabian-sea-vo', label: 'Northward current', variable: 'vo', bounds: { west: 50, south: 5, east: 78, north: 25 }, time_coverage: '2026-09-21 00:00 UTC to 2026-09-22 18:00 UTC', depth_coverage: '0.494 m to 453.938 m' },
  ],
  observation_sources: [],
  supported_variables: ['Temperature', 'Salinity', 'Currents'],
  analysis_capabilities: ['Ocean Probe', 'Depth exploration', 'Time playback', 'Temperature 3D', 'Temperature Isosurface', 'Temperature Transect'],
}

const navigationOnly: RegionDetail = {
  ...arabian,
  id: 'equatorial-indian-ocean',
  data_status: 'NAVIGATION_ONLY',
  model_datasets: [],
  supported_variables: [],
  analysis_capabilities: [],
}

assert(isValidRegionBounds(bay.bounds), 'Bay of Bengal bounds must be valid.')
assert(isValidCameraPreset(bay) && isValidCameraPreset(arabian), 'Camera presets must be valid.')
assert(regionContainsLocation(bay, { latitude: 13, longitude: 90 }), 'Bay point must be inside Bay bounds.')
assert(!regionContainsLocation(bay, { latitude: 15, longitude: 64 }), 'Arabian point must not be inside Bay bounds.')
assert(hasRegisteredModelCoverage(bay, { latitude: 13, longitude: 90 }), 'Registered Bay coverage must be available.')
assert(hasRegisteredModelCoverage(arabian, { latitude: 15, longitude: 64 }), 'Arabian Sea coverage must follow its registered dataset bounds.')
assert(!hasRegisteredModelCoverage(navigationOnly, { latitude: 0, longitude: 70 }), 'Navigation presets must not claim model coverage.')
assert(datasetDisplayName('bay-of-bengal-temperature', bay) === 'Bay of Bengal Temperature', 'Viewed region and active dataset labels must remain distinct.')
assert(datasetDisplayName('arabian-sea-temperature', arabian) === 'Arabian Sea Temperature', 'Arabian dataset labels must use the selected region association.')
assert(datasetForVariable(bay, 'thetao') === 'bay-of-bengal-temperature', 'Temperature resolves through the region association.')
assert(datasetForVariable(bay, 'so') === 'bay-of-bengal-salinity', 'Bay salinity keeps its own region association.')
assert(datasetForVariable(bay, 'currents') === 'bay-of-bengal-uo', 'Bay currents resolve through the Bay U association.')
assert(datasetForVariable(arabian, 'thetao') === 'arabian-sea-temperature', 'Arabian Sea temperature resolves through its own association.')
assert(datasetForVariable(arabian, 'so') === 'arabian-sea-salinity', 'Arabian Sea salinity resolves through its own association.')
assert(datasetForVariable(arabian, 'currents') === 'arabian-sea-uo', 'Arabian Sea currents resolve through its own U association.')
const arabianCurrents = currentDatasetsForRegion(arabian)
assert(arabianCurrents?.u === 'arabian-sea-uo' && arabianCurrents.v === 'arabian-sea-vo', 'Arabian current components resolve to distinct region datasets.')
assert(arabian.observation_sources.length === 0, 'Arabian Sea inherits no Bay observation source.')
assert(datasetForVariable(navigationOnly, 'thetao') === null, 'Navigation-only regions expose no model dataset.')
assert(canActivateScientificRequest(7, 7, false), 'Current scientific request may activate.')
assert(!canActivateScientificRequest(6, 7, false) && !canActivateScientificRequest(7, 7, true), 'Stale or aborted scientific requests cannot activate.')

console.log('region registry tests passed')
