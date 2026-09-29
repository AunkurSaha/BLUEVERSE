import React, { useEffect, useState, useRef } from 'react'
import AppHeader from './components/layout/AppHeader'
import LeftSidebar from './components/layout/LeftSidebar'
import RightInspector from './components/layout/RightInspector'
import BottomTimeline from './components/layout/BottomTimeline'
import OceanGlobe from './components/globe/OceanGlobe'
import TemperatureLayerStatus from './components/globe/TemperatureLayerStatus'
import TemperatureLegend from './components/globe/TemperatureLegend'
import ArgoInspector from './components/observations/ArgoInspector'
import GliderInspector from './components/observations/GliderInspector'
import GliderCurtain from './components/observations/GliderCurtain'
import { getGliderCurtain, getGliderProfile, getGliderTrajectory, listGliderMissions, type GliderCurtain as GliderCurtainData, type GliderMission, type GliderPoint, type GliderProfile, type GliderVariable } from './services/gliderApi'
import {
  fetchArgoCollocation,
  fetchArgoProfile,
  fetchArgoProfiles,
  type ArgoModelCollocation,
  type ArgoProfileDetail,
  type ArgoProfileSummary,
} from './services/argoApi'
import {
  fetchTemperatureSlice,
  fetchDatasetMetadata,
  fetchDatasetCatalog,
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
import {
  buildSubsurfaceFrame,
  canActivateSubsurfaceFrame,
  selectRepresentativeDepthIndexes,
  sliceCacheKey,
  type SubsurfaceFrame,
  type SubsurfaceLayerCount,
  type SubsurfaceSample,
  type VerticalExaggeration,
} from './lib/subsurfaceFrame'
import type { VisualizationMode } from './components/layout/VisualizationControls'
import { isosurfaceCacheKey, selectIsosurfaceDepthIndexes, type IsosurfaceQuality } from './lib/oceanAnalysis'
import { canActivateIsosurfaceJob, type IsosurfaceMesh } from './lib/isosurface'
import type { IsosurfaceFrame, IsosurfaceSample } from './components/globe/IsosurfaceLayer'
import { greatCircleKilometres, transectCacheKey } from './lib/oceanAnalysis'
import { buildTransectFrame, canActivateTransect, supportsTransectVariable, type GeoPoint, type ModelDomain, type TransectFrame } from './lib/transect'
import TransectCrossSection from './components/analysis/TransectCrossSection'

const App: React.FC = () => {
  const [datasets, setDatasets] = useState<string[]>([])
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null)
  const [datasetMetadata, setDatasetMetadata] = useState<DatasetMetadata | null>(null)
  const [datasetsLoading, setDatasetsLoading] = useState(true)
  const [datasetsError, setDatasetsError] = useState<string | null>(null)
  const [metadataLoading, setMetadataLoading] = useState(false)
  const [metadataError, setMetadataError] = useState<string | null>(null)
  const [resolvedDatasetId, setResolvedDatasetId] = useState<string | null>(null)
  // State for ocean data: either scalar (temperature/salinity) or vector (currents)
  const [oceanLayer, setOceanLayer] = useState<{
    type: 'scalar'
    data: PreparedTemperatureSlice
  } | {
    type: 'vector'
    uo: PreparedTemperatureSlice
    vo: PreparedTemperatureSlice
  } | null>(null)
  const [sliceLoading, setSliceLoading] = useState(false)
  const [sliceError, setSliceError] = useState<string | null>(null)
  const [sliceIsEmpty, setSliceIsEmpty] = useState(false)
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking')
  const [selectedDepthIndex, setSelectedDepthIndex] = useState(0)
  const [selectedTimeIndex, setSelectedTimeIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedVariable, setSelectedVariable] = useState<"thetao" | "so" | "currents">("thetao")
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('depth_slice')
  const [subsurfaceLayerCount, setSubsurfaceLayerCount] = useState<SubsurfaceLayerCount>(8)
  const [verticalExaggeration, setVerticalExaggeration] = useState<VerticalExaggeration>(10)
  const [subsurfaceOpacityPercent, setSubsurfaceOpacityPercent] = useState(60)
  const [subsurfaceFrame, setSubsurfaceFrame] = useState<SubsurfaceFrame | null>(null)
  const [subsurfaceSample, setSubsurfaceSample] = useState<SubsurfaceSample | null>(null)
  const [subsurfaceProgress, setSubsurfaceProgress] = useState<{ loaded: number; total: number } | null>(null)
  const [isosurfaceTarget, setIsosurfaceTarget] = useState<number | null>(null)
  const [isosurfaceRange, setIsosurfaceRange] = useState<{ min: number; max: number } | null>(null)
  const [isosurfaceQuality, setIsosurfaceQuality] = useState<IsosurfaceQuality>('medium')
  const [isosurfaceOpacityPercent, setIsosurfaceOpacityPercent] = useState(65)
  const [isosurfaceFrame, setIsosurfaceFrame] = useState<IsosurfaceFrame | null>(null)
  const [isosurfaceStatus, setIsosurfaceStatus] = useState<string | null>(null)
  const [isosurfaceLoading, setIsosurfaceLoading] = useState(false)
  const [isosurfaceSample, setIsosurfaceSample] = useState<IsosurfaceSample | null>(null)
  const [transectEnabled, setTransectEnabled] = useState(false)
  const [transectDrawMode, setTransectDrawMode] = useState(false)
  const [transectStart, setTransectStart] = useState<GeoPoint | null>(null)
  const [transectEnd, setTransectEnd] = useState<GeoPoint | null>(null)
  const [transectSampleCount, setTransectSampleCount] = useState<50 | 100 | 200>(100)
  const [transectFrame, setTransectFrame] = useState<TransectFrame | null>(null)
  const [transectLoading, setTransectLoading] = useState(false)
  const [transectStatus, setTransectStatus] = useState<string | null>('No transect selected')
  const [transectDomain, setTransectDomain] = useState<ModelDomain | null>(null)
  // The fixed temporal scale is stored with the dataset+depth it belongs to, so
  // a scale computed for a previous depth is never applied to a new one.
  const [colorScaleState, setColorScaleState] = useState<
    { key: string; min: number; max: number } | null
  >(null)
  const [scaleLoading, setScaleLoading] = useState(false)
  const playIntervalRef = useRef<number | null>(null)
  const selectedTimeValueRef = useRef<string | null>(null)

  // ARGO observation state
  const [argoVisible, setArgoVisible] = useState(false)
  const [argoProfiles, setArgoProfiles] = useState<ArgoProfileSummary[]>([])
  const [argoLoading, setArgoLoading] = useState(false)
  const [argoError, setArgoError] = useState<string | null>(null)
  const [argoFetched, setArgoFetched] = useState(false)
  const [selectedArgoId, setSelectedArgoId] = useState<string | null>(null)
  const [argoDetail, setArgoDetail] = useState<ArgoProfileDetail | null>(null)
  const [argoDetailLoading, setArgoDetailLoading] = useState(false)
  const [argoDetailError, setArgoDetailError] = useState<string | null>(null)
  const [argoCollocation, setArgoCollocation] = useState<ArgoModelCollocation | null>(null)
  const [collocationLoading, setCollocationLoading] = useState(false)
  const [collocationError, setCollocationError] = useState<string | null>(null)
  const argoDetailCacheRef = useRef<Map<string, ArgoProfileDetail>>(new Map())
  const collocationCacheRef = useRef<Map<string, ArgoModelCollocation>>(new Map())
  const [gliderVisible,setGliderVisible]=useState(false)
  const [gliderMission,setGliderMission]=useState<GliderMission|null>(null)
  const [gliderPoints,setGliderPoints]=useState<GliderPoint[]>([])
  const [selectedGliderIndex,setSelectedGliderIndex]=useState<number|null>(null)
  const [gliderProfile,setGliderProfile]=useState<GliderProfile|null>(null)
  const [gliderLoading,setGliderLoading]=useState(false)
  const [gliderProfileLoading,setGliderProfileLoading]=useState(false)
  const [gliderError,setGliderError]=useState<string|null>(null)
  const [curtainVariable,setCurtainVariable]=useState<GliderVariable>('temperature')
  const [curtain,setCurtain]=useState<GliderCurtainData|null>(null)
  const [curtainOpen,setCurtainOpen]=useState(false)

  // Cache for raw temperature slices keyed by datasetId-variable-timeIndex-depthIndex.
  // Raw slices are cached (not prepared images) so a fixed temporal color scale
  // can be applied at preparation time without re-fetching.
  const sliceCacheRef = useRef<Map<string, TemperatureSlice>>(new Map())
  // Fixed temporal color scales keyed by datasetId-variable-depthIndex.
  const temporalScaleRef = useRef<Map<string, { min: number; max: number }>>(new Map())
  const subsurfaceRequestRef = useRef(0)
  const isosurfaceJobRef = useRef(0)
  const isosurfaceCacheRef = useRef<Map<string, IsosurfaceFrame>>(new Map())
  const transectGenerationRef = useRef(0)
  const transectCacheRef = useRef<Map<string, TransectFrame>>(new Map())

  // Bootstrap state is independent from slice loading. StrictMode aborts the
  // first pass, so only a non-aborted request is allowed to settle UI state.
  useEffect(() => {
    const controller = new AbortController()
    fetchHealth(controller.signal)
      .then(() => { if (!controller.signal.aborted) setBackendStatus('online') })
      .catch(() => { if (!controller.signal.aborted) setBackendStatus('offline') })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setDatasetsLoading(true)
    setDatasetsError(null)
    fetchDatasetCatalog(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setDatasets(items.filter((item) => item.dataset_kind === 'model_grid').map((item) => item.id))
        }
      })
      .catch((error) => { if (!controller.signal.aborted) setDatasetsError(error instanceof Error ? error.message : 'Unable to load datasets') })
      .finally(() => { if (!controller.signal.aborted) setDatasetsLoading(false) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!selectedDataset) { setDatasetMetadata(null); return }
    const controller = new AbortController()
    setResolvedDatasetId(null)
    setMetadataLoading(true)
    setMetadataError(null)
    fetchDatasetMetadata(selectedDataset, controller.signal)
      .then((metadata) => {
        if (controller.signal.aborted) return
        setDatasetMetadata(metadata)
        const times = metadata.time_values ?? []
        const previousTime = selectedTimeValueRef.current
        const nearest = previousTime && times.length
          ? times.reduce((best, value, index) => Math.abs(new Date(value).getTime() - new Date(previousTime).getTime()) < Math.abs(new Date(times[best]).getTime() - new Date(previousTime).getTime()) ? index : best, 0)
          : 0
        setSelectedTimeIndex(nearest)
        const depths = metadata.depth_values ?? []
        const readableDepthMaximum = metadata.selectable_depth_indices?.length
          ? metadata.selectable_depth_indices[metadata.selectable_depth_indices.length - 1]
          : Math.max(0, depths.length - 1)
        setSelectedDepthIndex((current) => Math.min(Math.max(0, current), readableDepthMaximum))
        setResolvedDatasetId(selectedDataset)
      })
      .catch((error) => { if (!controller.signal.aborted) setMetadataError(error instanceof Error ? error.message : 'Unable to load dataset metadata') })
      .finally(() => { if (!controller.signal.aborted) setMetadataLoading(false) })
    return () => controller.abort()
  }, [selectedDataset])

  useEffect(() => {
    selectedTimeValueRef.current = datasetMetadata?.time_values?.[selectedTimeIndex] ?? null
  }, [datasetMetadata, selectedTimeIndex])

  // Reset depth index when dataset changes
  useEffect(() => {
    if (selectedDataset) {
      setSelectedDepthIndex(0)
    }
  }, [selectedDataset])

  // Determine dataset ID based on selected variable for metadata fetching
  useEffect(() => {
    let datasetId = null
    if (selectedVariable === "thetao") {
      datasetId = "bay-of-bengal-temperature"
    } else if (selectedVariable === "so") {
      datasetId = "bay-of-bengal-salinity"
    } else if (selectedVariable === "currents") {
      // For currents, we use uo dataset for metadata (assuming similar structure)
      datasetId = "bay-of-bengal-uo"
    }
    setSelectedDataset(datasetId)
  }, [selectedVariable])

  // Subsurface mode has a scientific contract only for temperature. Changing
  // variable returns to the unchanged single-depth renderer.
  useEffect(() => {
    if (selectedVariable !== 'thetao' && visualizationMode !== 'depth_slice') {
      setVisualizationMode('depth_slice')
    }
    if (!supportsTransectVariable(selectedVariable)) {
      setTransectEnabled(false)
      setTransectDrawMode(false)
      setTransectStart(null)
      setTransectEnd(null)
      setTransectFrame(null)
    }
  }, [selectedVariable, visualizationMode])

  useEffect(() => {
    const slice = oceanLayer?.type === 'scalar' ? oceanLayer.data.slice : oceanLayer?.type === 'vector' ? oceanLayer.uo.slice : subsurfaceFrame?.layers[0]?.prepared.slice
    if (!slice || slice.var_name !== 'thetao') return
    setTransectDomain({ south: Math.min(...slice.lat_vals), north: Math.max(...slice.lat_vals), west: Math.min(...slice.lon_vals), east: Math.max(...slice.lon_vals) })
  }, [oceanLayer, subsurfaceFrame])

  // Fixed temporal color scale: one min/max covering ALL time indices at the
  // selected depth, so identical temperatures keep identical colors during
  // time playback. Recomputed whenever the dataset or depth changes.
  useEffect(() => {
    if (visualizationMode !== 'depth_slice' || !selectedDataset || !datasetMetadata || datasetMetadata.dataset_id !== selectedDataset || resolvedDatasetId !== selectedDataset) {
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

    // For currents, we compute scale based on uo component (could also use vo or magnitude)
    const variableForScale = selectedVariable === "currents" ? "uo" : selectedVariable
    const scaleKey = `${selectedDataset}-${variableForScale}-${selectedDepthIndex}`
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
          const cacheKey = `${selectedDataset}-${variableForScale}-${timeIndex}-${selectedDepthIndex}`
          let raw = sliceCacheRef.current.get(cacheKey)
          if (!raw) {
            raw = await fetchTemperatureSlice(
              selectedDataset,
              variableForScale,
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
  }, [selectedDataset, selectedDepthIndex, datasetMetadata, resolvedDatasetId, selectedVariable, visualizationMode])

  // Load ocean data (scalar or vector) based on selected variable
  useEffect(() => {
    const metadataReady = datasetMetadata?.dataset_id === selectedDataset && resolvedDatasetId === selectedDataset
    if (!selectedDataset) {
      setOceanLayer(null)
      setSliceLoading(false)
      setSliceError(null)
      setSliceIsEmpty(false)
      return
    }
    if (visualizationMode !== 'depth_slice' && selectedVariable === 'thetao') {
      setOceanLayer(null)
      setSliceLoading(false)
      return
    }
    // A variable switch briefly has a new dataset ID with old metadata/indexes.
    // Never issue a slice request until the target metadata reconciles both.
    if (!metadataReady) {
      setOceanLayer(null)
      setSliceLoading(true)
      setSliceError(null)
      return
    }

    // For scalar variables (thetao, so), fetch one slice
    // For vector variable (currents), fetch both uo and vo slices
    const isScalar = selectedVariable === "thetao" || selectedVariable === "so"
    const variablesToFetch = isScalar
      ? [selectedVariable]
      : ["uo", "vo"] // For currents, fetch both components

    const controller = new AbortController()
    setOceanLayer(null)
    setSliceLoading(true)
    setSliceError(null)
    setSliceIsEmpty(false)

    const loadOceanData = async () => {
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

        if (isScalar) {
          // Fetch scalar data (temperature or salinity)
          const cacheKey = `${selectedDataset}-${selectedVariable}-${selectedTimeIndex}-${selectedDepthIndex}`
          let raw = sliceCacheRef.current.get(cacheKey)
          if (!raw) {
            raw = await fetchTemperatureSlice(
              selectedDataset,
              selectedVariable,
              selectedTimeIndex,
              selectedDepthIndex,
              controller.signal,
            )
            if (controller.signal.aborted) return
            sliceCacheRef.current.set(cacheKey, raw)
          }

          const prepared = prepareTemperatureSlice(raw, colorScaleState ?? undefined)
          if (controller.signal.aborted) return

          setOceanLayer({
            type: 'scalar',
            data: prepared
          })
        } else {
          // Fetch vector data (currents) - get both uo and vo
          const uoCacheKey = `${selectedDataset}-uo-${selectedTimeIndex}-${selectedDepthIndex}`
          const voCacheKey = `${selectedDataset}-vo-${selectedTimeIndex}-${selectedDepthIndex}`

          let uoRaw = sliceCacheRef.current.get(uoCacheKey)
          let voRaw = sliceCacheRef.current.get(voCacheKey)

          if (!uoRaw) {
            uoRaw = await fetchTemperatureSlice(
              selectedDataset,
              "uo",
              selectedTimeIndex,
              selectedDepthIndex,
              controller.signal,
            )
            if (controller.signal.aborted) return
            sliceCacheRef.current.set(uoCacheKey, uoRaw)
          }

          if (!voRaw) {
            voRaw = await fetchTemperatureSlice(
              'bay-of-bengal-vo',
              "vo",
              selectedTimeIndex,
              selectedDepthIndex,
              controller.signal,
            )
            if (controller.signal.aborted) return
            sliceCacheRef.current.set(voCacheKey, voRaw)
          }

          const uoPrepared = prepareTemperatureSlice(uoRaw, colorScaleState ?? undefined)
          const voPrepared = prepareTemperatureSlice(voRaw, colorScaleState ?? undefined)

          if (controller.signal.aborted) return

          setOceanLayer({
            type: 'vector',
            uo: uoPrepared,
            vo: voPrepared
          })
        }
      } catch (error) {
        if (controller.signal.aborted) return

        setOceanLayer(null)
        if (
          error instanceof TemperatureSliceValidationError &&
          error.kind === 'empty'
        ) {
          setSliceIsEmpty(true)
          setSliceError(null)
        } else {
          setSliceIsEmpty(false)
          setSliceError(
            error instanceof Error ? error.message : 'Unable to load ocean slice',
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setSliceLoading(false)
        }
      }
    }

    loadOceanData()
    return () => controller.abort()
  }, [selectedDataset, selectedTimeIndex, selectedDepthIndex, datasetMetadata, resolvedDatasetId, colorScaleState, selectedVariable, visualizationMode])

  // A 3D frame is built off-screen from one timestamp and then swapped into
  // Cesium only after every requested real depth slice has completed.
  useEffect(() => {
    if (visualizationMode !== 'subsurface' || selectedVariable !== 'thetao') {
      subsurfaceRequestRef.current += 1
      setSubsurfaceFrame(null)
      setSubsurfaceSample(null)
      setSubsurfaceProgress(null)
      return
    }
    if (!selectedDataset || !datasetMetadata || datasetMetadata.dataset_id !== selectedDataset || resolvedDatasetId !== selectedDataset) {
      return
    }

    const depthIndexes = selectRepresentativeDepthIndexes(
      datasetMetadata.selectable_depth_indices ?? [],
      subsurfaceLayerCount,
    )
    if (depthIndexes.length === 0) {
      setSliceError('No selectable model depth levels are available for 3D Subsurface.')
      return
    }

    const controller = new AbortController()
    const requestId = subsurfaceRequestRef.current + 1
    subsurfaceRequestRef.current = requestId
    setSubsurfaceProgress({ loaded: 0, total: depthIndexes.length })
    setSubsurfaceSample(null)
    setSliceError(null)
    setSliceIsEmpty(false)

    const loadFrame = async () => {
      try {
        const slices = await Promise.all(depthIndexes.map(async (depthIndex) => {
          const key = sliceCacheKey(selectedDataset, 'thetao', selectedTimeIndex, depthIndex)
          const cached = sliceCacheRef.current.get(key)
          const slice = cached ?? await fetchTemperatureSlice(
            selectedDataset,
            'thetao',
            selectedTimeIndex,
            depthIndex,
            controller.signal,
          )
          if (!cached) sliceCacheRef.current.set(key, slice)
          if (canActivateSubsurfaceFrame(requestId, subsurfaceRequestRef.current, controller.signal.aborted)) {
            setSubsurfaceProgress((progress) => progress
              ? { ...progress, loaded: progress.loaded + 1 }
              : progress)
          }
          return slice
        }))
        if (!canActivateSubsurfaceFrame(requestId, subsurfaceRequestRef.current, controller.signal.aborted)) return
        setSubsurfaceFrame(buildSubsurfaceFrame(selectedDataset, selectedTimeIndex, depthIndexes, slices))
      } catch (error) {
        if (!canActivateSubsurfaceFrame(requestId, subsurfaceRequestRef.current, controller.signal.aborted)) return
        setSliceError(error instanceof Error ? error.message : 'Unable to load 3D subsurface layers.')
      } finally {
        if (canActivateSubsurfaceFrame(requestId, subsurfaceRequestRef.current, controller.signal.aborted)) {
          setSubsurfaceProgress(null)
        }
      }
    }

    loadFrame()
    return () => controller.abort()
  }, [visualizationMode, selectedVariable, selectedDataset, datasetMetadata, resolvedDatasetId, selectedTimeIndex, subsurfaceLayerCount])

  useEffect(() => {
    if (visualizationMode !== 'isosurface' || selectedVariable !== 'thetao') {
      isosurfaceJobRef.current += 1
      setIsosurfaceFrame(null)
      setIsosurfaceStatus(null)
      setIsosurfaceLoading(false)
      setIsosurfaceSample(null)
      return
    }
    if (!selectedDataset || !datasetMetadata || datasetMetadata.dataset_id !== selectedDataset || resolvedDatasetId !== selectedDataset) return
    const depthIndexes = selectIsosurfaceDepthIndexes(datasetMetadata.selectable_depth_indices ?? [], isosurfaceQuality)
    if (depthIndexes.length < 2) { setIsosurfaceStatus('Insufficient selectable depths for an isosurface.'); setIsosurfaceLoading(false); return }
    const controller = new AbortController()
    const jobId = ++isosurfaceJobRef.current
    setIsosurfaceLoading(true)
    setIsosurfaceStatus('Loading model volume...')
    let worker: Worker | null = null
    const run = async () => {
      try {
        const slices = await Promise.all(depthIndexes.map(async (depthIndex) => {
          const key = sliceCacheKey(selectedDataset, 'thetao', selectedTimeIndex, depthIndex)
          const cached = sliceCacheRef.current.get(key)
          if (cached) return cached
          const slice = await fetchTemperatureSlice(selectedDataset, 'thetao', selectedTimeIndex, depthIndex, controller.signal)
          sliceCacheRef.current.set(key, slice)
          return slice
        }))
        if (controller.signal.aborted || !canActivateIsosurfaceJob(jobId, isosurfaceJobRef.current)) return
        const reference = slices[0]
        const sameCoordinates = (left: number[], right: number[]) => left.length === right.length && left.every((value, index) => value === right[index])
        if (slices.some((slice) => slice.actual_time !== reference.actual_time || slice.var_name !== 'thetao' || !sameCoordinates(slice.lat_vals, reference.lat_vals) || !sameCoordinates(slice.lon_vals, reference.lon_vals))) throw new Error('Isosurface volume slices do not share one temperature grid and timestamp.')
        setTransectDomain({ south: Math.min(...reference.lat_vals), north: Math.max(...reference.lat_vals), west: Math.min(...reference.lon_vals), east: Math.max(...reference.lon_vals) })
        const min = Math.min(...slices.map((slice) => slice.tmin)); const max = Math.max(...slices.map((slice) => slice.tmax))
        setIsosurfaceRange({ min, max })
        const target = isosurfaceTarget === null || isosurfaceTarget < min || isosurfaceTarget > max ? Math.round(((min + max) / 2) * 2) / 2 : isosurfaceTarget
        if (target !== isosurfaceTarget) { setIsosurfaceTarget(target); return }
        const key = isosurfaceCacheKey(selectedDataset, selectedTimeIndex, target, isosurfaceQuality, depthIndexes)
        const cached = isosurfaceCacheRef.current.get(key)
        if (cached) { setIsosurfaceFrame(cached); setIsosurfaceStatus(cached.mesh.indices.length ? null : `No isosurface exists for ${target.toFixed(1)} °C at this timestamp.`); setIsosurfaceLoading(false); return }
        setIsosurfaceStatus('Generating isosurface...')
        worker = new Worker(new URL('./workers/isosurface.worker.ts', import.meta.url), { type: 'module' })
        worker.onmessage = (event: MessageEvent<{ jobId: number; mesh?: IsosurfaceMesh; error?: string }>) => {
          if (!canActivateIsosurfaceJob(event.data.jobId, isosurfaceJobRef.current) || controller.signal.aborted) return
          if (event.data.error || !event.data.mesh) { setIsosurfaceStatus(event.data.error ?? 'Mesh generation failed.'); setIsosurfaceLoading(false); return }
          const frame = { mesh: event.data.mesh, actualTime: slices[0].actual_time, target, units: slices[0].var_units }
          isosurfaceCacheRef.current.set(key, frame)
          while (isosurfaceCacheRef.current.size > 12) isosurfaceCacheRef.current.delete(isosurfaceCacheRef.current.keys().next().value as string)
          setIsosurfaceFrame(frame)
          setIsosurfaceStatus(frame.mesh.indices.length ? null : `No isosurface exists for ${target.toFixed(1)} °C at this timestamp.`)
          setIsosurfaceLoading(false)
          worker?.terminate()
        }
        worker.onerror = () => {
          if (canActivateIsosurfaceJob(jobId, isosurfaceJobRef.current) && !controller.signal.aborted) { setIsosurfaceStatus('Mesh generation failed in the background worker.'); setIsosurfaceLoading(false) }
          worker?.terminate()
        }
        worker.postMessage({ jobId, target, volume: { longitudes: slices[0].lon_vals, latitudes: slices[0].lat_vals, depths: slices.map((slice) => slice.actual_depth), values: slices.map((slice) => slice.slice_data) } })
      } catch (error) {
        if (!controller.signal.aborted && jobId === isosurfaceJobRef.current) { setIsosurfaceStatus(error instanceof Error ? error.message : 'Unable to build isosurface.'); setIsosurfaceLoading(false) }
      }
    }
    run()
    return () => { controller.abort(); worker?.terminate() }
  }, [visualizationMode, selectedVariable, selectedDataset, datasetMetadata, resolvedDatasetId, selectedTimeIndex, isosurfaceQuality, isosurfaceTarget])

  useEffect(() => {
    if (!transectEnabled || !transectStart || !transectEnd || !supportsTransectVariable(selectedVariable)) {
      transectGenerationRef.current += 1
      setTransectLoading(false)
      if (transectEnabled && !transectEnd) setTransectStatus(transectStart ? 'Start point selected. Choose end point.' : 'No transect selected')
      return
    }
    if (!selectedDataset || !datasetMetadata || datasetMetadata.dataset_id !== selectedDataset || resolvedDatasetId !== selectedDataset) return
    const depthIndexes = datasetMetadata.selectable_depth_indices ?? []
    if (depthIndexes.length === 0) { setTransectStatus('No selectable Temperature depths are available.'); return }
    const key = transectCacheKey(selectedDataset, selectedTimeIndex, [transectStart.latitude, transectStart.longitude], [transectEnd.latitude, transectEnd.longitude], transectSampleCount)
    const cached = transectCacheRef.current.get(key)
    if (cached) { setTransectFrame(cached); setTransectStatus(null); setTransectLoading(false); return }
    const controller = new AbortController(); const generation = ++transectGenerationRef.current
    setTransectLoading(true); setTransectStatus('Loading transect data...')
    const load = async () => {
      try {
        const slices = await Promise.all(depthIndexes.map(async (depthIndex) => {
          const sliceKey = sliceCacheKey(selectedDataset, 'thetao', selectedTimeIndex, depthIndex)
          const cachedSlice = sliceCacheRef.current.get(sliceKey)
          if (cachedSlice) return cachedSlice
          const slice = await fetchTemperatureSlice(selectedDataset, 'thetao', selectedTimeIndex, depthIndex, controller.signal)
          sliceCacheRef.current.set(sliceKey, slice); return slice
        }))
        if (!canActivateTransect(generation, transectGenerationRef.current, controller.signal.aborted)) return
        const frame = buildTransectFrame(selectedDataset, selectedTimeIndex, transectStart, transectEnd, transectSampleCount, slices)
        transectCacheRef.current.set(key, frame)
        while (transectCacheRef.current.size > 8) transectCacheRef.current.delete(transectCacheRef.current.keys().next().value as string)
        setTransectFrame(frame); setTransectStatus(null)
      } catch (error) {
        if (canActivateTransect(generation, transectGenerationRef.current, controller.signal.aborted)) setTransectStatus(error instanceof Error ? error.message : 'Failed to load transect.')
      } finally {
        if (canActivateTransect(generation, transectGenerationRef.current, controller.signal.aborted)) setTransectLoading(false)
      }
    }
    load(); return () => controller.abort()
  }, [transectEnabled, transectStart, transectEnd, transectSampleCount, selectedVariable, selectedDataset, datasetMetadata, resolvedDatasetId, selectedTimeIndex])

  const timeLevels = datasetMetadata?.time_coordinate
    ? datasetMetadata.dimensions[datasetMetadata.time_coordinate] ?? null
    : null
  const rawDepthLevels = datasetMetadata?.vertical_coordinate
    ? datasetMetadata.dimensions[datasetMetadata.vertical_coordinate] ?? null
    : null
  const depthLevels = datasetMetadata?.selectable_depth_indices?.length ?? rawDepthLevels

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

  const handleTransectPoint = React.useCallback((point: GeoPoint) => {
    setTransectStatus(null)
    if (!transectStart) {
      setTransectStart(point)
      setTransectEnd(null)
      setTransectStatus('Start point selected. Choose end point.')
    } else {
      setTransectEnd(point)
      setTransectDrawMode(false)
    }
  }, [transectStart])

  const handleDrawTransect = () => {
    setTransectStart(null); setTransectEnd(null); setTransectFrame(null)
    setTransectStatus('Choose a start point on the globe.'); setTransectDrawMode(true)
  }

  const handleClearTransect = () => {
    transectGenerationRef.current += 1
    setTransectDrawMode(false); setTransectStart(null); setTransectEnd(null); setTransectFrame(null)
    setTransectLoading(false); setTransectStatus('No transect selected')
  }

  const handleTransectEnabledChange = (enabled: boolean) => {
    setTransectEnabled(enabled)
    if (!enabled) handleClearTransect()
  }

  // Fetch ARGO profile summaries the first time the layer is enabled.
  useEffect(() => {
    if (!argoVisible || argoFetched) return
    const controller = new AbortController()
    setArgoLoading(true)
    setArgoError(null)

    fetchArgoProfiles(controller.signal)
      .then((profiles) => {
        if (controller.signal.aborted) return
        setArgoProfiles(profiles)
        setArgoFetched(true)
      })
      .catch((loadError) => {
        if (controller.signal.aborted) return
        setArgoError(
          loadError instanceof Error ? loadError.message : 'Unable to load ARGO profiles',
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) setArgoLoading(false)
      })

    return () => controller.abort()
  }, [argoVisible, argoFetched])

  useEffect(()=>{if(!gliderVisible||gliderMission)return;const c=new AbortController();setGliderLoading(true);setGliderError(null);listGliderMissions(c.signal).then(async m=>{const mission=m[0];const points=await getGliderTrajectory(mission.mission_id,c.signal);if(c.signal.aborted)return;setGliderMission(mission);setGliderPoints(points)}).catch(e=>!c.signal.aborted&&setGliderError(e instanceof Error?e.message:'Unable to load Glider mission')).finally(()=>!c.signal.aborted&&setGliderLoading(false));return()=>c.abort()},[gliderVisible,gliderMission])
  useEffect(()=>{if(selectedGliderIndex===null||!gliderMission)return;const c=new AbortController();setGliderProfileLoading(true);setGliderError(null);getGliderProfile(gliderMission.mission_id,selectedGliderIndex,c.signal).then(p=>!c.signal.aborted&&setGliderProfile(p)).catch(e=>!c.signal.aborted&&setGliderError(e instanceof Error?e.message:'Unable to load Glider profile')).finally(()=>!c.signal.aborted&&setGliderProfileLoading(false));return()=>c.abort()},[selectedGliderIndex,gliderMission])
  useEffect(()=>{if(!gliderVisible||!gliderMission||!curtainOpen)return;const c=new AbortController();getGliderCurtain(gliderMission.mission_id,curtainVariable,20,c.signal).then(x=>!c.signal.aborted&&setCurtain(x)).catch(e=>!c.signal.aborted&&setGliderError(e instanceof Error?e.message:'Unable to load Glider curtain'));return()=>c.abort()},[gliderVisible,gliderMission,curtainVariable,curtainOpen])
  const handleGliderSelect=(index:number)=>{setSelectedArgoId(null);setSelectedGliderIndex(index)}

  // Fetch profile detail and collocation when a marker is selected.
  // Both are cached per profile id; the scientific values come only from the backend.
  useEffect(() => {
    if (!selectedArgoId) {
      setArgoDetail(null)
      setArgoDetailError(null)
      setArgoCollocation(null)
      setCollocationError(null)
      return
    }

    const controller = new AbortController()
    const cachedDetail = argoDetailCacheRef.current.get(selectedArgoId)
    const cachedCollocation = collocationCacheRef.current.get(selectedArgoId)

    setArgoDetail(cachedDetail ?? null)
    setArgoCollocation(cachedCollocation ?? null)
    setArgoDetailError(null)
    setCollocationError(null)
    setArgoDetailLoading(!cachedDetail)
    setCollocationLoading(!cachedCollocation)

    if (!cachedDetail) {
      fetchArgoProfile(selectedArgoId, controller.signal)
        .then((detail) => {
          if (controller.signal.aborted) return
          argoDetailCacheRef.current.set(selectedArgoId, detail)
          setArgoDetail(detail)
        })
        .catch((loadError) => {
          if (controller.signal.aborted) return
          setArgoDetailError(
            loadError instanceof Error ? loadError.message : 'Unable to load ARGO profile',
          )
        })
        .finally(() => {
          if (!controller.signal.aborted) setArgoDetailLoading(false)
        })
    }

    if (!cachedCollocation) {
      fetchArgoCollocation(selectedArgoId, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return
          collocationCacheRef.current.set(selectedArgoId, result)
          setArgoCollocation(result)
        })
        .catch((loadError) => {
          if (controller.signal.aborted) return
          setCollocationError(
            loadError instanceof Error ? loadError.message : 'Unable to load collocation',
          )
        })
        .finally(() => {
          if (!controller.signal.aborted) setCollocationLoading(false)
        })
    }

    return () => controller.abort()
  }, [selectedArgoId])

  const handleArgoToggle = (visible: boolean) => {
    setArgoVisible(visible)
    if (!visible) setSelectedArgoId(null)
  }

  // Playback: advance one time index per interval, wrapping at the end.
  useEffect(() => {
    if (!isPlaying || timeLevels === null || timeLevels < 2 || (visualizationMode === 'isosurface' && isosurfaceLoading) || (transectEnabled && transectEnd !== null && transectLoading)) {
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
  }, [isPlaying, timeLevels, visualizationMode, isosurfaceLoading, transectEnabled, transectEnd, transectLoading])

  // Mean of the previous timestamp at this depth (real slice statistic only),
  // used to display "Mean change" in the inspector.
  const previousTimeMean = React.useMemo(() => {
    if (!selectedDataset || selectedTimeIndex < 1) return null
    const variableForMean = selectedVariable === "currents" ? "uo" : selectedVariable
    const previousKey = `${selectedDataset}-${variableForMean}-${selectedTimeIndex - 1}-${selectedDepthIndex}`
    return sliceCacheRef.current.get(previousKey)?.tmean ?? null
    // oceanLayer identity changes whenever a slice (and its cache entry) lands
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDataset, selectedTimeIndex, selectedDepthIndex, oceanLayer])

  // Helper to get current speed from vector data
  const getCurrentSpeed = React.useCallback((uoValue: number, voValue: number) => {
    return Math.sqrt(uoValue * uoValue + voValue * voValue)
  }, [])

  const transectDistanceKm = transectStart && transectEnd
    ? greatCircleKilometres([transectStart.latitude, transectStart.longitude], [transectEnd.latitude, transectEnd.longitude])
    : null

  return (
    <div className="flex h-dvh min-h-dvh w-full min-w-0 flex-col overflow-hidden bg-[#050b14]">
      <AppHeader backendStatus={backendStatus} selectedDataset={selectedDataset} />
      <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 lg:grid lg:grid-cols-[272px_minmax(0,1fr)_340px] lg:gap-4 lg:overflow-hidden lg:p-4">
        <LeftSidebar
          datasets={datasets}
          selectedDataset={selectedDataset}
          selectedVariable={selectedVariable}
          onDatasetSelect={setSelectedDataset}
          onVariableSelect={setSelectedVariable}
          isLoading={datasetsLoading}
          error={datasetsError}
          argoVisible={argoVisible}
          argoLoading={argoLoading}
          argoError={argoError}
          argoCount={argoFetched ? argoProfiles.length : null}
          onArgoToggle={handleArgoToggle}
          gliderVisible={gliderVisible}
          gliderLoading={gliderLoading}
          gliderError={gliderError}
          gliderCount={gliderMission?.profile_count??null}
          onGliderToggle={(visible)=>{setGliderVisible(visible);if(!visible){setSelectedGliderIndex(null);setGliderProfile(null);setCurtainOpen(false)}}}
          visualizationMode={visualizationMode}
          subsurfaceLayerCount={subsurfaceLayerCount}
          verticalExaggeration={verticalExaggeration}
          subsurfaceOpacityPercent={subsurfaceOpacityPercent}
          onVisualizationModeChange={setVisualizationMode}
          onSubsurfaceLayerCountChange={setSubsurfaceLayerCount}
          onVerticalExaggerationChange={setVerticalExaggeration}
          onSubsurfaceOpacityChange={setSubsurfaceOpacityPercent}
          isosurfaceTarget={isosurfaceTarget}
          isosurfaceRange={isosurfaceRange}
          isosurfaceQuality={isosurfaceQuality}
          isosurfaceOpacityPercent={isosurfaceOpacityPercent}
          onIsosurfaceTargetChange={setIsosurfaceTarget}
          onIsosurfaceQualityChange={setIsosurfaceQuality}
          onIsosurfaceOpacityChange={setIsosurfaceOpacityPercent}
          transectEnabled={transectEnabled}
          transectDrawMode={transectDrawMode}
          transectStart={transectStart}
          transectEnd={transectEnd}
          transectDistanceKm={transectDistanceKm}
          transectSampleCount={transectSampleCount}
          transectStatus={transectStatus}
          onTransectEnabledChange={handleTransectEnabledChange}
          onDrawTransect={handleDrawTransect}
          onClearTransect={handleClearTransect}
          onTransectSampleCountChange={setTransectSampleCount}
        />
        <section
          aria-label="Cesium globe viewport"
          className="relative min-h-[60vh] flex-1 overflow-hidden rounded-lg border border-white/10 bg-[#02060d] lg:min-h-0"
        >
          <OceanGlobe
            oceanLayer={oceanLayer}
            argoProfiles={argoProfiles}
            argoVisible={argoVisible}
            selectedArgoId={selectedArgoId}
            onArgoSelect={setSelectedArgoId}
            gliderPoints={gliderPoints}
            gliderVisible={gliderVisible}
            selectedGliderIndex={selectedGliderIndex}
            onGliderSelect={handleGliderSelect}
            getCurrentSpeed={getCurrentSpeed}
            subsurfaceFrame={subsurfaceFrame}
            verticalExaggeration={verticalExaggeration}
            subsurfaceOpacity={subsurfaceOpacityPercent / 100}
            onSubsurfaceSample={setSubsurfaceSample}
            isosurfaceFrame={isosurfaceFrame}
            isosurfaceOpacity={isosurfaceOpacityPercent / 100}
            onIsosurfaceSample={setIsosurfaceSample}
            transectStart={transectStart}
            transectEnd={transectEnd}
            transectDrawMode={transectDrawMode}
            transectDomain={transectDomain}
            onTransectPoint={handleTransectPoint}
            onTransectError={setTransectStatus}
          />
          <TemperatureLayerStatus
            isLoading={sliceLoading}
            error={sliceError}
            isEmpty={sliceIsEmpty && !sliceLoading && !sliceError}
          />
          {oceanLayer && oceanLayer.type === 'scalar' && !sliceLoading && !sliceError && (
            <TemperatureLegend oceanLayer={oceanLayer} timeLevels={timeLevels} />
          )}
          {subsurfaceProgress && (
            <p role="status" className="absolute left-3 top-3 rounded-md border border-cyan-300/30 bg-[#08111f]/95 px-3 py-2 text-xs text-cyan-100">
              Loading 3D layers {subsurfaceProgress.loaded} / {subsurfaceProgress.total}
            </p>
          )}
          {visualizationMode === 'isosurface' && (isosurfaceLoading || isosurfaceStatus) && <p role="status" className="absolute left-3 top-3 rounded-md border border-amber-300/30 bg-[#08111f]/95 px-3 py-2 text-xs text-amber-100">{isosurfaceStatus ?? 'Updating frame...'}</p>}
          {visualizationMode === 'isosurface' && isosurfaceFrame && !isosurfaceLoading && <p className="absolute bottom-3 left-3 rounded-md border border-amber-300/30 bg-[#08111f]/95 px-3 py-2 text-xs text-amber-100">Temperature Isosurface: {isosurfaceFrame.target.toFixed(1)} °C</p>}
          {transectEnabled && <TransectCrossSection frame={transectFrame} loading={transectLoading} status={transectStatus} />}
        </section>
        {selectedGliderIndex !== null && gliderMission ? (
          <GliderInspector mission={gliderMission} profile={gliderProfile} loading={gliderProfileLoading} error={gliderError} onSelect={handleGliderSelect} onClose={()=>setSelectedGliderIndex(null)} />
        ) : selectedArgoId ? (
          <ArgoInspector
            profile={argoDetail}
            profileLoading={argoDetailLoading}
            profileError={argoDetailError}
            collocation={argoCollocation}
            collocationLoading={collocationLoading}
            collocationError={collocationError}
            onClose={() => setSelectedArgoId(null)}
          />
        ) : (
          <RightInspector
            dataset={selectedDataset}
            metadata={datasetMetadata}
            oceanLayer={oceanLayer}
            sliceSelection={selectedDataset ? {
              variable: selectedVariable,
              timeIndex: selectedTimeIndex,
              depthIndex: selectedDepthIndex,
            } : null}
            isLoading={metadataLoading}
            error={metadataError}
            sliceLoading={sliceLoading}
            sliceError={sliceError}
            colorScale={colorScaleState}
            scaleLoading={scaleLoading}
            previousTimeMean={previousTimeMean}
            subsurfaceSample={subsurfaceSample}
            isosurfaceSample={isosurfaceSample}
          />
        )}
        <BottomTimeline
          oceanLayer={oceanLayer}
          sliceSelection={selectedDataset ? {
            variable: selectedVariable,
            timeIndex: selectedTimeIndex,
            depthIndex: selectedDepthIndex,
          } : null}
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
        {gliderVisible && (curtainOpen ? <GliderCurtain data={curtain} variable={curtainVariable} onVariable={setCurtainVariable} /> : <button type="button" onClick={()=>setCurtainOpen(true)} className="border border-white/10 bg-[#08111f] p-3 text-sm text-orange-100">Open Mission Curtain</button>)}
      </main>
    </div>
  )
}

export default App
