import React from 'react'
import DatasetSelector from '../datasets/DatasetSelector'
import VisualizationControls, { type VisualizationMode } from './VisualizationControls'
import type { SubsurfaceLayerCount, VerticalExaggeration } from '../../lib/subsurfaceFrame'
import type { IsosurfaceQuality } from '../../lib/oceanAnalysis'
import type { GeoPoint } from '../../lib/transect'
import type { ProbeLocation } from '../../lib/oceanProbe'
import type { AlertDashboardSummary } from '../../lib/alerts'
import type { AlertFilter, AlertThresholds } from '../../services/alertApi'
import type { RegionDetail, RegionSummary } from '../../services/regionApi'
import StudyRegionSelector from '../navigation/StudyRegionSelector'
import RegionInfoPanel from '../analysis/RegionInfoPanel'
import HistoricalEventPanel from '../analysis/HistoricalEventPanel'
import type { HistoricalEventDetail, HistoricalEventSummary, HistoricalEventTrack } from '../../services/eventApi'
import type { AnalysisContext, HistoricalAnalysisMode } from '../../lib/historicalOcean'
import type { HistoricalComparison, HistoricalOceanConfiguration, HistoricalPhase, HistoricalVariable } from '../../services/historicalOceanApi'

interface LeftSidebarProps {
  regions: RegionSummary[]
  selectedRegionId: string
  selectedRegion: RegionSummary | null
  regionDetail: RegionDetail | null
  regionsLoading: boolean
  regionsError: string | null
  regionDetailLoading: boolean
  regionDetailError: string | null
  onRegionSelect: (regionId: string) => void
  datasets: string[]
  selectedDataset: string | null
  selectedVariable: "thetao" | "so" | "currents"
  onDatasetSelect: (datasetId: string) => void
  onVariableSelect: (variable: "thetao" | "so" | "currents") => void
  isLoading: boolean
  error: string | null
  argoVisible: boolean
  argoLoading: boolean
  argoError: string | null
  argoCount: number | null
  onArgoToggle: (visible: boolean) => void
  alertsVisible: boolean
  alertsLoading: boolean
  alertsError: string | null
  alertsCount: number | null
  filteredAlertsCount: number
  alertFilter: AlertFilter
  alertThresholds: AlertThresholds | null
  alertDashboard: AlertDashboardSummary | null
  onAlertsToggle: (visible: boolean) => void
  onAlertFilterChange: (filter: AlertFilter) => void
  gliderVisible: boolean
  gliderLoading: boolean
  gliderError: string | null
  gliderCount: number | null
  onGliderToggle: (visible: boolean) => void
  visualizationMode: VisualizationMode
  subsurfaceLayerCount: SubsurfaceLayerCount
  verticalExaggeration: VerticalExaggeration
  subsurfaceOpacityPercent: number
  onVisualizationModeChange: (mode: VisualizationMode) => void
  onSubsurfaceLayerCountChange: (count: SubsurfaceLayerCount) => void
  onVerticalExaggerationChange: (scale: VerticalExaggeration) => void
  onSubsurfaceOpacityChange: (opacity: number) => void
  isosurfaceTarget: number | null
  isosurfaceRange: { min: number; max: number } | null
  isosurfaceQuality: IsosurfaceQuality
  isosurfaceOpacityPercent: number
  onIsosurfaceTargetChange: (target: number) => void
  onIsosurfaceQualityChange: (quality: IsosurfaceQuality) => void
  onIsosurfaceOpacityChange: (opacity: number) => void
  transectEnabled: boolean
  transectDrawMode: boolean
  transectStart: GeoPoint | null
  transectEnd: GeoPoint | null
  transectDistanceKm: number | null
  transectSampleCount: 50 | 100 | 200
  transectStatus: string | null
  onTransectEnabledChange: (enabled: boolean) => void
  onDrawTransect: () => void
  onClearTransect: () => void
  onTransectSampleCountChange: (count: 50 | 100 | 200) => void
  probeEnabled: boolean
  probeLocation: ProbeLocation | null
  probeLoading: boolean
  probeStatus: string | null
  onProbeEnabledChange: (enabled: boolean) => void
  onProbeCoordinateSubmit: (location: ProbeLocation) => void
  historicalEvents: HistoricalEventSummary[]
  selectedHistoricalEventId: string
  historicalEventDetail: HistoricalEventDetail | null
  historicalEventTrack: HistoricalEventTrack | null
  historicalEventVisible: boolean
  selectedHistoricalPointIndex: number
  historicalEventLoading: boolean
  historicalEventError: string | null
  onHistoricalEventSelect: (eventId: string) => void
  onHistoricalEventVisibilityChange: (visible: boolean) => void
  onHistoricalPointSelect: (index: number) => void
  onHistoricalEventRetry: () => void
  analysisContext: AnalysisContext
  historicalAnalysisMode: HistoricalAnalysisMode
  historicalVariable: HistoricalVariable
  historicalPhase: HistoricalPhase
  historicalComparison: HistoricalComparison
  historicalConfiguration: HistoricalOceanConfiguration | null
  historicalConfigurationLoading: boolean
  historicalConfigurationError: string | null
  historicalTimeValues: string[]
  historicalTimeIndex: number
  historicalOceanTime: string | null
  currentOperationalModelTime: string | null
  historicalOceanLoading: boolean
  historicalOceanError: string | null
  historicalDifferenceSummary: {
    finitePairedCellCount: number
    mean: number
    minimum: number
    maximum: number
    units: string
  } | null
  onEnterHistoricalOcean: () => void
  onReturnToCurrentOcean: () => void
  onHistoricalAnalysisModeChange: (mode: HistoricalAnalysisMode) => void
  onHistoricalVariableChange: (variable: HistoricalVariable) => void
  onHistoricalPhaseChange: (phase: HistoricalPhase) => void
  onHistoricalComparisonChange: (comparison: HistoricalComparison) => void
  onHistoricalTimeChange: (index: number) => void
  onInspectHistoricalTrackPoint: () => void
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  regions,
  selectedRegionId,
  selectedRegion,
  regionDetail,
  regionsLoading,
  regionsError,
  regionDetailLoading,
  regionDetailError,
  onRegionSelect,
  datasets,
  selectedDataset,
  selectedVariable,
  onDatasetSelect,
  onVariableSelect,
  isLoading,
  error,
  argoVisible,
  argoLoading,
  argoError,
  argoCount,
  onArgoToggle,
  alertsVisible, alertsLoading, alertsError, alertsCount, filteredAlertsCount, alertFilter, alertThresholds, alertDashboard,
  onAlertsToggle, onAlertFilterChange,
  gliderVisible, gliderLoading, gliderError, gliderCount, onGliderToggle,
  visualizationMode, subsurfaceLayerCount, verticalExaggeration, subsurfaceOpacityPercent,
  onVisualizationModeChange, onSubsurfaceLayerCountChange, onVerticalExaggerationChange,
  onSubsurfaceOpacityChange,
  isosurfaceTarget, isosurfaceRange, isosurfaceQuality, isosurfaceOpacityPercent,
  onIsosurfaceTargetChange, onIsosurfaceQualityChange, onIsosurfaceOpacityChange,
  transectEnabled, transectDrawMode, transectStart, transectEnd, transectDistanceKm, transectSampleCount, transectStatus,
  onTransectEnabledChange, onDrawTransect, onClearTransect, onTransectSampleCountChange,
  probeEnabled, probeLocation, probeLoading, probeStatus, onProbeEnabledChange, onProbeCoordinateSubmit,
  historicalEvents, selectedHistoricalEventId, historicalEventDetail, historicalEventTrack,
  historicalEventVisible, selectedHistoricalPointIndex,
  historicalEventLoading, historicalEventError, onHistoricalEventSelect,
  onHistoricalEventVisibilityChange, onHistoricalPointSelect, onHistoricalEventRetry,
  analysisContext, historicalAnalysisMode, historicalVariable, historicalPhase,
  historicalComparison, historicalConfiguration, historicalConfigurationLoading,
  historicalConfigurationError, historicalTimeValues,
  historicalTimeIndex, historicalOceanTime, currentOperationalModelTime,
  historicalOceanLoading, historicalOceanError,
  historicalDifferenceSummary, onEnterHistoricalOcean, onReturnToCurrentOcean,
  onHistoricalAnalysisModeChange, onHistoricalVariableChange,
  onHistoricalPhaseChange, onHistoricalComparisonChange, onHistoricalTimeChange,
  onInspectHistoricalTrackPoint,
}) => {
  const [probeLatitude, setProbeLatitude] = React.useState('')
  const [probeLongitude, setProbeLongitude] = React.useState('')
  const temperatureAvailable = regionDetail?.supported_variables.includes('Temperature') ?? false
  const salinityAvailable = regionDetail?.supported_variables.includes('Salinity') ?? false
  const currentsAvailable = regionDetail?.supported_variables.includes('Currents') ?? false
  const argoAvailable = regionDetail?.observation_sources.includes('ARGO') ?? false
  const gliderAvailable = regionDetail?.observation_sources.includes('Spray Glider') ?? false
  const alertsAvailable = regionDetail?.analysis_capabilities.includes('Model-Observation Alerts') ?? false
  const handleVariableChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value === 'thetao' || value === 'so' || value === 'currents') {
      onVariableSelect(value as "thetao" | "so" | "currents")
    }
  }

  return (
    <aside
      aria-labelledby="left-sidebar-title"
      className="w-full shrink-0 border border-white/10 bg-[#08111f] lg:h-full lg:min-h-0 lg:w-64 lg:border-y-0 lg:border-l-0 lg:overflow-y-auto"
    >
      <div className="flex flex-col gap-5 px-4 py-5">
        <StudyRegionSelector
          regions={regions}
          selectedRegionId={selectedRegionId}
          loading={regionsLoading}
          error={regionsError}
          onSelect={onRegionSelect}
        />
        <RegionInfoPanel
          region={selectedRegion}
          detail={regionDetail}
          detailLoading={regionDetailLoading}
          detailError={regionDetailError}
          activeDatasetId={selectedDataset}
        />
        <section aria-labelledby="variable-section-title" className="space-y-2">
          <h3
            id="variable-section-title"
            className="text-[11px] font-semibold uppercase tracking-[0.08em] text-cyan-200/80"
          >
            Variable
          </h3>
          <div className="space-y-2">
            <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
              <input
                type="radio"
                value="thetao"
                checked={selectedVariable === "thetao"}
                disabled={!temperatureAvailable}
                onChange={handleVariableChange}
                aria-label="Temperature"
                className="h-4 w-4 accent-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
              />
              <span className="font-medium text-white">Temperature</span>
            </label>
            <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
              <input
                type="radio"
                value="so"
                checked={selectedVariable === "so"}
                disabled={!salinityAvailable}
                onChange={handleVariableChange}
                aria-label="Salinity"
                className="h-4 w-4 accent-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
              />
              <span className="font-medium text-white">Salinity</span>
            </label>
            <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
              <input
                type="radio"
                value="currents"
                checked={selectedVariable === "currents"}
                disabled={!currentsAvailable}
                onChange={handleVariableChange}
                aria-label="Ocean Currents"
                className="h-4 w-4 accent-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
              />
              <span className="font-medium text-white">Ocean Currents</span>
            </label>
          </div>
        </section>

        {analysisContext === 'current' && <VisualizationControls
          selectedVariable={selectedVariable}
          mode={visualizationMode}
          layerCount={subsurfaceLayerCount}
          verticalExaggeration={verticalExaggeration}
          opacityPercent={subsurfaceOpacityPercent}
          onModeChange={onVisualizationModeChange}
          onLayerCountChange={onSubsurfaceLayerCountChange}
          onVerticalExaggerationChange={onVerticalExaggerationChange}
          onOpacityChange={onSubsurfaceOpacityChange}
          isosurfaceTarget={isosurfaceTarget}
          isosurfaceRange={isosurfaceRange}
          isosurfaceQuality={isosurfaceQuality}
          isosurfaceOpacityPercent={isosurfaceOpacityPercent}
          onIsosurfaceTargetChange={onIsosurfaceTargetChange}
          onIsosurfaceQualityChange={onIsosurfaceQualityChange}
          onIsosurfaceOpacityChange={onIsosurfaceOpacityChange}
        />}

        <section aria-labelledby="analysis-section-title" className="space-y-3">
          <h4 id="analysis-section-title" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Analysis</h4>
          <HistoricalEventPanel
            events={historicalEvents}
            selectedEventId={selectedHistoricalEventId}
            detail={historicalEventDetail}
            track={historicalEventTrack}
            visible={historicalEventVisible}
            selectedPointIndex={selectedHistoricalPointIndex}
            loading={historicalEventLoading}
            error={historicalEventError}
            onEventSelect={onHistoricalEventSelect}
            onVisibilityChange={onHistoricalEventVisibilityChange}
            onPointSelect={onHistoricalPointSelect}
            onRetry={onHistoricalEventRetry}
            analysisContext={analysisContext}
            analysisMode={historicalAnalysisMode}
            historicalVariable={historicalVariable}
            historicalPhase={historicalPhase}
            historicalComparison={historicalComparison}
            configuration={historicalConfiguration}
            configurationLoading={historicalConfigurationLoading}
            configurationError={historicalConfigurationError}
            historicalTimeValues={historicalTimeValues}
            historicalTimeIndex={historicalTimeIndex}
            historicalOceanTime={historicalOceanTime}
            currentOperationalModelTime={currentOperationalModelTime}
            differenceSummary={historicalDifferenceSummary}
            oceanLoading={analysisContext === 'historical-event' && historicalOceanLoading}
            oceanError={analysisContext === 'historical-event' ? historicalOceanError : null}
            onEnterHistoricalOcean={onEnterHistoricalOcean}
            onReturnToCurrentOcean={onReturnToCurrentOcean}
            onAnalysisModeChange={onHistoricalAnalysisModeChange}
            onHistoricalVariableChange={onHistoricalVariableChange}
            onHistoricalPhaseChange={onHistoricalPhaseChange}
            onHistoricalComparisonChange={onHistoricalComparisonChange}
            onHistoricalTimeChange={onHistoricalTimeChange}
            onInspectTrackPoint={onInspectHistoricalTrackPoint}
          />
          <div className={`border px-3 py-3 ${probeEnabled ? 'border-cyan-300/40 bg-cyan-950/20' : 'border-white/10 bg-[#0b1524]'}`}>
            <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-white">Ocean Probe</span><button type="button" aria-pressed={probeEnabled} onClick={() => onProbeEnabledChange(!probeEnabled)} className="min-h-11 border border-cyan-300/40 px-3 text-xs font-medium text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">{probeEnabled ? 'Disable Probe' : 'Enable Probe'}</button></div>
            {probeEnabled && <div className="mt-2 space-y-2 text-xs"><p className="text-slate-400">Sampling: Nearest model-grid point</p><form onSubmit={(event) => { event.preventDefault(); const latitude = Number(probeLatitude); const longitude = Number(probeLongitude); if (Number.isFinite(latitude) && Number.isFinite(longitude)) onProbeCoordinateSubmit({ latitude, longitude }) }} className="grid grid-cols-2 gap-2" aria-label="Set probe coordinates"><label className="text-slate-400">Latitude<input type="number" step="any" required value={probeLatitude} onChange={(event) => setProbeLatitude(event.target.value)} className="mt-1 min-h-11 w-full border border-white/15 bg-[#08111f] px-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300" /></label><label className="text-slate-400">Longitude<input type="number" step="any" required value={probeLongitude} onChange={(event) => setProbeLongitude(event.target.value)} className="mt-1 min-h-11 w-full border border-white/15 bg-[#08111f] px-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300" /></label><button type="submit" className="col-span-2 min-h-11 border border-white/15 bg-[#08111f] px-3 text-xs font-medium text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">Set Probe Coordinates</button></form>{probeLocation && <p className="text-slate-300">Requested: {probeLocation.latitude.toFixed(4)}, {probeLocation.longitude.toFixed(4)}</p>}{probeLoading && <p role="status" className="text-cyan-100">Loading model profiles...</p>}{!probeLoading && probeStatus && <p role="status" className="text-amber-200">{probeStatus}</p>}</div>}
          </div>
          {analysisContext === 'current' && <><label className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${transectEnabled ? 'border-lime-300/40 bg-lime-950/20' : 'border-white/10 bg-[#0b1524]'}`}><input type="checkbox" checked={transectEnabled} disabled={selectedVariable !== 'thetao'} onChange={(event) => onTransectEnabledChange(event.target.checked)} className="h-4 w-4 accent-lime-400" /><span className="font-medium text-white">Vertical Transect</span></label>
          {selectedVariable !== 'thetao' && <p className="text-xs text-slate-400">Vertical Transect currently supports Temperature.</p>}
          {transectEnabled && selectedVariable === 'thetao' && <div className="space-y-2 border-t border-white/10 pt-3">
            <div className="grid grid-cols-2 gap-2"><button type="button" onClick={onDrawTransect} disabled={transectDrawMode} className="rounded-md border border-lime-300/40 bg-lime-950/20 px-2 py-2 text-xs font-medium text-lime-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-300 disabled:cursor-crosshair disabled:opacity-70">{transectDrawMode ? (transectStart ? 'Choose end point' : 'Choose start point') : 'Draw Transect'}</button><button type="button" onClick={onClearTransect} disabled={!transectStart && !transectEnd} className="rounded-md border border-white/15 bg-[#0b1524] px-2 py-2 text-xs font-medium text-slate-300 disabled:opacity-40">Clear Transect</button></div>
            <label className="block text-xs text-slate-300"><span className="mb-1 block text-slate-400">Samples</span><select value={transectSampleCount} onChange={(event) => onTransectSampleCountChange(Number(event.target.value) as 50 | 100 | 200)} className="w-full rounded-md border border-white/15 bg-[#0b1524] px-2 py-1.5 text-sm text-white">{[50, 100, 200].map((count) => <option key={count} value={count}>{count}</option>)}</select></label>
            <p className="text-xs text-slate-400">Horizontal sampling: Nearest model-grid point</p>
            {transectStart && <p className="text-xs text-slate-300">Start: {transectStart.latitude.toFixed(4)}, {transectStart.longitude.toFixed(4)}</p>}
            {transectEnd && <p className="text-xs text-slate-300">End: {transectEnd.latitude.toFixed(4)}, {transectEnd.longitude.toFixed(4)}</p>}
            {transectDistanceKm !== null && <p className="text-xs text-slate-300">Distance: {transectDistanceKm.toFixed(1)} km</p>}
            {transectStatus && <p role="status" className="text-xs text-amber-200">{transectStatus}</p>}
          </div>}</>}
        </section>

        <section aria-labelledby="dataset-section-title" className="space-y-2">
          <h4
            id="dataset-section-title"
            className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400"
          >
            Dataset context
          </h4>
          {analysisContext === 'historical-event' ? <div className="border border-amber-300/25 bg-[#0b1524] p-3 text-xs"><p className="text-slate-400">Historical model dataset</p><p className="mt-1 break-all font-medium text-amber-100">{selectedDataset ?? 'Resolving dataset...'}</p><p className="mt-1 text-slate-400">Operational datasets are isolated while this context is active.</p></div> : <DatasetSelector
            datasets={datasets}
            selectedDataset={selectedDataset}
            onSelect={onDatasetSelect}
            isLoading={isLoading}
            error={error}
          />}
        </section>

        <section aria-labelledby="layer-section-title" className="space-y-2">
          <h4
            id="layer-section-title"
            className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400"
          >
            Layer categories
          </h4>
          <ul className="space-y-1.5">
            {/* We keep the layer categories for compatibility, but they are now driven by variable selection */}
            <li
              key="Temperature"
              aria-disabled={!temperatureAvailable}
              aria-current={selectedVariable === "thetao" ? 'true' : undefined}
              className={
                selectedVariable === "thetao"
                  ? 'flex min-h-[2.25rem] items-center justify-between gap-3 rounded-md border border-cyan-300/40 bg-cyan-950/30 px-3 py-2 text-sm'
                  : 'flex min-h-[2.25rem] items-center justify-between gap-3 rounded-md border border-white/10 bg-[#0b1524] px-3 py-2 text-sm'
              }
            >
              <span className="font-medium text-white">Temperature</span>
              <span className="text-[11px] font-semibold tracking-[0.04em] text-cyan-200">
                {!temperatureAvailable ? 'Unavailable' : selectedVariable === "thetao" ? 'Selected' : 'Available'}
              </span>
            </li>
            <li
              key="Salinity"
              aria-disabled={!salinityAvailable}
              aria-current={selectedVariable === "so" ? 'true' : undefined}
              className={
                selectedVariable === "so"
                  ? 'flex min-h-[2.25rem] items-center justify-between gap-3 rounded-md border border-cyan-300/40 bg-cyan-950/30 px-3 py-2 text-sm'
                  : 'flex min-h-[2.25rem] items-center justify-between gap-3 rounded-md border border-white/10 bg-[#0b1524] px-3 py-2 text-sm'
              }
            >
              <span className="font-medium text-white">Salinity</span>
              <span className="text-[11px] font-semibold tracking-[0.04em] text-cyan-200">
                {!salinityAvailable ? 'Unavailable' : selectedVariable === "so" ? 'Selected' : 'Available'}
              </span>
            </li>
            <li
              key="Ocean Currents"
              aria-disabled={!currentsAvailable}
              aria-current={selectedVariable === "currents" ? 'true' : undefined}
              className={
                selectedVariable === "currents"
                  ? 'flex min-h-[2.25rem] items-center justify-between gap-3 rounded-md border border-cyan-300/40 bg-cyan-950/30 px-3 py-2 text-sm'
                  : 'flex min-h-[2.25rem] items-center justify-between gap-3 rounded-md border border-white/10 bg-[#0b1524] px-3 py-2 text-sm'
              }
            >
              <span className="font-medium text-white">Ocean Currents</span>
              <span className="text-[11px] font-semibold tracking-[0.04em] text-cyan-200">
                {!currentsAvailable ? 'Unavailable' : selectedVariable === "currents" ? 'Selected' : 'Available'}
              </span>
            </li>
          </ul>
        </section>

        {analysisContext === 'current' ? <section aria-labelledby="observation-section-title" className="space-y-2">
          <h4
            id="observation-section-title"
            className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400"
          >
            Observations
          </h4>
          <label
            className={`flex min-h-[2.25rem] items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm ${
              argoAvailable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
            } ${
              argoVisible
                ? 'border-cyan-300/40 bg-cyan-950/30'
                : 'border-white/10 bg-[#0b1524]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={argoVisible}
                disabled={!argoAvailable}
                onChange={(event) => onArgoToggle(event.target.checked)}
                aria-label="Show ARGO floats"
                className="h-4 w-4 accent-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
              />
              <span className="font-medium text-white">ARGO Floats</span>
            </span>
            <span className="text-[11px] font-medium tracking-[0.02em] text-slate-400">
              {!argoAvailable
                ? 'Unavailable'
                : argoLoading
                  ? 'Loading…'
                : argoError
                  ? 'Unavailable'
                  : argoCount !== null && argoVisible
                    ? `${argoCount} profiles`
                    : ''}
            </span>
          </label>
          {argoError && argoVisible && (
            <p
              role="alert"
              className="rounded-md border border-red-400/40 bg-red-950/40 px-3 py-2 text-xs text-red-200"
            >
              {argoError}
            </p>
          )}
          {argoVisible && !argoLoading && !argoError && argoCount === 0 && (
            <p role="status" className="rounded-md border border-white/10 bg-[#0b1524] px-3 py-2 text-xs text-slate-300">
              No ARGO observations returned by the backend.
            </p>
          )}
          <label className={`flex min-h-11 items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm ${alertsAvailable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} ${alertsVisible ? 'border-amber-300/40 bg-amber-950/20' : 'border-white/10 bg-[#0b1524]'}`}>
            <span className="flex min-w-0 items-center gap-2.5"><input type="checkbox" checked={alertsVisible} disabled={!alertsAvailable} onChange={(event) => onAlertsToggle(event.target.checked)} aria-label="Show model-observation alerts" className="h-4 w-4 accent-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"/><span className="font-medium text-white">Model-Observation Alerts</span></span>
            <span className="shrink-0 text-[11px] text-slate-400">{!alertsAvailable ? 'Unavailable' : alertsLoading ? 'Loading...' : alertsError ? 'Unavailable' : alertsVisible && alertsCount !== null ? `${alertsCount} profiles` : ''}</span>
          </label>
          {alertsError && alertsVisible && <p role="alert" className="border border-red-400/40 bg-red-950/30 p-3 text-xs text-red-200">{alertsError}</p>}
          {alertsVisible && !alertsLoading && !alertsError && alertsCount === 0 && <p role="status" className="border border-white/10 bg-[#0b1524] p-3 text-xs text-slate-300">No assessable collocations are available.</p>}
          {alertsVisible && !alertsLoading && !alertsError && alertsCount !== null && alertsCount > 0 && <div className="space-y-3 border border-white/10 bg-[#0b1524] p-3 text-xs">
            <label className="block text-slate-300"><span className="mb-1 block text-slate-400">Map filter</span><select value={alertFilter} onChange={(event) => onAlertFilterChange(event.target.value as AlertFilter)} className="min-h-11 w-full border border-white/15 bg-[#08111f] px-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"><option value="all">All</option><option value="moderate_plus">Moderate+</option><option value="high">High only</option></select></label>
            {filteredAlertsCount === 0 && <p role="status" className="text-amber-200">No alerts match the selected filter.</p>}
            {alertThresholds && <div className="space-y-1 text-slate-400"><p className="text-amber-100">{alertThresholds.label}</p><p>Normal below {alertThresholds.normal_max_c.toFixed(2)} °C</p><p>Moderate below {alertThresholds.moderate_max_c.toFixed(2)} °C</p><p>High from {alertThresholds.moderate_max_c.toFixed(2)} °C</p></div>}
            {alertDashboard && <div><p className="mb-2 font-semibold uppercase tracking-[0.08em] text-slate-400">Model-Observation Status</p><dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-300"><dt>Profiles checked</dt><dd className="text-right text-white">{alertDashboard.profilesChecked}</dd><dt>Normal</dt><dd className="text-right text-cyan-200">{alertDashboard.normal}</dd><dt>Moderate</dt><dd className="text-right text-amber-200">{alertDashboard.moderate}</dd><dt>High</dt><dd className="text-right text-red-200">{alertDashboard.high}</dd><dt>Not assessable</dt><dd className="text-right text-slate-300">{alertDashboard.notAssessable}</dd><dt>Matched levels</dt><dd className="text-right text-white">{alertDashboard.totalMatchedLevels}</dd></dl></div>}
          </div>}
          <label className={`flex min-h-[2.25rem] items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm ${gliderAvailable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'} ${gliderVisible ? 'border-orange-300/40 bg-orange-950/30' : 'border-white/10 bg-[#0b1524]'}`}>
            <span className="flex items-center gap-2.5"><input type="checkbox" checked={gliderVisible} disabled={!gliderAvailable} onChange={e=>onGliderToggle(e.target.checked)} aria-label="Show Gliders" className="h-4 w-4 accent-orange-400"/><span className="font-medium text-white">Gliders</span></span>
            <span className="text-[11px] text-slate-400">{!gliderAvailable?'Unavailable':gliderLoading?'Loading…':gliderError?'Unavailable':gliderVisible&&gliderCount!==null?`${gliderCount} profiles`:''}</span>
          </label>
          {gliderError&&gliderVisible&&<p role="alert" className="text-xs text-red-200">{gliderError}</p>}
        </section> : <section aria-labelledby="historical-observation-note" className="border-t border-white/10 pt-3"><h4 id="historical-observation-note" className="text-xs font-semibold text-slate-200">Observation comparison unavailable</h4><p className="mt-1 text-xs leading-5 text-slate-400">Amphan ocean fields are model reanalysis. No contemporaneous ARGO or glider validation is included, so bias and error metrics are not shown.</p></section>}
      </div>
    </aside>
  )
}

export default LeftSidebar
