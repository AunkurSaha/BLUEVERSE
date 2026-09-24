export const datasetService = {
  async listDatasets(): Promise<string[]> {
    const response = await fetch('/api/datasets');
    if (!response.ok) {
      throw new Error(`Failed to fetch datasets: ${response.status}`);
    }
    return response.json();
  },

  async getDatasetMetadata(datasetId: string): Promise<any> {
    const response = await fetch(`/api/datasets/${datasetId}/metadata`);
    if (!response.ok) {
      throw new Error(`Failed to fetch dataset metadata: ${response.status}`);
    }
    return response.json();
  },

  async getSlice(datasetId: string, variable: string, timeIndex: number, depthIndex: number): Promise<any> {
    const response = await fetch(`/api/datasets/${datasetId}/slice?variable=${variable}&time_index=${timeIndex}&depth_index=${depthIndex}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch slice: ${response.status}`);
    }
    return response.json();
  }
};
