import { fetchDatasetMetadata, fetchDatasets, fetchTemperatureSlice } from './api'

export const datasetService = {
  listDatasets: fetchDatasets,
  getDatasetMetadata: fetchDatasetMetadata,
  getSlice: fetchTemperatureSlice,
}
