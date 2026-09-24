import React, { useEffect, useState } from 'react'
import AppHeader from './components/layout/AppHeader'
import LeftSidebar from './components/layout/LeftSidebar'
import RightInspector from './components/layout/RightInspector'
import BottomTimeline from './components/layout/BottomTimeline'
import OceanGlobe from './components/globe/OceanGlobe'
import {
  fetchDatasetMetadata,
  fetchDatasets,
  fetchHealth,
  type BackendStatus,
  type DatasetMetadata,
} from './services/api'

const App: React.FC = () => {
  const [datasets, setDatasets] = useState<string[]>([])
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null)
  const [datasetMetadata, setDatasetMetadata] = useState<DatasetMetadata | null>(null)
  const [datasetsLoading, setDatasetsLoading] = useState(true)
  const [datasetsError, setDatasetsError] = useState<string | null>(null)
  const [metadataLoading, setMetadataLoading] = useState(false)
  const [metadataError, setMetadataError] = useState<string | null>(null)
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking')

  useEffect(() => {
    const controller = new AbortController()

    const loadBackendState = async () => {
      try {
        const [health, availableDatasets] = await Promise.all([
          fetchHealth(controller.signal),
          fetchDatasets(controller.signal),
        ])

        setDatasets(availableDatasets)
        setSelectedDataset((current) => current ?? availableDatasets[0] ?? null)
        setBackendStatus(health.status.toLowerCase() === 'ok' ? 'online' : 'offline')
        setDatasetsError(null)
      } catch (error) {
        if (controller.signal.aborted) return

        setBackendStatus('offline')
        setDatasetsError(error instanceof Error ? error.message : 'Unable to load datasets')
      } finally {
        if (!controller.signal.aborted) {
          setDatasetsLoading(false)
        }
      }
    }

    loadBackendState()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!selectedDataset) {
      setDatasetMetadata(null)
      setMetadataLoading(false)
      setMetadataError(null)
      return
    }

    const controller = new AbortController()
    setMetadataLoading(true)
    setMetadataError(null)

    const loadMetadata = async () => {
      try {
        const data = await fetchDatasetMetadata(selectedDataset, controller.signal)
        if (controller.signal.aborted) return

        setDatasetMetadata(data)
      } catch (error) {
        if (controller.signal.aborted) return

        setDatasetMetadata(null)
        setMetadataError(error instanceof Error ? error.message : 'Unable to load metadata')
      } finally {
        if (!controller.signal.aborted) {
          setMetadataLoading(false)
        }
      }
    }

    loadMetadata()
    return () => controller.abort()
  }, [selectedDataset])

  return (
    <div className="flex h-dvh min-h-dvh w-full min-w-0 flex-col overflow-hidden bg-[#050b14]">
      <AppHeader backendStatus={backendStatus} selectedDataset={selectedDataset} />
      <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 lg:grid lg:grid-cols-[272px_minmax(0,1fr)_340px] lg:gap-4 lg:overflow-hidden lg:p-4">
        <LeftSidebar
          datasets={datasets}
          selectedDataset={selectedDataset}
          onDatasetSelect={setSelectedDataset}
          isLoading={datasetsLoading}
          error={datasetsError}
        />
        <section
          aria-label="Cesium globe viewport"
          className="relative min-h-[60vh] flex-1 overflow-hidden rounded-lg border border-white/10 bg-[#02060d] lg:min-h-0"
        >
          <OceanGlobe />
        </section>
        <RightInspector
          dataset={selectedDataset}
          metadata={datasetMetadata}
          isLoading={metadataLoading}
          error={metadataError}
        />
      </main>
      <BottomTimeline />
    </div>
  )
}

export default App
