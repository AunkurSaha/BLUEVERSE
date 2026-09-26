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
  computeTemporalScale,
  prepareTemperatureSlice,
  TemperatureSliceValidationError,
  type PreparedTemperatureSlice,
  type TemperatureSlice,
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
  const [selectedTimeIndex, setSelectedTimeIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  // The fixed temporal scale is stored with the dataset+depth it belongs to, so
  // a scale computed for a previous depth is never applied to a new one.
  const [colorScaleState, setColorScaleState] = useState<
    { key: string; min: number; max: number } | null
  >(null)
  const [scaleLoading, setScaleLoading] = useState(false)
  const playIntervalRef = useRef<number | null>(null)

  // Cache for raw temperature slices keyed by datasetId-variable-timeIndex-depthIndex.
  // Raw slices are cached (not prepared images) so a fixed temporal color scale
  // can be applied at preparation time without re-fetching.
  const sliceCacheRef = useRef<Map<string, TemperatureSlice>>(new Map())
  // Fixed temporal color scales keyed by datasetId-variable-depthIndex.
  const temporalScaleRef = useRef<Map<string, { min: number; max: number }>>(new Map())

  // Reset depth index when dataset changes
  useEffect(() => {
    if (selectedDataset) {
      setSelectedDepthIndex(0)
    }
  }, [selectedDataset])

  const temperatureSliceSelection = React.useMemo(() => ({
    variable: 'thetao',
    timeIndex: selectedTimeIndex,
    depthIndex: selectedDepthIndex,
  }), [selectedTimeIndex, selectedDepthIndex])

  const temporalScaleKey = selectedDataset
    ? `${selectedDataset}-thetao-${selectedDepthIndex}`
    : null
  // Only a scale computed for the current dataset+depth may be applied.
  const colorScale =
    colorScaleState && temporalScaleKey && colorScaleState.key === temporalScaleKey
      ? { min: colorScaleState.min, max: colorScaleState.max }
      : null

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

  // Fixed temporal color scale: one min/max covering ALL time indices at the
  // selected depth, so identical temperatures keep identical colors during
  // time playback. Recomputed whenever the dataset or depth changes.
  useEffect(() => {
    if (!selectedDataset || !datasetMetadata) {
      setColorScaleState(null)
      setScaleLoading(false)
      return
    }

    const timeCount =
      datasetMetadata.dimensions[datasetMetadata.time_coordinate ?? 'time'] ?? 0
    if (timeCount < 1) {
      setColorScaleState(null)
      setScaleLoading(false)
      return
    }

    const scaleKey = `${selectedDataset}-thetao-${selectedDepthIndex}`
    const cachedScale = temporalScaleRef.current.get(scaleKey)
    if (cachedScale) {
      setColorScaleState({ key: scaleKey, ...cachedScale })
      setScaleLoading(false)
      return
    }

    const controller = new AbortController()
    setScaleLoading(true)

    const loadTemporalScale = async () => {
      try {
        const stats: Array<{ tmin: number; tmax: number }> = []
        for (let timeIndex = 0; timeIndex < timeCount; timeIndex += 1) {
          const cacheKey = `${selectedDataset}-thetao-${timeIndex}-${selectedDepthIndex}`
          let raw = sliceCacheRef.current.get(cacheKey)
          if (!raw) {
            raw = await fetchTemperatureSlice(
              selectedDataset,
              'thetao',
              timeIndex,
              selectedDepthIndex,
              controller.signal,
            )
            if (controller.signal.aborted) return
            sliceCacheRef.current.set(cacheKey, raw)
          }
          stats.push({ tmin: raw.tmin, tmax: raw.tmax })
        }

        const scale = computeTemporalScale(stats)
        temporalScaleRef.current.set(scaleKey, scale)
        if (controller.signal.aborted) return
        setColorScaleState({ key: scaleKey, ...scale })
      } catch {
        // A missing scale must not block rendering; fall back to per-slice scale.
        if (!controller.signal.aborted) {
          setColorScaleState(null)
        }
      } finally {
        if (!controller.signal.aborted) {
          setScaleLoading(false)
        }
      }
    }

    loadTemporalScale()
    return () => controller.abort()
  }, [selectedDataset, selectedDepthIndex, datasetMetadata])

  useEffect(() => {
    if (!selectedDataset) {
      setTemperatureLayer(null)
      setSliceLoading(false)
      setSliceError(null)
      setSliceIsEmpty(false)
      return
    }

    const cacheKey = `${selectedDataset}-thetao-${selectedTimeIndex}-${selectedDepthIndex}`
    const cachedSlice = sliceCacheRef.current.get(cacheKey)

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

        // Validate time index using metadata (if available)
        if (datasetMetadata) {
          const timeCount = datasetMetadata.dimensions[datasetMetadata.time_coordinate ?? 'time'] ?? 0
          if (selectedTimeIndex < 0 || selectedTimeIndex >= timeCount) {
            throw new Error(`Time index ${selectedTimeIndex} is out of range. Valid range is 0 to ${timeCount - 1}`)
          }
        }

        let raw = cachedSlice
        if (!raw) {
          raw = await fetchTemperatureSlice(
            selectedDataset,
            temperatureSliceSelection.variable,
            temperatureSliceSelection.timeIndex,
            temperatureSliceSelection.depthIndex,
            controller.signal,
          )
          if (controller.signal.aborted) return
          sliceCacheRef.current.set(cacheKey, raw)
        }

        const prepared = prepareTemperatureSlice(raw, colorScale ?? undefined)
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
  }, [selectedDataset, selectedTimeIndex, selectedDepthIndex, datasetMetadata, colorScale])

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

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value)) {
      setSelectedTimeIndex(value)
    }
  }

  const handlePlayToggle = () => {
    setIsPlaying(!isPlaying)
  }

  // Playback: advance one time index per interval, wrapping at the end.
  useEffect(() => {
    if (!isPlaying || timeLevels === null || timeLevels < 2) {
      if (playIntervalRef.current !== null) {
        window.clearInterval(playIntervalRef.current)
        playIntervalRef.current = null
      }
      return
    }

    playIntervalRef.current = window.setInterval(() => {
      setSelectedTimeIndex((current) => (current + 1) % timeLevels)
    }, 900)

    return () => {
      if (playIntervalRef.current !== null) {
        window.clearInterval(playIntervalRef.current)
        playIntervalRef.current = null
      }
    }
  }, [isPlaying, timeLevels])

  // Mean of the previous timestamp at this depth (real slice statistic only),
  // used to display "Mean change" in the inspector.
  const previousTimeMean = React.useMemo(() => {
    if (!selectedDataset || selectedTimeIndex < 1) return null
    const previousKey = `${selectedDataset}-thetao-${selectedTimeIndex - 1}-${selectedDepthIndex}`
    return sliceCacheRef.current.get(previousKey)?.tmean ?? null
    // temperatureLayer identity changes whenever a slice (and its cache entry) lands
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDataset, selectedTimeIndex, selectedDepthIndex, temperatureLayer])

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
            <TemperatureLegend layer={temperatureLayer} timeLevels={timeLevels} />
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
          colorScale={colorScale}
          scaleLoading={scaleLoading}
          previousTimeMean={previousTimeMean}
        />
        <BottomTimeline
          temperatureLayer={temperatureLayer}
          sliceSelection={selectedDataset ? temperatureSliceSelection : null}
          timeLevels={timeLevels}
          timeValues={datasetMetadata?.time_values ?? null}
          timeUnits={datasetMetadata?.time_units ?? null}
          selectedTimeIndex={selectedTimeIndex}
          onTimeChange={handleTimeChange}
          isPlaying={isPlaying}
          onPlayToggle={handlePlayToggle}
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
