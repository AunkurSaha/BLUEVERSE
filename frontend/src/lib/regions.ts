import type { ProbeLocation } from './oceanProbe'
import type { RegionBounds, RegionDetail, RegionSummary } from '../services/regionApi'

export const DEFAULT_REGION_ID = 'bay-of-bengal'

export const isValidRegionBounds = (bounds: RegionBounds): boolean =>
  Number.isFinite(bounds.west) &&
  Number.isFinite(bounds.south) &&
  Number.isFinite(bounds.east) &&
  Number.isFinite(bounds.north) &&
  bounds.west >= -180 &&
  bounds.east <= 180 &&
  bounds.south >= -90 &&
  bounds.north <= 90 &&
  bounds.west < bounds.east &&
  bounds.south < bounds.north

export const isValidCameraPreset = (region: RegionSummary): boolean =>
  Number.isFinite(region.camera.longitude) &&
  Number.isFinite(region.camera.latitude) &&
  Number.isFinite(region.camera.height) &&
  Number.isFinite(region.camera.heading) &&
  Number.isFinite(region.camera.pitch) &&
  region.camera.longitude >= -180 &&
  region.camera.longitude <= 180 &&
  region.camera.latitude >= -90 &&
  region.camera.latitude <= 90 &&
  region.camera.height > 0 &&
  region.camera.pitch >= -90 &&
  region.camera.pitch <= 0

export const regionContainsLocation = (region: RegionSummary, location: ProbeLocation): boolean =>
  location.longitude >= region.bounds.west &&
  location.longitude <= region.bounds.east &&
  location.latitude >= region.bounds.south &&
  location.latitude <= region.bounds.north

export const hasRegisteredModelCoverage = (
  region: RegionDetail,
  location: ProbeLocation,
): boolean =>
  region.data_status === 'DATA_BACKED' &&
  region.model_datasets.length > 0 &&
  region.model_datasets.some((dataset) => {
    const bounds = dataset.bounds ?? region.bounds
    return location.longitude >= bounds.west &&
      location.longitude <= bounds.east &&
      location.latitude >= bounds.south &&
      location.latitude <= bounds.north
  })

export const datasetDisplayName = (datasetId: string | null, region: RegionDetail | null): string => {
  if (!datasetId) return 'None selected'
  const association = region?.model_datasets.find((dataset) => dataset.id === datasetId)
  if (association) return `${region?.name ?? ''} ${association.label}`.trim()
  return datasetId
    .split('-')
    .map((part, index) => index > 0 && part === 'of' ? part : `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

export type ScientificVariable = 'thetao' | 'so' | 'currents'

export interface CurrentDatasetPair {
  u: string
  v: string
}

export const currentDatasetsForRegion = (
  region: RegionDetail | null,
): CurrentDatasetPair | null => {
  if (!region || region.data_status !== 'DATA_BACKED') return null
  const u = region.model_datasets.find((dataset) => dataset.variable === 'uo')
  const v = region.model_datasets.find((dataset) => dataset.variable === 'vo')
  return u && v && u.id !== v.id ? { u: u.id, v: v.id } : null
}

export const datasetForVariable = (
  region: RegionDetail | null,
  variable: ScientificVariable,
): string | null => {
  if (!region || region.data_status !== 'DATA_BACKED') return null
  if (variable === 'currents') {
    return currentDatasetsForRegion(region)?.u ?? null
  }
  return region.model_datasets.find((dataset) => dataset.variable === variable)?.id ?? null
}

export const variableAvailableInRegion = (
  region: RegionDetail | null,
  variable: ScientificVariable,
): boolean => datasetForVariable(region, variable) !== null

export const canActivateScientificRequest = (
  generation: number,
  activeGeneration: number,
  aborted: boolean,
): boolean => !aborted && generation === activeGeneration
