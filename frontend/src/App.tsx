import React, { useEffect, useState, useRef } from 'react'
import AppHeader from './components/layout/AppHeader'
import LeftSidebar from './components/layout/LeftSidebar'
import RightInspector from './components/layout/RightInspector'
import BottomTimeline from './components/layout/BottomTimeline'
import OceanGlobe from './components/globe/OceanGlobe'
import TemperatureLayerStatus from './components/globe/TemperatureLayerStatus'
import TemperatureLegend from './components/globe/TemperatureLegend'
import {
  fetchTemperatureSlice,
  fetchDatasetMetadata,
  fetchDatasets,
  fetchHealth,
  type BackendStatus,
  type DatasetMetadata,
} from './services/api'
import {
  prepareTemperatureSlice,
  TemperatureSliceValidationError,
  type PreparedTemperatureSlice,
} from './lib/temperatureSlice'

const App: React.FC = () => {
  const [datasets, setDatasets] = useState<string[]>([])
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null)
  const [datasetMetadata, setDatasetMetadata] = useState<DatasetMetadata | null>(null)
  const [datasetsLoading, setDatasetsLoading] = useState(true)
  const [datasetsError, setDatasetsError] = useState<string | null>(null)
  const [metadataLoading, setMetadataLoading] = useState(false)
  const [metadataError, setMetadataError] = useState<string | null>(null)
  const [temperatureLayer, setTemperatureLayer] = useState<PreparedTemperatureSlice | null>(null)
  const [sliceLoading, setSliceLoading] = useState(false)
  const [sliceError, setSliceError] = useState<string | null>(null)
  const [sliceIsEmpty, setSliceIsEmpty] = useState(false)
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking')
  const [selectedDepthIndex, setSelectedDepthIndex] = useState(0)

  // Cache for temperature slices keyed by datasetId-variable-timeIndex-depthIndex
  const sliceCacheRef = useRef<Map<string, PreparedTemperatureSlice>>(new Map())

  // Reset depth index when dataset changes
  useEffect(() => {
    if (selectedDataset) {
      setSelectedDepthIndex(0)
    }
  }, [selectedDataset])

  const temperatureSliceSelection = React.useMemo(() => ({
    variable: 'thetao',
    timeIndex: 0,
    depthIndex: selectedDepthIndex,
  }), [selectedDepthIndex])

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

  useEffect(() => {
    if (!selectedDataset) {
      setTemperatureLayer(null)
      setSliceLoading(false)
      setSliceError(null)
      setSliceIsEmpty(false)
      return
    }

    // Check cache first
    const cacheKey = `${selectedDataset}-thetao-0-${selectedDepthIndex}`
    const cachedSlice = sliceCacheRef.current.get(cacheKey)
    if (cachedSlice) {
      setTemperatureLayer(cachedSlice)
      setSliceLoading(false)
      setSliceError(null)
      setSliceIsEmpty(false)
      return
    }

    const controller = new AbortController()
    setTemperatureLayer(null)
    setSliceLoading(true)
    setSliceError(null)
    setSliceIsEmpty(false)

    const loadTemperatureSlice = async () => {
      try {
        // Validate depth index using metadata (if available)
        if (datasetMetadata) {
          const depthCount = datasetMetadata.dimensions[datasetMetadata.vertical_coordinate ?? 'depth'] ?? 0
          if (selectedDepthIndex < 0 || selectedDepthIndex >= depthCount) {
            throw new Error(`Depth index ${selectedDepthIndex} is out of range. Valid range is 0 to ${depthCount - 1}`)
          }
        }

        const response = await fetchTemperatureSlice(
          selectedDataset,
          temperatureSliceSelection.variable,
          temperatureSliceSelection.timeIndex,
          temperatureSliceSelection.depthIndex,
          controller.signal,
        )
        if (controller.signal.aborted) return

        const prepared = prepareTemperatureSlice(response)
        // Cache the prepared slice
        sliceCacheRef.current.set(cacheKey, prepared)
        if (controller.signal.aborted) return

        setTemperatureLayer(prepared)
      } catch (error) {
        if (controller.signal.aborted) return

        setTemperatureLayer(null)
        if (
          error instanceof TemperatureSliceValidationError &&
          error.kind === 'empty'
        ) {
          setSliceIsEmpty(true)
          setSliceError(null)
        } else {
          setSliceIsEmpty(false)
          setSliceError(
            error instanceof Error ? error.message : 'Unable to load temperature slice',
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setSliceLoading(false)
        }
      }
    }

    loadTemperatureSlice()
    return () => controller.abort()
  }, [selectedDataset, selectedDepthIndex, datasetMetadata])

  const timeLevels = datasetMetadata?.time_coordinate
    ? datasetMetadata.dimensions[datasetMetadata.time_coordinate] ?? null
    : null
  const depthLevels = datasetMetadata?.vertical_coordinate
    ? datasetMetadata.dimensions[datasetMetadata.vertical_coordinate] ?? null
    : null

  const handleDepthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value)) {
      setSelectedDepthIndex(value)
    }
  }

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
          <OceanGlobe temperatureLayer={temperatureLayer} />
          <TemperatureLayerStatus
            isLoading={sliceLoading}
            error={sliceError}
            isEmpty={sliceIsEmpty && !sliceLoading && !sliceError}
          />
          {temperatureLayer && !sliceLoading && !sliceError && (
            <TemperatureLegend layer={temperatureLayer} />
          )}
        </section>
        <RightInspector
          dataset={selectedDataset}
          metadata={datasetMetadata}
          temperatureLayer={temperatureLayer}
          sliceSelection={selectedDataset ? temperatureSliceSelection : null}
          isLoading={metadataLoading}
          error={metadataError}
          sliceLoading={sliceLoading}
          sliceError={sliceError}
        />
        <BottomTimeline
          temperatureLayer={temperatureLayer}
          sliceSelection={selectedDataset ? temperatureSliceSelection : null}
          timeLevels={timeLevels}
          depthLevels={depthLevels}
          depthValues={datasetMetadata?.depth_values ?? null}
          depthUnits={datasetMetadata?.depth_units ?? null}
          selectedDepthIndex={selectedDepthIndex}
          isLoading={sliceLoading}
          error={sliceError}
          onDepthChange={handleDepthChange}
        />
      </main>
    </div>
  )
}

export default App
