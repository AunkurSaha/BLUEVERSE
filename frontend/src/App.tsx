import React, { useEffect, useState, useRef } from 'react'
import AppHeader from './components/layout/AppHeader'
import LeftSidebar from './components/layout/LeftSidebar'
import RightInspector from './components/layout/RightInspector'
import BottomTimeline from './components/layout/BottomTimeline'
import ToolInstruction from './components/layout/ToolInstruction'
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
  fetchCurrentProfile,
  fetchScalarProfile,
  type BackendStatus,
  type DatasetMetadata,
} from './services/api'
import {
  computeTemporalScale,
  formatSelectedTime,
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
import { buildTransectFrame, canActivateTransect, pointInDomain, supportsTransectVariable, type GeoPoint, type ModelDomain, type TransectFrame } from './lib/transect'
import TransectCrossSection from './components/analysis/TransectCrossSection'
import OceanProbePanel from './components/analysis/OceanProbePanel'
import { assertCompatibleCurrentMetadata, assertCompatibleCurrentSlices, canActivateProbe, currentProfileFromResponse, nearestTimestamp, probeCacheKey, scalarProfileFromResponse, type OceanProbeFrame, type ProbeLocation } from './lib/oceanProbe'
import AlertPanel from './components/analysis/AlertPanel'
import { filterAlertSummaries, summarizeAlerts } from './lib/alerts'
import { fetchArgoAlertDetail, fetchArgoAlerts, type AlertFilter, type AlertThresholds, type ArgoProfileAlertDetail, type ArgoProfileAlertSummary } from './services/alertApi'
import { fetchRegion, fetchRegions, type RegionDetail, type RegionSummary } from './services/regionApi'
import { canActivateScientificRequest, currentDatasetsForRegion, datasetForVariable, DEFAULT_REGION_ID } from './lib/regions'
import { eventApi, type HistoricalEventDetail, type HistoricalEventSummary, type HistoricalEventTrack } from './services/eventApi'
import { formatHistoricalUtc, historicalAnalysisDescription, selectedTrackPoint } from './lib/historicalEvents'
import {
  fetchHistoricalDifference,
  fetchHistoricalOceanConfiguration,
  fetchHistoricalPhaseMean,
  fetchHistoricalProbe,
  type HistoricalComparison,
  type HistoricalDifferenceResponse,
  type HistoricalOceanConfiguration,
  type HistoricalPhase,
  type HistoricalPhaseMeanResponse,
  type HistoricalVariable,
} from './services/historicalOceanApi'
import {
  canActivateHistoricalRequest,
  HISTORICAL_EVENT_ID,
  historicalCacheKey,
  historicalCurrentDatasets,
  historicalDatasetForVariable,
  historicalProbeCacheKey,
  historicalProbeToOceanProbeFrame,
  matchHistoricalOceanTime,
  type AnalysisContext,
  type HistoricalAnalysisMode,
} from './lib/historicalOcean'
import {
  HISTORICAL_AVAILABILITY_TIMEOUT_MS,
  PROBE_TIMEOUT_MS,
  RequestTimeoutError,
  isAbortError,
  runWithTimeout,
} from './lib/requestLifecycle'

const App: React.FC = () => {
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [workflowOpen, setWorkflowOpen] = useState(false)
  const [regions, setRegions] = useState<RegionSummary[]>([])
  const [selectedRegionId, setSelectedRegionId] = useState(DEFAULT_REGION_ID)
  const [regionDetail, setRegionDetail] = useState<RegionDetail | null>(null)
  const [regionsLoading, setRegionsLoading] = useState(true)
  const [regionsError, setRegionsError] = useState<string | null>(null)
  const [regionDetailLoading, setRegionDetailLoading] = useState(false)
  const [regionDetailError, setRegionDetailError] = useState<string | null>(null)
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
  const [probeEnabled, setProbeEnabled] = useState(false)
  const [probeLocation, setProbeLocation] = useState<ProbeLocation | null>(null)
  const [probeFrame, setProbeFrame] = useState<OceanProbeFrame | null>(null)
  const [probeLoading, setProbeLoading] = useState(false)
  const [probeStatus, setProbeStatus] = useState<string | null>('Ocean Probe is disabled.')
  const [probeError, setProbeError] = useState<string | null>(null)
  const [probeRetry, setProbeRetry] = useState(0)
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
  const [alertsVisible, setAlertsVisible] = useState(false)
  const [alertSummaries, setAlertSummaries] = useState<ArgoProfileAlertSummary[]>([])
  const [alertThresholds, setAlertThresholds] = useState<AlertThresholds | null>(null)
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [alertsError, setAlertsError] = useState<string | null>(null)
  const [alertsFetched, setAlertsFetched] = useState(false)
  const [alertFilter, setAlertFilter] = useState<AlertFilter>('all')
  const [selectedAlertProfileId, setSelectedAlertProfileId] = useState<string | null>(null)
  const [alertDetail, setAlertDetail] = useState<ArgoProfileAlertDetail | null>(null)
  const [alertDetailLoading, setAlertDetailLoading] = useState(false)
  const [alertDetailError, setAlertDetailError] = useState<string | null>(null)
  const alertDetailCacheRef = useRef<Map<string, ArgoProfileAlertDetail>>(new Map())
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
  const [historicalEvents, setHistoricalEvents] = useState<HistoricalEventSummary[]>([])
  const [selectedHistoricalEventId, setSelectedHistoricalEventId] = useState('')
  const [historicalEventDetail, setHistoricalEventDetail] = useState<HistoricalEventDetail | null>(null)
  const [historicalEventTrack, setHistoricalEventTrack] = useState<HistoricalEventTrack | null>(null)
  const [historicalEventVisible, setHistoricalEventVisible] = useState(false)
  const [selectedHistoricalPointIndex, setSelectedHistoricalPointIndex] = useState(0)
  const [historicalEventLoading, setHistoricalEventLoading] = useState(true)
  const [historicalEventError, setHistoricalEventError] = useState<string | null>(null)
  const [historicalEventRetry, setHistoricalEventRetry] = useState(0)
  const [analysisContext, setAnalysisContext] = useState<AnalysisContext>('current')
  const [historicalAnalysisMode, setHistoricalAnalysisMode] = useState<HistoricalAnalysisMode>('daily')
  const [historicalPhase, setHistoricalPhase] = useState<HistoricalPhase>('before')
  const [historicalComparison, setHistoricalComparison] = useState<HistoricalComparison>('during-before')
  const [historicalConfiguration, setHistoricalConfiguration] = useState<HistoricalOceanConfiguration | null>(null)
  const [historicalConfigurationLoading, setHistoricalConfigurationLoading] = useState(false)
  const [historicalConfigurationError, setHistoricalConfigurationError] = useState<string | null>(null)
  const [historicalDifferenceSummary, setHistoricalDifferenceSummary] = useState<{
    finitePairedCellCount: number
    mean: number
    minimum: number
    maximum: number
    units: string
  } | null>(null)
  const [historicalProbeTimeOverride, setHistoricalProbeTimeOverride] = useState<string | null>(null)

  // Cache for raw temperature slices keyed by datasetId-variable-timeIndex-depthIndex.
  // Raw slices are cached (not prepared images) so a fixed temporal color scale
  // can be applied at preparation time without re-fetching.
  const sliceCacheRef = useRef<Map<string, TemperatureSlice>>(new Map())
  const sliceGenerationRef = useRef(0)
  // Fixed temporal color scales keyed by datasetId-variable-depthIndex.
  const temporalScaleRef = useRef<Map<string, { min: number; max: number }>>(new Map())
  const subsurfaceRequestRef = useRef(0)
  const isosurfaceJobRef = useRef(0)
  const isosurfaceCacheRef = useRef<Map<string, IsosurfaceFrame>>(new Map())
  const transectGenerationRef = useRef(0)
  const transectCacheRef = useRef<Map<string, TransectFrame>>(new Map())
  const probeGenerationRef = useRef(0)
  const probeCacheRef = useRef<Map<string, OceanProbeFrame>>(new Map())
  const auxiliaryMetadataCacheRef = useRef<Map<string, DatasetMetadata>>(new Map())
  const historicalRequestRef = useRef(0)
  const historicalDerivedCacheRef = useRef<Map<string, HistoricalPhaseMeanResponse | HistoricalDifferenceResponse>>(new Map())
  const currentContextSnapshotRef = useRef<{
    regionId: string
    datasetId: string | null
    variable: HistoricalVariable
    timeIndex: number
    depthIndex: number
    operationalTime: string | null
  } | null>(null)
  const pendingCurrentRestoreRef = useRef<typeof currentContextSnapshotRef.current>(null)

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
    setHistoricalEventLoading(true)
    setHistoricalEventError(null)
    runWithTimeout(
      (signal) => eventApi.list(signal),
      HISTORICAL_AVAILABILITY_TIMEOUT_MS,
      controller.signal,
    )
      .then((items) => {
        if (controller.signal.aborted) return
        setHistoricalEvents(items)
        setSelectedHistoricalEventId((current) => current || items[0]?.id || '')
        if (items.length === 0) setHistoricalEventLoading(false)
      })
      .catch((error) => {
        if (controller.signal.aborted || isAbortError(error)) return
        setHistoricalEventError(error instanceof RequestTimeoutError ? 'Historical event request timed out.' : error instanceof Error ? error.message : 'Unable to load historical events')
        setHistoricalEventLoading(false)
      })
    return () => controller.abort()
  }, [historicalEventRetry])

  useEffect(() => {
    if (!selectedHistoricalEventId) {
      setHistoricalEventLoading(false)
      return
    }
    const controller = new AbortController()
    setHistoricalEventLoading(true)
    setHistoricalEventError(null)
    runWithTimeout(
      (signal) => Promise.all([
        eventApi.detail(selectedHistoricalEventId, signal),
        eventApi.track(selectedHistoricalEventId, signal),
      ]),
      HISTORICAL_AVAILABILITY_TIMEOUT_MS,
      controller.signal,
    )
      .then(([detail, track]) => {
        if (controller.signal.aborted) return
        setHistoricalEventDetail(detail)
        setHistoricalEventTrack(track)
        setSelectedHistoricalPointIndex(0)
      })
      .catch((error) => {
        if (controller.signal.aborted || isAbortError(error)) return
        setHistoricalEventDetail(null)
        setHistoricalEventTrack(null)
        setHistoricalEventVisible(false)
        setHistoricalEventError(error instanceof RequestTimeoutError ? 'Historical availability request timed out.' : error instanceof Error ? error.message : 'Unable to load the historical event track')
      })
      .finally(() => { if (!controller.signal.aborted) setHistoricalEventLoading(false) })
    return () => controller.abort()
  }, [selectedHistoricalEventId, historicalEventRetry])

  useEffect(() => {
    if (!selectedHistoricalEventId || historicalEventDetail?.historical_ocean_data?.status !== 'AVAILABLE') {
      setHistoricalConfiguration(null)
      setHistoricalConfigurationLoading(false)
      setHistoricalConfigurationError(null)
      return
    }
    const controller = new AbortController()
    setHistoricalConfigurationLoading(true)
    setHistoricalConfigurationError(null)
    runWithTimeout(
      (signal) => fetchHistoricalOceanConfiguration(selectedHistoricalEventId, signal),
      HISTORICAL_AVAILABILITY_TIMEOUT_MS,
      controller.signal,
    )
      .then((configuration) => {
        if (!controller.signal.aborted) setHistoricalConfiguration(configuration)
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) {
          setHistoricalConfiguration(null)
          setHistoricalConfigurationError(loadError instanceof RequestTimeoutError ? 'Historical ocean metadata request timed out.' : loadError instanceof Error ? loadError.message : 'Unable to load historical ocean configuration')
        }
      })
      .finally(() => { if (!controller.signal.aborted) setHistoricalConfigurationLoading(false) })
    return () => controller.abort()
  }, [selectedHistoricalEventId, historicalEventDetail, historicalEventRetry])

  useEffect(() => {
    const controller = new AbortController()
    setRegionsLoading(true)
    setRegionsError(null)
    fetchRegions(controller.signal)
      .then((items) => {
        if (controller.signal.aborted) return
        setRegions(items)
        if (!items.some((region) => region.id === selectedRegionId) && items[0]) {
          setSelectedRegionId(items[0].id)
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setRegionsError(error instanceof Error ? error.message : 'Unable to load study regions')
      })
      .finally(() => { if (!controller.signal.aborted) setRegionsLoading(false) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setRegionDetail(null)
    setRegionDetailLoading(true)
    setRegionDetailError(null)
    fetchRegion(selectedRegionId, controller.signal)
      .then((region) => { if (!controller.signal.aborted) setRegionDetail(region) })
      .catch((error) => {
        if (!controller.signal.aborted) setRegionDetailError(error instanceof Error ? error.message : 'Unable to load study region details')
      })
      .finally(() => { if (!controller.signal.aborted) setRegionDetailLoading(false) })
    return () => controller.abort()
  }, [selectedRegionId])

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
        const pendingRestore = pendingCurrentRestoreRef.current
        const previousTime = selectedTimeValueRef.current
        const nearest = previousTime && times.length
          ? times.reduce((best, value, index) => Math.abs(new Date(value).getTime() - new Date(previousTime).getTime()) < Math.abs(new Date(times[best]).getTime() - new Date(previousTime).getTime()) ? index : best, 0)
          : 0
        setSelectedTimeIndex(
          pendingRestore?.datasetId === selectedDataset
            ? Math.min(Math.max(0, pendingRestore.timeIndex), Math.max(0, times.length - 1))
            : nearest,
        )
        const depths = metadata.depth_values ?? []
        const readableDepthMaximum = metadata.selectable_depth_indices?.length
          ? metadata.selectable_depth_indices[metadata.selectable_depth_indices.length - 1]
          : Math.max(0, depths.length - 1)
        setSelectedDepthIndex((current) => Math.min(Math.max(0, pendingRestore?.datasetId === selectedDataset ? pendingRestore.depthIndex : current), readableDepthMaximum))
        if (pendingRestore?.datasetId === selectedDataset) pendingCurrentRestoreRef.current = null
        setResolvedDatasetId(selectedDataset)
      })
      .catch((error) => { if (!controller.signal.aborted) setMetadataError(error instanceof Error ? error.message : 'Unable to load dataset metadata') })
      .finally(() => { if (!controller.signal.aborted) setMetadataLoading(false) })
    return () => controller.abort()
  }, [selectedDataset])

  useEffect(() => {
    selectedTimeValueRef.current = datasetMetadata?.time_values?.[selectedTimeIndex] ?? null
  }, [datasetMetadata, selectedTimeIndex])

  useEffect(() => {
    if (analysisContext !== 'historical-event' || historicalAnalysisMode !== 'daily') return
    const point = historicalEventTrack?.points[selectedHistoricalPointIndex]
    const times = datasetMetadata?.time_values ?? []
    if (!point || times.length === 0) return
    const matched = matchHistoricalOceanTime(point.time, times)
    setSelectedTimeIndex((current) => current === matched.index ? current : matched.index)
  }, [analysisContext, historicalAnalysisMode, historicalEventTrack, selectedHistoricalPointIndex, datasetMetadata])

  // Reset depth index when dataset changes
  useEffect(() => {
    if (selectedDataset && pendingCurrentRestoreRef.current?.datasetId !== selectedDataset) {
      setSelectedDepthIndex(0)
    }
  }, [selectedDataset])

  // Resolve variables only through the selected region's registered datasets.
  useEffect(() => {
    if (analysisContext === 'historical-event') {
      if (selectedRegionId !== 'bay-of-bengal') setSelectedRegionId('bay-of-bengal')
      setSelectedDataset(historicalDatasetForVariable(selectedVariable))
      return
    }
    if (!regionDetail || regionDetail.id !== selectedRegionId) {
      setSelectedDataset(null)
      return
    }
    const selected = datasetForVariable(regionDetail, selectedVariable)
    if (selected) {
      setSelectedDataset(selected)
      return
    }
    const temperature = datasetForVariable(regionDetail, 'thetao')
    setSelectedVariable('thetao')
    setSelectedDataset(temperature)
  }, [analysisContext, selectedVariable, selectedRegionId, regionDetail])

  useEffect(() => {
    if (!regionDetail || regionDetail.id !== selectedRegionId) return
    if (!regionDetail.observation_sources.includes('ARGO')) {
      setArgoVisible(false)
      setSelectedArgoId(null)
    }
    if (!regionDetail.observation_sources.includes('Spray Glider')) {
      setGliderVisible(false)
      setSelectedGliderIndex(null)
      setGliderProfile(null)
      setCurtainOpen(false)
    }
    if (!regionDetail.analysis_capabilities.includes('Model-Observation Alerts')) {
      setAlertsVisible(false)
      setSelectedAlertProfileId(null)
    }
  }, [selectedRegionId, regionDetail])

  // Subsurface mode has a scientific contract only for temperature. Changing
  // variable returns to the unchanged single-depth renderer.
  useEffect(() => {
    if ((analysisContext === 'historical-event' || selectedVariable !== 'thetao') && visualizationMode !== 'depth_slice') {
      setVisualizationMode('depth_slice')
    }
    if (!supportsTransectVariable(selectedVariable)) {
      setTransectEnabled(false)
      setTransectDrawMode(false)
      setTransectStart(null)
      setTransectEnd(null)
      setTransectFrame(null)
    }
  }, [analysisContext, selectedVariable, visualizationMode])

  useEffect(() => {
    const slice = oceanLayer?.type === 'scalar' ? oceanLayer.data.slice : oceanLayer?.type === 'vector' ? oceanLayer.uo.slice : subsurfaceFrame?.layers[0]?.prepared.slice
    if (!slice || slice.var_name !== 'thetao') return
    setTransectDomain({ south: Math.min(...slice.lat_vals), north: Math.max(...slice.lat_vals), west: Math.min(...slice.lon_vals), east: Math.max(...slice.lon_vals) })
  }, [oceanLayer, subsurfaceFrame])

  useEffect(() => {
    if (!probeEnabled || transectDomain) return
    const globalTime = datasetMetadata?.time_values?.[selectedTimeIndex]
    if (!globalTime) return
    const controller = new AbortController()
    const loadDomain = async () => {
      try {
        const temperatureDatasetId = analysisContext === 'historical-event'
          ? historicalDatasetForVariable('thetao')
          : datasetForVariable(regionDetail, 'thetao')
        if (!temperatureDatasetId) throw new Error('Temperature is unavailable for this region.')
        const source = { datasetId: temperatureDatasetId, variable: 'thetao' }
        let metadata = auxiliaryMetadataCacheRef.current.get(source.datasetId)
        if (!metadata) {
          metadata = await fetchDatasetMetadata(source.datasetId, controller.signal)
          if (!controller.signal.aborted) auxiliaryMetadataCacheRef.current.set(source.datasetId, metadata)
        }
        const depthIndex = metadata.selectable_depth_indices?.[0]
        if (depthIndex === undefined) throw new Error('Temperature model domain is unavailable.')
        const timeIndex = nearestTimestamp(globalTime, metadata.time_values ?? []).index
        const key = sliceCacheKey(source.datasetId, source.variable, timeIndex, depthIndex)
        let slice = sliceCacheRef.current.get(key)
        if (!slice) {
          slice = await fetchTemperatureSlice(source.datasetId, source.variable, timeIndex, depthIndex, controller.signal)
          if (!controller.signal.aborted) sliceCacheRef.current.set(key, slice)
        }
        if (!controller.signal.aborted) setTransectDomain({ south: Math.min(...slice.lat_vals), north: Math.max(...slice.lat_vals), west: Math.min(...slice.lon_vals), east: Math.max(...slice.lon_vals) })
      } catch (error) {
        if (!controller.signal.aborted) setProbeStatus(error instanceof Error ? error.message : 'Failed data request.')
      }
    }
    loadDomain()
    return () => controller.abort()
  }, [analysisContext, probeEnabled, transectDomain, datasetMetadata, selectedTimeIndex, regionDetail])

  // Fixed temporal color scale: one min/max covering ALL time indices at the
  // selected depth, so identical temperatures keep identical colors during
  // time playback. Recomputed whenever the dataset or depth changes.
  useEffect(() => {
    if (selectedVariable === 'currents' || (analysisContext === 'historical-event' && historicalAnalysisMode !== 'daily')) {
      setColorScaleState(null)
      setScaleLoading(false)
      return
    }
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

    const variableForScale = selectedVariable
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
  }, [analysisContext, historicalAnalysisMode, selectedDataset, selectedDepthIndex, datasetMetadata, resolvedDatasetId, selectedVariable, visualizationMode])

  // Load ocean data (scalar or vector) based on selected variable
  useEffect(() => {
    const generation = ++sliceGenerationRef.current
    const historicalRequestId = analysisContext === 'historical-event'
      ? ++historicalRequestRef.current
      : historicalRequestRef.current
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
    const currentDatasets = isScalar
      ? null
      : analysisContext === 'historical-event'
        ? historicalCurrentDatasets()
        : currentDatasetsForRegion(regionDetail)

    const controller = new AbortController()
    setOceanLayer(null)
    setSliceLoading(true)
    setSliceError(null)
    setSliceIsEmpty(false)
    if (historicalAnalysisMode !== 'difference') setHistoricalDifferenceSummary(null)

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

        if (analysisContext === 'historical-event' && historicalAnalysisMode !== 'daily') {
          const cacheKey = historicalCacheKey({
            context: analysisContext,
            eventId: selectedHistoricalEventId,
            variable: selectedVariable,
            mode: historicalAnalysisMode,
            timeIndex: selectedTimeIndex,
            phase: historicalPhase,
            comparison: historicalComparison,
            depthIndex: selectedDepthIndex,
          })
          let derived = historicalDerivedCacheRef.current.get(cacheKey)
          if (!derived) {
            derived = historicalAnalysisMode === 'phase_mean'
              ? await fetchHistoricalPhaseMean(selectedHistoricalEventId, selectedVariable, historicalPhase, selectedDepthIndex, controller.signal)
              : await fetchHistoricalDifference(selectedHistoricalEventId, selectedVariable as Exclude<HistoricalVariable, 'currents'>, historicalComparison, selectedDepthIndex, controller.signal)
            if (!canActivateHistoricalRequest(historicalRequestId, historicalRequestRef.current, controller.signal.aborted, analysisContext)) return
            historicalDerivedCacheRef.current.set(cacheKey, derived)
            while (historicalDerivedCacheRef.current.size > 24) historicalDerivedCacheRef.current.delete(historicalDerivedCacheRef.current.keys().next().value as string)
          }
          if (!canActivateHistoricalRequest(historicalRequestId, historicalRequestRef.current, controller.signal.aborted, analysisContext)) return
          if (derived.analysis_mode === 'difference') {
            const prepared = prepareTemperatureSlice(derived.slice, derived.color_scale, 'diverging')
            setOceanLayer({ type: 'scalar', data: prepared })
            setHistoricalDifferenceSummary({
              finitePairedCellCount: derived.finite_paired_cell_count,
              mean: derived.mean_difference,
              minimum: derived.minimum_difference,
              maximum: derived.maximum_difference,
              units: derived.slice.var_units,
            })
          } else if (selectedVariable === 'currents') {
            if (!derived.uo || !derived.vo) throw new Error('Historical current phase response is incomplete.')
            assertCompatibleCurrentSlices(derived.uo, derived.vo)
            setOceanLayer({
              type: 'vector',
              uo: prepareTemperatureSlice(derived.uo),
              vo: prepareTemperatureSlice(derived.vo),
            })
          } else {
            if (!derived.slice || !derived.color_scale) throw new Error('Historical scalar phase response is incomplete.')
            setOceanLayer({ type: 'scalar', data: prepareTemperatureSlice(derived.slice, derived.color_scale) })
          }
          return
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
            if (!canActivateScientificRequest(generation, sliceGenerationRef.current, controller.signal.aborted)) return
            sliceCacheRef.current.set(cacheKey, raw)
          }

          const prepared = prepareTemperatureSlice(raw, colorScaleState ?? undefined)
          if (!canActivateScientificRequest(generation, sliceGenerationRef.current, controller.signal.aborted)) return

          setOceanLayer({
            type: 'scalar',
            data: prepared
          })
        } else {
          if (!currentDatasets || currentDatasets.u !== selectedDataset) {
            throw new Error('Current component datasets are unavailable for the selected region.')
          }
          let vMetadata = auxiliaryMetadataCacheRef.current.get(currentDatasets.v)
          if (!vMetadata) {
            vMetadata = await fetchDatasetMetadata(currentDatasets.v, controller.signal)
            if (!canActivateScientificRequest(generation, sliceGenerationRef.current, controller.signal.aborted)) return
            auxiliaryMetadataCacheRef.current.set(currentDatasets.v, vMetadata)
          }
          assertCompatibleCurrentMetadata(datasetMetadata, vMetadata, selectedTimeIndex, selectedDepthIndex)
          const uoCacheKey = sliceCacheKey(currentDatasets.u, 'uo', selectedTimeIndex, selectedDepthIndex)
          const voCacheKey = sliceCacheKey(currentDatasets.v, 'vo', selectedTimeIndex, selectedDepthIndex)

          let uoRaw = sliceCacheRef.current.get(uoCacheKey)
          let voRaw = sliceCacheRef.current.get(voCacheKey)

          if (!uoRaw) {
            uoRaw = await fetchTemperatureSlice(
              currentDatasets.u,
              "uo",
              selectedTimeIndex,
              selectedDepthIndex,
              controller.signal,
            )
            if (!canActivateScientificRequest(generation, sliceGenerationRef.current, controller.signal.aborted)) return
            sliceCacheRef.current.set(uoCacheKey, uoRaw)
          }

          if (!voRaw) {
            voRaw = await fetchTemperatureSlice(
              currentDatasets.v,
              "vo",
              selectedTimeIndex,
              selectedDepthIndex,
              controller.signal,
            )
            if (!canActivateScientificRequest(generation, sliceGenerationRef.current, controller.signal.aborted)) return
            sliceCacheRef.current.set(voCacheKey, voRaw)
          }

          assertCompatibleCurrentSlices(uoRaw, voRaw)
          const uoPrepared = prepareTemperatureSlice(uoRaw)
          const voPrepared = prepareTemperatureSlice(voRaw)

          if (!canActivateScientificRequest(generation, sliceGenerationRef.current, controller.signal.aborted)) return

          setOceanLayer({
            type: 'vector',
            uo: uoPrepared,
            vo: voPrepared
          })
        }
      } catch (error) {
        if (!canActivateScientificRequest(generation, sliceGenerationRef.current, controller.signal.aborted)) return

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
        if (canActivateScientificRequest(generation, sliceGenerationRef.current, controller.signal.aborted)) {
          setSliceLoading(false)
        }
      }
    }

    loadOceanData()
    return () => controller.abort()
  }, [analysisContext, historicalAnalysisMode, historicalPhase, historicalComparison, selectedHistoricalEventId, selectedDataset, selectedTimeIndex, selectedDepthIndex, datasetMetadata, resolvedDatasetId, colorScaleState, selectedVariable, visualizationMode, regionDetail])

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

  useEffect(() => {
    if (!probeEnabled || !probeLocation) {
      probeGenerationRef.current += 1
      setProbeLoading(false)
      setProbeError(null)
      if (probeEnabled) setProbeStatus('Click inside the Temperature model domain to select a probe.')
      return
    }
    const globalTime = datasetMetadata?.time_values?.[selectedTimeIndex]
    if (!globalTime) { setProbeStatus('No compatible global timestamp is available.'); setProbeLoading(false); return }
    if (analysisContext === 'historical-event') {
      const requestedTime = historicalProbeTimeOverride ?? globalTime
      const key = historicalProbeCacheKey(selectedHistoricalEventId, requestedTime, probeLocation)
      const cached = probeCacheRef.current.get(key)
      if (cached) { setProbeFrame(cached); setProbeStatus(null); setProbeLoading(false); return }
      const controller = new AbortController()
      const generation = ++probeGenerationRef.current
      setProbeLoading(true)
      setProbeStatus(null)
      setProbeError(null)
      runWithTimeout(
        (signal) => fetchHistoricalProbe(
          selectedHistoricalEventId,
          requestedTime,
          probeLocation.latitude,
          probeLocation.longitude,
          signal,
        ),
        PROBE_TIMEOUT_MS,
        controller.signal,
      ).then((response) => {
        if (!canActivateProbe(generation, probeGenerationRef.current, controller.signal.aborted)) return
        const frame = historicalProbeToOceanProbeFrame(response)
        probeCacheRef.current.set(key, frame)
        while (probeCacheRef.current.size > 8) probeCacheRef.current.delete(probeCacheRef.current.keys().next().value as string)
        setProbeFrame(frame)
        setProbeStatus(null)
      }).catch((loadError) => {
        if (canActivateProbe(generation, probeGenerationRef.current, controller.signal.aborted)) {
          setProbeError(loadError instanceof RequestTimeoutError ? 'Probe data could not be loaded before the request timed out.' : loadError instanceof Error ? loadError.message : 'Unable to load historical reanalysis profiles.')
        }
      }).finally(() => {
        if (canActivateProbe(generation, probeGenerationRef.current, controller.signal.aborted)) setProbeLoading(false)
      })
      return () => controller.abort()
    }
    const temperatureDatasetId = datasetForVariable(regionDetail, 'thetao')
    if (!temperatureDatasetId) { setProbeStatus('Temperature is unavailable for this region.'); setProbeLoading(false); return }
    const salinityDatasetId = datasetForVariable(regionDetail, 'so')
    const currentDatasets = currentDatasetsForRegion(regionDetail)
    const key = probeCacheKey([
      regionDetail?.id ?? 'region:none',
      temperatureDatasetId,
      salinityDatasetId ?? 'salinity:none',
      currentDatasets?.u ?? 'uo:none',
      currentDatasets?.v ?? 'vo:none',
    ], globalTime, probeLocation)
    const cached = probeCacheRef.current.get(key)
    if (cached) { setProbeFrame(cached); setProbeStatus(null); setProbeLoading(false); return }

    const controller = new AbortController()
    const generation = ++probeGenerationRef.current
    setProbeLoading(true)
    setProbeStatus(null)
    setProbeError(null)

    const metadataFor = async (datasetId: string, requestSignal: AbortSignal): Promise<DatasetMetadata> => {
      const cachedMetadata = auxiliaryMetadataCacheRef.current.get(datasetId)
      if (cachedMetadata) return cachedMetadata
      const metadata = await fetchDatasetMetadata(datasetId, requestSignal)
      if (!requestSignal.aborted) auxiliaryMetadataCacheRef.current.set(datasetId, metadata)
      return metadata
    }
    const messageFor = (result: PromiseRejectedResult): string => result.reason instanceof Error ? result.reason.message : 'Failed data request.'

    const load = async (requestSignal: AbortSignal) => {
      const temperatureTask = (async () => {
        const source = { datasetId: temperatureDatasetId, variable: 'thetao' }
        const metadata = await metadataFor(source.datasetId, requestSignal)
        const selected = nearestTimestamp(globalTime, metadata.time_values ?? [])
        const response = await fetchScalarProfile(source.datasetId, source.variable, selected.index, probeLocation.latitude, probeLocation.longitude, requestSignal)
        return scalarProfileFromResponse(response, globalTime)
      })()
      const salinityTask = (async () => {
        if (!salinityDatasetId) throw new Error('Salinity is unavailable for this region.')
        const source = { datasetId: salinityDatasetId, variable: 'so' }
        const metadata = await metadataFor(source.datasetId, requestSignal)
        const selected = nearestTimestamp(globalTime, metadata.time_values ?? [])
        const response = await fetchScalarProfile(source.datasetId, source.variable, selected.index, probeLocation.latitude, probeLocation.longitude, requestSignal)
        return scalarProfileFromResponse(response, globalTime)
      })()
      const currentsTask = (async () => {
        if (!currentDatasets) throw new Error('Currents are unavailable for this region.')
        const [uMetadata, vMetadata] = await Promise.all([metadataFor(currentDatasets.u, requestSignal), metadataFor(currentDatasets.v, requestSignal)])
        const uTime = nearestTimestamp(globalTime, uMetadata.time_values ?? [])
        const vTime = nearestTimestamp(globalTime, vMetadata.time_values ?? [])
        assertCompatibleCurrentMetadata(uMetadata, vMetadata, uTime.index, uMetadata.selectable_depth_indices?.[0] ?? 0)
        if (uTime.index !== vTime.index) throw new Error('U and V do not share a compatible model timestamp.')
        const response = await fetchCurrentProfile(currentDatasets.u, currentDatasets.v, uTime.index, probeLocation.latitude, probeLocation.longitude, requestSignal)
        return currentProfileFromResponse(response, globalTime)
      })()
      const [temperatureResult, salinityResult, currentsResult] = await Promise.allSettled([temperatureTask, salinityTask, currentsTask])
      if (!canActivateProbe(generation, probeGenerationRef.current, controller.signal.aborted)) return
      const frame: OceanProbeFrame = {
        requested: probeLocation,
        globalTime,
        temperature: temperatureResult.status === 'fulfilled' ? temperatureResult.value : null,
        salinity: salinityResult.status === 'fulfilled' ? salinityResult.value : null,
        currents: currentsResult.status === 'fulfilled' ? currentsResult.value : null,
        errors: {
          temperature: temperatureResult.status === 'rejected' ? messageFor(temperatureResult) : null,
          salinity: salinityResult.status === 'rejected' ? messageFor(salinityResult) : null,
          currents: currentsResult.status === 'rejected' ? messageFor(currentsResult) : null,
        },
      }
      probeCacheRef.current.set(key, frame)
      while (probeCacheRef.current.size > 8) probeCacheRef.current.delete(probeCacheRef.current.keys().next().value as string)
      setProbeFrame(frame)
      if (frame.temperature || frame.salinity || frame.currents) {
        setProbeStatus(null)
      } else {
        setProbeError([frame.errors.temperature, frame.errors.salinity, frame.errors.currents].filter(Boolean).join(' ') || 'No valid data at location.')
      }
      setProbeLoading(false)
    }
    runWithTimeout(load, PROBE_TIMEOUT_MS, controller.signal).catch((error) => {
      if (canActivateProbe(generation, probeGenerationRef.current, controller.signal.aborted)) {
        setProbeError(error instanceof RequestTimeoutError ? 'Probe data could not be loaded before the request timed out.' : error instanceof Error ? error.message : 'Failed data request.')
        setProbeLoading(false)
      }
    })
    return () => controller.abort()
  }, [analysisContext, historicalProbeTimeOverride, selectedHistoricalEventId, probeEnabled, probeLocation, probeRetry, datasetMetadata, selectedTimeIndex, selectedVariable, regionDetail])

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
    probeGenerationRef.current += 1
    setProbeEnabled(false); setProbeLocation(null); setProbeFrame(null); setProbeLoading(false); setProbeStatus('Ocean Probe is disabled.'); setProbeError(null)
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

  const handleProbeSelect = React.useCallback((location: ProbeLocation) => {
    setHistoricalProbeTimeOverride(null)
    setProbeLocation(location)
    setProbeFrame(null)
    setProbeStatus(null)
    setProbeError(null)
    setInspectorOpen(true)
  }, [])

  const handleProbeCoordinateSubmit = React.useCallback((location: ProbeLocation) => {
    if (!transectDomain || !pointInDomain(location, transectDomain)) {
      setProbeStatus('No registered model coverage at this location.')
      return
    }
    handleProbeSelect(location)
  }, [transectDomain, handleProbeSelect])

  const handleProbeEnabledChange = (enabled: boolean) => {
    probeGenerationRef.current += 1
    setProbeEnabled(enabled)
    setProbeLoading(false)
    setProbeError(null)
    if (enabled) {
      setTransectDrawMode(false)
      setProbeStatus('Click inside the Temperature model domain to select a probe.')
    } else {
      setProbeLocation(null)
      setProbeFrame(null)
      setProbeStatus('Ocean Probe is disabled.')
    }
  }

  const handleProbeCancel = React.useCallback(() => {
    probeGenerationRef.current += 1
    setProbeLocation(null)
    setProbeFrame(null)
    setProbeLoading(false)
    setProbeError(null)
    setProbeStatus('Click another ocean location to load water-column profiles.')
  }, [])

  const handleProbeRetry = React.useCallback(() => {
    setProbeFrame(null)
    setProbeError(null)
    setProbeRetry((value) => value + 1)
  }, [])

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

  useEffect(() => {
    if (!alertsVisible || alertsFetched) return
    const controller = new AbortController()
    setAlertsLoading(true)
    setAlertsError(null)
    fetchArgoAlerts(controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return
        setAlertSummaries(response.summaries)
        setAlertThresholds(response.thresholds)
        setAlertsFetched(true)
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) setAlertsError(loadError instanceof Error ? loadError.message : 'Backend request failed')
      })
      .finally(() => {
        if (!controller.signal.aborted) setAlertsLoading(false)
      })
    return () => controller.abort()
  }, [alertsVisible, alertsFetched])

  useEffect(() => {
    if (!selectedAlertProfileId) {
      setAlertDetail(null)
      setAlertDetailError(null)
      setAlertDetailLoading(false)
      return
    }
    const cached = alertDetailCacheRef.current.get(selectedAlertProfileId)
    if (cached) {
      setAlertDetail(cached)
      setAlertDetailError(null)
      setAlertDetailLoading(false)
      return
    }
    const summary = alertSummaries.find((item) => item.profile_id === selectedAlertProfileId)
    if (!summary) {
      setAlertDetailError('Alert summary is unavailable.')
      return
    }
    const controller = new AbortController()
    setAlertDetail(null)
    setAlertDetailError(null)
    setAlertDetailLoading(true)
    fetchArgoAlertDetail(summary.platform_id, summary.profile_number, controller.signal)
      .then((detail) => {
        if (controller.signal.aborted) return
        alertDetailCacheRef.current.set(selectedAlertProfileId, detail)
        setAlertDetail(detail)
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) setAlertDetailError(loadError instanceof Error ? loadError.message : 'Collocation unavailable')
      })
      .finally(() => {
        if (!controller.signal.aborted) setAlertDetailLoading(false)
      })
    return () => controller.abort()
  }, [selectedAlertProfileId, alertSummaries])

  useEffect(()=>{if(!gliderVisible||gliderMission)return;const c=new AbortController();setGliderLoading(true);setGliderError(null);listGliderMissions(c.signal).then(async m=>{const mission=m[0];const points=await getGliderTrajectory(mission.mission_id,c.signal);if(c.signal.aborted)return;setGliderMission(mission);setGliderPoints(points)}).catch(e=>!c.signal.aborted&&setGliderError(e instanceof Error?e.message:'Unable to load Glider mission')).finally(()=>!c.signal.aborted&&setGliderLoading(false));return()=>c.abort()},[gliderVisible,gliderMission])
  useEffect(()=>{if(selectedGliderIndex===null||!gliderMission)return;const c=new AbortController();setGliderProfileLoading(true);setGliderError(null);getGliderProfile(gliderMission.mission_id,selectedGliderIndex,c.signal).then(p=>!c.signal.aborted&&setGliderProfile(p)).catch(e=>!c.signal.aborted&&setGliderError(e instanceof Error?e.message:'Unable to load Glider profile')).finally(()=>!c.signal.aborted&&setGliderProfileLoading(false));return()=>c.abort()},[selectedGliderIndex,gliderMission])
  useEffect(()=>{if(!gliderVisible||!gliderMission||!curtainOpen)return;const c=new AbortController();getGliderCurtain(gliderMission.mission_id,curtainVariable,20,c.signal).then(x=>!c.signal.aborted&&setCurtain(x)).catch(e=>!c.signal.aborted&&setGliderError(e instanceof Error?e.message:'Unable to load Glider curtain'));return()=>c.abort()},[gliderVisible,gliderMission,curtainVariable,curtainOpen])
  const handleGliderSelect=(index:number)=>{setSelectedArgoId(null);setSelectedAlertProfileId(null);setSelectedGliderIndex(index);setInspectorOpen(true)}

  const handleArgoSelect = React.useCallback((profileId: string) => {
    setSelectedAlertProfileId(null)
    setSelectedGliderIndex(null)
    setSelectedArgoId(profileId)
    setInspectorOpen(true)
  }, [])

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

  const handleAlertsToggle = (visible: boolean) => {
    setAlertsVisible(visible)
    if (!visible) setSelectedAlertProfileId(null)
  }

  const handleAlertSelect = React.useCallback((profileId: string) => {
    setSelectedArgoId(null)
    setSelectedGliderIndex(null)
    setSelectedAlertProfileId(profileId)
    setInspectorOpen(true)
  }, [])

  // Playback: advance one time index per interval, wrapping at the end.
  useEffect(() => {
    if (!isPlaying || (analysisContext === 'historical-event' && historicalAnalysisMode !== 'daily') || timeLevels === null || timeLevels < 2 || (visualizationMode === 'isosurface' && isosurfaceLoading) || (transectEnabled && transectEnd !== null && transectLoading) || (probeEnabled && probeLocation !== null && probeLoading)) {
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
  }, [analysisContext, historicalAnalysisMode, isPlaying, timeLevels, visualizationMode, isosurfaceLoading, transectEnabled, transectEnd, transectLoading, probeEnabled, probeLocation, probeLoading])

  // Mean of the previous timestamp at this depth (real slice statistic only),
  // used to display "Mean change" in the inspector.
  const previousTimeMean = React.useMemo(() => {
    if (!selectedDataset || selectedTimeIndex < 1 || (analysisContext === 'historical-event' && historicalAnalysisMode !== 'daily')) return null
    const variableForMean = selectedVariable === "currents" ? "uo" : selectedVariable
    const previousKey = `${selectedDataset}-${variableForMean}-${selectedTimeIndex - 1}-${selectedDepthIndex}`
    return sliceCacheRef.current.get(previousKey)?.tmean ?? null
    // oceanLayer identity changes whenever a slice (and its cache entry) lands
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisContext, historicalAnalysisMode, selectedDataset, selectedTimeIndex, selectedDepthIndex, oceanLayer])

  // Helper to get current speed from vector data
  const getCurrentSpeed = React.useCallback((uoValue: number, voValue: number) => {
    return Math.sqrt(uoValue * uoValue + voValue * voValue)
  }, [])

  const transectDistanceKm = transectStart && transectEnd
    ? greatCircleKilometres([transectStart.latitude, transectStart.longitude], [transectEnd.latitude, transectEnd.longitude])
    : null
  const filteredAlertSummaries = React.useMemo(() => filterAlertSummaries(alertSummaries, alertFilter), [alertSummaries, alertFilter])
  const alertDashboard = React.useMemo(() => alertsFetched ? summarizeAlerts(alertSummaries) : null, [alertSummaries, alertsFetched])
  const selectedRegion = React.useMemo(
    () => regions.find((region) => region.id === selectedRegionId) ?? null,
    [regions, selectedRegionId],
  )
  const activeModelTime = oceanLayer
    ? oceanLayer.type === 'scalar'
      ? oceanLayer.data.slice.actual_time
      : oceanLayer.uo.slice.actual_time
    : datasetMetadata?.time_values?.[selectedTimeIndex] ?? null
  const historicalOceanTime = analysisContext === 'historical-event' && historicalAnalysisMode === 'daily'
    ? datasetMetadata?.time_values?.[selectedTimeIndex] ?? null
    : null
  const currentOperationalModelTime = analysisContext === 'historical-event'
    ? currentContextSnapshotRef.current?.operationalTime ?? null
    : activeModelTime
  const scientificLayersVisible = Boolean(
    analysisContext === 'historical-event'
      ? selectedRegionId === 'bay-of-bengal' && selectedDataset?.startsWith('amphan-2020-') && resolvedDatasetId === selectedDataset
      : selectedRegion?.data_status === 'DATA_BACKED' &&
        regionDetail?.id === selectedRegionId &&
        selectedDataset &&
        regionDetail.model_datasets.some((dataset) => dataset.id === selectedDataset) &&
        resolvedDatasetId === selectedDataset,
  )
  const handleEnterHistoricalOcean = React.useCallback(() => {
    if (historicalEventDetail?.historical_ocean_data?.status !== 'AVAILABLE' || !historicalConfiguration) return
    currentContextSnapshotRef.current = {
      regionId: selectedRegionId,
      datasetId: selectedDataset,
      variable: selectedVariable,
      timeIndex: selectedTimeIndex,
      depthIndex: selectedDepthIndex,
      operationalTime: activeModelTime,
    }
    historicalRequestRef.current += 1
    probeGenerationRef.current += 1
    selectedTimeValueRef.current = null
    setAnalysisContext('historical-event')
    setHistoricalAnalysisMode('daily')
    setHistoricalPhase('before')
    setHistoricalComparison('during-before')
    setSelectedRegionId('bay-of-bengal')
    setSelectedVariable('thetao')
    setSelectedDataset(historicalDatasetForVariable('thetao'))
    setSelectedTimeIndex(0)
    setSelectedDepthIndex(0)
    setVisualizationMode('depth_slice')
    setTransectEnabled(false)
    setTransectDrawMode(false)
    setHistoricalEventVisible(true)
    setArgoVisible(false)
    setAlertsVisible(false)
    setGliderVisible(false)
    setProbeEnabled(false)
    setProbeLocation(null)
    setProbeFrame(null)
  }, [historicalEventDetail, historicalConfiguration, selectedRegionId, selectedDataset, selectedVariable, selectedTimeIndex, selectedDepthIndex, activeModelTime])

  const handleReturnToCurrentOcean = React.useCallback(() => {
    const snapshot = currentContextSnapshotRef.current
    historicalRequestRef.current += 1
    sliceGenerationRef.current += 1
    probeGenerationRef.current += 1
    setAnalysisContext('current')
    setHistoricalDifferenceSummary(null)
    setHistoricalProbeTimeOverride(null)
    setProbeEnabled(false)
    setProbeLocation(null)
    setProbeFrame(null)
    setVisualizationMode('depth_slice')
    if (snapshot) {
      pendingCurrentRestoreRef.current = snapshot
      selectedTimeValueRef.current = snapshot.operationalTime
      setSelectedRegionId(snapshot.regionId)
      setSelectedVariable(snapshot.variable)
      setSelectedDataset(snapshot.datasetId)
      setSelectedTimeIndex(snapshot.timeIndex)
      setSelectedDepthIndex(snapshot.depthIndex)
    }
  }, [])

  const handleHistoricalVariableChange = React.useCallback((variable: HistoricalVariable) => {
    if (variable === 'currents' && historicalAnalysisMode === 'difference') setHistoricalAnalysisMode('phase_mean')
    setSelectedVariable(variable)
  }, [historicalAnalysisMode])

  const handleHistoricalAnalysisModeChange = React.useCallback((mode: HistoricalAnalysisMode) => {
    if (mode === 'difference' && selectedVariable === 'currents') return
    setIsPlaying(false)
    setHistoricalAnalysisMode(mode)
  }, [selectedVariable])

  const handleInspectHistoricalTrackPoint = React.useCallback(() => {
    const point = historicalEventTrack?.points[selectedHistoricalPointIndex]
    if (!point || analysisContext !== 'historical-event') return
    setHistoricalProbeTimeOverride(point.time)
    setProbeEnabled(true)
    setProbeLocation({ latitude: point.latitude, longitude: point.longitude })
    setProbeFrame(null)
    setProbeStatus(null)
    setInspectorOpen(true)
  }, [analysisContext, historicalEventTrack, selectedHistoricalPointIndex])

  const handleRegionSelect = React.useCallback((regionId: string) => {
    if (analysisContext === 'historical-event' && regionId !== 'bay-of-bengal') {
      handleReturnToCurrentOcean()
      pendingCurrentRestoreRef.current = null
    }
    probeGenerationRef.current += 1
    transectGenerationRef.current += 1
    setIsPlaying(false)
    setRegionDetail(null)
    setSelectedDataset(null)
    setResolvedDatasetId(null)
    setOceanLayer(null)
    setSubsurfaceFrame(null)
    setSubsurfaceProgress(null)
    setIsosurfaceFrame(null)
    setIsosurfaceRange(null)
    setIsosurfaceStatus(null)
    setTransectFrame(null)
    setSubsurfaceSample(null)
    setIsosurfaceSample(null)
    setTransectDomain(null)
    setProbeLocation(null)
    setProbeFrame(null)
    setProbeLoading(false)
    setSelectedRegionId(regionId)
  }, [analysisContext, handleReturnToCurrentOcean])
  const handleHistoricalEventSelect = React.useCallback((eventId: string) => {
    setHistoricalEventVisible(false)
    setSelectedHistoricalPointIndex(0)
    setSelectedHistoricalEventId(eventId)
  }, [])
  useEffect(() => {
    if (selectedAlertProfileId && !filteredAlertSummaries.some((summary) => summary.profile_id === selectedAlertProfileId)) {
      setSelectedAlertProfileId(null)
    }
  }, [filteredAlertSummaries, selectedAlertProfileId])

  useEffect(() => {
    if (subsurfaceSample || isosurfaceSample) setInspectorOpen(true)
  }, [subsurfaceSample, isosurfaceSample])

  const handleHistoricalPointSelect = React.useCallback((index: number) => {
    setSelectedHistoricalPointIndex(index)
    setInspectorOpen(true)
  }, [])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setWorkflowOpen(false)
      setInspectorOpen(false)
      if (transectDrawMode) setTransectDrawMode(false)
      if (probeEnabled && !probeLocation) handleProbeEnabledChange(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [transectDrawMode, probeEnabled, probeLocation])

  const activeSlice = oceanLayer?.type === 'scalar' ? oceanLayer.data.slice : oceanLayer?.uo.slice
  const historicalTimeDescription = historicalAnalysisDescription(historicalAnalysisMode, historicalPhase, historicalComparison, historicalConfiguration?.analysis_windows ?? [], historicalOceanTime)

  return (
    <div className="flex h-dvh min-h-dvh w-full min-w-0 flex-col overflow-hidden bg-[#030812]">
      <AppHeader
        backendStatus={backendStatus}
        selectedDataset={selectedDataset}
        regionName={selectedRegion?.name ?? null}
        variable={selectedVariable}
        actualTime={activeSlice?.actual_time ? String(activeSlice.actual_time) : null}
        actualDepth={typeof activeSlice?.actual_depth === 'number' ? activeSlice.actual_depth : null}
        depthUnits={activeSlice?.depth_units ?? null}
        analysisContext={analysisContext}
        historicalMode={historicalAnalysisMode}
        historicalEventName={historicalEventDetail?.name ?? null}
        drawerOpen={inspectorOpen}
        onDrawerToggle={() => { setWorkflowOpen(false); setInspectorOpen((open) => !open) }}
        onWorkflowOpen={() => { setInspectorOpen(false); setWorkflowOpen(true) }}
      />
      <main className={`workspace-shell ${inspectorOpen ? 'inspector-open' : ''} ${workflowOpen ? 'workflow-open' : ''}`}>
        <LeftSidebar
          regions={regions}
          selectedRegionId={selectedRegionId}
          selectedRegion={selectedRegion}
          regionDetail={regionDetail}
          regionsLoading={regionsLoading}
          regionsError={regionsError}
          regionDetailLoading={regionDetailLoading}
          regionDetailError={regionDetailError}
          onRegionSelect={handleRegionSelect}
          datasets={regionDetail?.model_datasets.map((dataset) => dataset.id) ?? []}
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
          alertsVisible={alertsVisible}
          alertsLoading={alertsLoading}
          alertsError={alertsError}
          alertsCount={alertsFetched ? alertSummaries.length : null}
          filteredAlertsCount={filteredAlertSummaries.length}
          alertFilter={alertFilter}
          alertThresholds={alertThresholds}
          alertDashboard={alertDashboard}
          onAlertsToggle={handleAlertsToggle}
          onAlertFilterChange={setAlertFilter}
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
          probeEnabled={probeEnabled}
          probeLocation={probeLocation}
          probeLoading={probeLoading}
          probeStatus={probeStatus}
          onProbeEnabledChange={handleProbeEnabledChange}
          onProbeCoordinateSubmit={handleProbeCoordinateSubmit}
          historicalEvents={historicalEvents}
          selectedHistoricalEventId={selectedHistoricalEventId}
          historicalEventDetail={historicalEventDetail}
          historicalEventTrack={historicalEventTrack}
          historicalEventVisible={historicalEventVisible}
          selectedHistoricalPointIndex={selectedHistoricalPointIndex}
          historicalEventLoading={historicalEventLoading}
          historicalEventError={historicalEventError}
          onHistoricalEventSelect={handleHistoricalEventSelect}
          onHistoricalEventVisibilityChange={setHistoricalEventVisible}
          onHistoricalPointSelect={handleHistoricalPointSelect}
          onHistoricalEventRetry={() => setHistoricalEventRetry((value) => value + 1)}
          analysisContext={analysisContext}
          historicalAnalysisMode={historicalAnalysisMode}
          historicalVariable={selectedVariable}
          historicalPhase={historicalPhase}
          historicalComparison={historicalComparison}
          historicalConfiguration={historicalConfiguration}
          historicalConfigurationLoading={historicalConfigurationLoading}
          historicalConfigurationError={historicalConfigurationError}
          historicalTimeValues={analysisContext === 'historical-event' ? datasetMetadata?.time_values ?? [] : []}
          historicalTimeIndex={selectedTimeIndex}
          historicalOceanTime={historicalOceanTime}
          currentOperationalModelTime={currentOperationalModelTime}
          historicalOceanLoading={sliceLoading}
          historicalOceanError={sliceError}
          historicalDifferenceSummary={historicalDifferenceSummary}
          onEnterHistoricalOcean={handleEnterHistoricalOcean}
          onReturnToCurrentOcean={handleReturnToCurrentOcean}
          onHistoricalAnalysisModeChange={handleHistoricalAnalysisModeChange}
          onHistoricalVariableChange={handleHistoricalVariableChange}
          onHistoricalPhaseChange={setHistoricalPhase}
          onHistoricalComparisonChange={setHistoricalComparison}
          onHistoricalTimeChange={setSelectedTimeIndex}
          onInspectHistoricalTrackPoint={handleInspectHistoricalTrackPoint}
          onRequestClose={() => setWorkflowOpen(false)}
        />
        <section
          aria-label="Cesium globe viewport"
          className="map-workspace"
        >
          <OceanGlobe
            selectedRegion={selectedRegion}
            modelBounds={analysisContext === 'historical-event'
              ? { west: 84, south: 8, east: 92, north: 28 }
              : regionDetail?.model_datasets.find((dataset) => dataset.id === selectedDataset)?.bounds ?? null}
            scientificLayersVisible={scientificLayersVisible}
            oceanLayer={oceanLayer}
            argoProfiles={argoProfiles}
            argoVisible={argoVisible}
            selectedArgoId={selectedArgoId}
            onArgoSelect={handleArgoSelect}
            alertSummaries={filteredAlertSummaries}
            alertsVisible={alertsVisible}
            selectedAlertProfileId={selectedAlertProfileId}
            onAlertSelect={handleAlertSelect}
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
            probeEnabled={probeEnabled}
            probeLocation={probeLocation}
            probeDomain={transectDomain}
            onProbeSelect={handleProbeSelect}
            onProbeError={setProbeStatus}
            historicalEventTrack={historicalEventTrack}
            historicalEventVisible={historicalEventVisible}
            selectedHistoricalPointIndex={selectedHistoricalPointIndex}
            onHistoricalPointSelect={handleHistoricalPointSelect}
          />
          <TemperatureLayerStatus
            isLoading={sliceLoading}
            error={sliceError}
            isEmpty={sliceIsEmpty && !sliceLoading && !sliceError}
          />
          {scientificLayersVisible && oceanLayer && oceanLayer.type === 'scalar' && !sliceLoading && !sliceError && (
            <TemperatureLegend oceanLayer={oceanLayer} timeLevels={timeLevels} />
          )}
          {scientificLayersVisible && subsurfaceProgress && (
            <p role="status" className="absolute left-3 top-3 rounded-md border border-cyan-300/30 bg-[#08111f]/95 px-3 py-2 text-xs text-cyan-100">
              Loading 3D layers {subsurfaceProgress.loaded} / {subsurfaceProgress.total}
            </p>
          )}
          {scientificLayersVisible && visualizationMode === 'isosurface' && (isosurfaceLoading || isosurfaceStatus) && <p role="status" className="absolute left-3 top-3 rounded-md border border-amber-300/30 bg-[#08111f]/95 px-3 py-2 text-xs text-amber-100">{isosurfaceStatus ?? 'Updating frame...'}</p>}
          {scientificLayersVisible && visualizationMode === 'isosurface' && isosurfaceFrame && !isosurfaceLoading && <p className="absolute bottom-3 left-3 rounded-md border border-amber-300/30 bg-[#08111f]/95 px-3 py-2 text-xs text-amber-100">Temperature Isosurface: {isosurfaceFrame.target.toFixed(1)} °C</p>}
          {scientificLayersVisible && transectEnabled && <TransectCrossSection frame={transectFrame} loading={transectLoading} status={transectStatus} />}
          {probeEnabled && !probeLocation && <ToolInstruction title="Ocean Probe active" steps={['Click inside the model domain', 'Esc to cancel']} tone={analysisContext === 'historical-event' ? 'historical' : 'current'} />}
          {transectDrawMode && <ToolInstruction title="Transect selection" steps={[transectStart ? '1. Start point selected' : '1. Select start point', transectStart ? '2. Select end point' : '2. End point follows', 'Esc to cancel']} />}
          {historicalEventVisible && historicalEventDetail && analysisContext === 'current' && <aside className="temporal-context temporal-context--reference" aria-label="Historical reference overlay timing"><p className="temporal-context__label">Historical reference overlay</p><p className="temporal-context__title">{historicalEventDetail.name} · May 2020</p><p>Background ocean field: Operational model · {activeModelTime ? formatSelectedTime(activeModelTime) : 'source time pending'}</p><button type="button" onClick={handleEnterHistoricalOcean} disabled={historicalEventDetail.historical_ocean_data?.status !== 'AVAILABLE' || !historicalConfiguration}>Explore Historical Ocean</button><small>View co-period 2020 reanalysis</small></aside>}
          {analysisContext === 'historical-event' && <aside className="temporal-context temporal-context--historical" aria-label="Historical ocean timing"><p className="temporal-context__label">Ocean Analysis</p><p className="temporal-context__title">{historicalTimeDescription}</p><p>GLORYS12V1 Reanalysis</p><small>Selected Cyclone Track Point: {formatHistoricalUtc(selectedTrackPoint(historicalEventTrack, selectedHistoricalPointIndex)?.time ?? null)}</small><small>Separate time selections; not an exact temporal match.</small></aside>}
        </section>
        {inspectorOpen && <section id="context-inspector" className="context-drawer" aria-label="Contextual scientific inspector">{probeEnabled ? (
          <OceanProbePanel
            frame={probeFrame}
            location={probeLocation}
            loading={probeLoading}
            status={probeStatus}
            error={probeError}
            historical={analysisContext === 'historical-event'}
            modelSource={analysisContext === 'historical-event' ? 'GLORYS12V1 Reanalysis' : selectedRegion?.name ?? 'Current model region'}
            onCancel={handleProbeCancel}
            onRetry={handleProbeRetry}
            onChooseAnother={handleProbeCancel}
          />
        ) : selectedAlertProfileId ? (
          <AlertPanel detail={alertDetail} loading={alertDetailLoading} error={alertDetailError} onClose={() => setInspectorOpen(false)} />
        ) : selectedGliderIndex !== null && gliderMission ? (
          <GliderInspector mission={gliderMission} profile={gliderProfile} loading={gliderProfileLoading} error={gliderError} onSelect={handleGliderSelect} onClose={() => setInspectorOpen(false)} />
        ) : selectedArgoId ? (
          <ArgoInspector
            profile={argoDetail}
            profileLoading={argoDetailLoading}
            profileError={argoDetailError}
            collocation={argoCollocation}
            collocationLoading={collocationLoading}
            collocationError={collocationError}
            onClose={() => setInspectorOpen(false)}
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
            onClose={() => setInspectorOpen(false)}
          />
        )}</section>}
        {gliderVisible && curtainOpen && <div className="absolute inset-x-3 bottom-3 z-40 max-h-[55%] overflow-auto"><GliderCurtain data={curtain} variable={curtainVariable} onVariable={setCurtainVariable} /></div>}
      </main>
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
          timeControlEnabled={analysisContext === 'current' || historicalAnalysisMode === 'daily'}
          timeContextLabel={analysisContext === 'historical-event' && historicalAnalysisMode !== 'daily'
            ? historicalTimeDescription
            : null}
          depthLevels={depthLevels}
          depthValues={datasetMetadata?.depth_values ?? null}
          depthUnits={datasetMetadata?.depth_units ?? null}
          selectedDepthIndex={selectedDepthIndex}
          isLoading={sliceLoading}
          error={sliceError}
          onDepthChange={handleDepthChange}
        />
        {gliderVisible && !curtainOpen && <button type="button" onClick={() => setCurtainOpen(true)} className="fixed bottom-32 right-4 z-30 border border-orange-300/30 bg-[#08111f] px-3 py-2 text-xs text-orange-100">Open mission curtain</button>}
    </div>
  )
}

export default App
