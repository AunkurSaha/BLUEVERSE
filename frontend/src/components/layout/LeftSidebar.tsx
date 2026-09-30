import React from 'react'
import VisualizationControls, { type VisualizationMode } from './VisualizationControls'
import WorkflowSection from './WorkflowSection'
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

interface Props {
  regions: RegionSummary[]; selectedRegionId: string; selectedRegion: RegionSummary | null; regionDetail: RegionDetail | null
  regionsLoading: boolean; regionsError: string | null; regionDetailLoading: boolean; regionDetailError: string | null; onRegionSelect: (id: string) => void
  datasets: string[]; selectedDataset: string | null; selectedVariable: 'thetao' | 'so' | 'currents'; onDatasetSelect: (id: string) => void; onVariableSelect: (value: 'thetao' | 'so' | 'currents') => void; isLoading: boolean; error: string | null
  argoVisible: boolean; argoLoading: boolean; argoError: string | null; argoCount: number | null; onArgoToggle: (visible: boolean) => void
  alertsVisible: boolean; alertsLoading: boolean; alertsError: string | null; alertsCount: number | null; filteredAlertsCount: number; alertFilter: AlertFilter; alertThresholds: AlertThresholds | null; alertDashboard: AlertDashboardSummary | null; onAlertsToggle: (visible: boolean) => void; onAlertFilterChange: (filter: AlertFilter) => void
  gliderVisible: boolean; gliderLoading: boolean; gliderError: string | null; gliderCount: number | null; onGliderToggle: (visible: boolean) => void
  visualizationMode: VisualizationMode; subsurfaceLayerCount: SubsurfaceLayerCount; verticalExaggeration: VerticalExaggeration; subsurfaceOpacityPercent: number
  onVisualizationModeChange: (mode: VisualizationMode) => void; onSubsurfaceLayerCountChange: (count: SubsurfaceLayerCount) => void; onVerticalExaggerationChange: (scale: VerticalExaggeration) => void; onSubsurfaceOpacityChange: (value: number) => void
  isosurfaceTarget: number | null; isosurfaceRange: { min: number; max: number } | null; isosurfaceQuality: IsosurfaceQuality; isosurfaceOpacityPercent: number; onIsosurfaceTargetChange: (value: number) => void; onIsosurfaceQualityChange: (value: IsosurfaceQuality) => void; onIsosurfaceOpacityChange: (value: number) => void
  transectEnabled: boolean; transectDrawMode: boolean; transectStart: GeoPoint | null; transectEnd: GeoPoint | null; transectDistanceKm: number | null; transectSampleCount: 50 | 100 | 200; transectStatus: string | null; onTransectEnabledChange: (enabled: boolean) => void; onDrawTransect: () => void; onClearTransect: () => void; onTransectSampleCountChange: (count: 50 | 100 | 200) => void
  probeEnabled: boolean; probeLocation: ProbeLocation | null; probeLoading: boolean; probeStatus: string | null; onProbeEnabledChange: (enabled: boolean) => void; onProbeCoordinateSubmit: (location: ProbeLocation) => void
  historicalEvents: HistoricalEventSummary[]; selectedHistoricalEventId: string; historicalEventDetail: HistoricalEventDetail | null; historicalEventTrack: HistoricalEventTrack | null; historicalEventVisible: boolean; selectedHistoricalPointIndex: number; historicalEventLoading: boolean; historicalEventError: string | null; onHistoricalEventSelect: (id: string) => void; onHistoricalEventVisibilityChange: (visible: boolean) => void; onHistoricalPointSelect: (index: number) => void; onHistoricalEventRetry: () => void
  analysisContext: AnalysisContext; historicalAnalysisMode: HistoricalAnalysisMode; historicalVariable: HistoricalVariable; historicalPhase: HistoricalPhase; historicalComparison: HistoricalComparison; historicalConfiguration: HistoricalOceanConfiguration | null; historicalConfigurationLoading: boolean; historicalConfigurationError: string | null; historicalTimeValues: string[]; historicalTimeIndex: number; historicalOceanTime: string | null; currentOperationalModelTime: string | null; historicalOceanLoading: boolean; historicalOceanError: string | null; historicalDifferenceSummary: { finitePairedCellCount: number; mean: number; minimum: number; maximum: number; units: string } | null
  onEnterHistoricalOcean: () => void; onReturnToCurrentOcean: () => void; onHistoricalAnalysisModeChange: (mode: HistoricalAnalysisMode) => void; onHistoricalVariableChange: (variable: HistoricalVariable) => void; onHistoricalPhaseChange: (phase: HistoricalPhase) => void; onHistoricalComparisonChange: (comparison: HistoricalComparison) => void; onHistoricalTimeChange: (index: number) => void; onInspectHistoricalTrackPoint: () => void
  onRequestClose?: () => void
}

const variableLabels = { thetao: 'Temperature', so: 'Salinity', currents: 'Currents' } as const

export default function LeftSidebar(props: Props) {
  const [probeLatitude, setProbeLatitude] = React.useState('')
  const [probeLongitude, setProbeLongitude] = React.useState('')
  const [observationsOpen, setObservationsOpen] = React.useState(false)
  const available = {
    thetao: props.regionDetail?.supported_variables.includes('Temperature') ?? false,
    so: props.regionDetail?.supported_variables.includes('Salinity') ?? false,
    currents: props.regionDetail?.supported_variables.includes('Currents') ?? false,
  }
  const argoAvailable = props.regionDetail?.observation_sources.includes('ARGO') ?? false
  const gliderAvailable = props.regionDetail?.observation_sources.includes('Spray Glider') ?? false
  const alertsAvailable = props.regionDetail?.analysis_capabilities.includes('Model-Observation Alerts') ?? false
  const historical = props.analysisContext === 'historical-event'

  return (
    <aside id="workflow-sidebar" aria-label="Scientific workflow" className="workflow-sidebar">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3 lg:hidden"><p className="text-sm font-semibold text-white">Workflow</p><button type="button" onClick={props.onRequestClose} className="drawer-close">Close</button></div>
      <div className="scientific-scroll h-full overflow-y-auto px-4 py-4">
        <WorkflowSection id="where" label="WHERE" summary="Choose the ocean study area">
          <StudyRegionSelector regions={props.regions} selectedRegionId={props.selectedRegionId} loading={props.regionsLoading} error={props.regionsError} onSelect={props.onRegionSelect} />
          <p className={`mt-2 text-[11px] ${props.selectedRegion?.data_status === 'DATA_BACKED' ? 'text-cyan-200' : 'text-amber-200'}`}>{props.selectedRegion?.data_status === 'DATA_BACKED' ? '● Data-backed region' : '○ Navigation-only region'}</p>
          <details className="compact-details"><summary>Region and dataset info</summary><RegionInfoPanel region={props.selectedRegion} detail={props.regionDetail} detailLoading={props.regionDetailLoading} detailError={props.regionDetailError} activeDatasetId={props.selectedDataset} /></details>
        </WorkflowSection>

        <WorkflowSection id="what" label="WHAT" summary="Choose the model variable">
          <div className="segmented-control segmented-control--variables" role="radiogroup" aria-label="Scientific variable">
            {(Object.keys(variableLabels) as Array<keyof typeof variableLabels>).map((variable) => <button key={variable} type="button" role="radio" aria-checked={props.selectedVariable === variable} disabled={!available[variable]} onClick={() => props.onVariableSelect(variable)}>{variableLabels[variable]}</button>)}
          </div>
        </WorkflowSection>

        <WorkflowSection id="explore" label="EXPLORE" summary={historical ? 'Historical fields support 2D map only' : 'Choose how the field is rendered'}>
          {historical ? <div className="unsupported-note"><p>2D Map active</p><span>Historical 3D, isosurface, and transect are not supported.</span></div> : <>
            <VisualizationControls selectedVariable={props.selectedVariable} mode={props.visualizationMode} layerCount={props.subsurfaceLayerCount} verticalExaggeration={props.verticalExaggeration} opacityPercent={props.subsurfaceOpacityPercent} onModeChange={props.onVisualizationModeChange} onLayerCountChange={props.onSubsurfaceLayerCountChange} onVerticalExaggerationChange={props.onVerticalExaggerationChange} onOpacityChange={props.onSubsurfaceOpacityChange} isosurfaceTarget={props.isosurfaceTarget} isosurfaceRange={props.isosurfaceRange} isosurfaceQuality={props.isosurfaceQuality} isosurfaceOpacityPercent={props.isosurfaceOpacityPercent} onIsosurfaceTargetChange={props.onIsosurfaceTargetChange} onIsosurfaceQualityChange={props.onIsosurfaceQualityChange} onIsosurfaceOpacityChange={props.onIsosurfaceOpacityChange} />
            <button type="button" className={`tool-row mt-2 ${props.transectEnabled ? 'active' : ''}`} disabled={props.selectedVariable !== 'thetao'} aria-pressed={props.transectEnabled} onClick={() => props.onTransectEnabledChange(!props.transectEnabled)}><span>Transect</span><small>{props.selectedVariable !== 'thetao' ? 'Temperature only' : props.transectEnabled ? 'Active' : 'Select section'}</small></button>
            {props.transectEnabled && <div className="tool-settings"><p className="tool-state">TRANSECT <span>{props.transectDrawMode ? (props.transectStart ? 'Select end point' : 'Select start point') : props.transectEnd ? 'Ready' : 'Waiting'}</span></p><button type="button" onClick={props.onDrawTransect} disabled={props.transectDrawMode}>{props.transectDrawMode ? 'Selection active' : 'Select points on globe'}</button><button type="button" onClick={props.onClearTransect} disabled={!props.transectStart && !props.transectEnd}>Clear</button><label>Samples<select value={props.transectSampleCount} onChange={(event) => props.onTransectSampleCountChange(Number(event.target.value) as 50 | 100 | 200)}>{[50, 100, 200].map((count) => <option key={count}>{count}</option>)}</select></label>{props.transectStatus && <p role="status" className="control-note">{props.transectStatus}</p>}</div>}
          </>}
        </WorkflowSection>

        <WorkflowSection id="analyse" label="ANALYSE" summary="Activate one scientific task">
          <div className="space-y-2">
            <button type="button" className={`tool-row ${props.probeEnabled ? 'active' : ''}`} aria-pressed={props.probeEnabled} onClick={() => props.onProbeEnabledChange(!props.probeEnabled)}><span>Ocean Probe</span><small>{props.probeEnabled ? 'Click globe' : 'Profiles by location'}</small></button>
            {props.probeEnabled && <div className="tool-settings"><p className="control-note">Click inside the model domain, or enter coordinates.</p><form onSubmit={(event) => { event.preventDefault(); const latitude = Number(probeLatitude); const longitude = Number(probeLongitude); if (Number.isFinite(latitude) && Number.isFinite(longitude)) props.onProbeCoordinateSubmit({ latitude, longitude }) }} className="grid grid-cols-2 gap-2"><label>Latitude<input type="number" step="any" required value={probeLatitude} onChange={(event) => setProbeLatitude(event.target.value)} /></label><label>Longitude<input type="number" step="any" required value={probeLongitude} onChange={(event) => setProbeLongitude(event.target.value)} /></label><button type="submit" className="col-span-2">Set coordinates</button></form>{props.probeLoading && <p role="status">Loading profiles…</p>}{props.probeStatus && <p role="status" className="control-note">{props.probeStatus}</p>}</div>}

            {!historical && <><button type="button" className={`tool-row ${observationsOpen ? 'active' : ''}`} aria-expanded={observationsOpen} onClick={() => setObservationsOpen((value) => !value)}><span>Observations</span><small>Argo and Glider</small></button>{observationsOpen && <div className="tool-settings"><label className="toggle-row"><input type="checkbox" checked={props.argoVisible} disabled={!argoAvailable} onChange={(event) => props.onArgoToggle(event.target.checked)} /><span>Argo</span><small>{!argoAvailable ? 'Unavailable' : props.argoLoading ? 'Loading' : props.argoCount !== null ? `${props.argoCount} profiles` : ''}</small></label><label className="toggle-row"><input type="checkbox" checked={props.gliderVisible} disabled={!gliderAvailable} onChange={(event) => props.onGliderToggle(event.target.checked)} /><span>Glider</span><small>{!gliderAvailable ? 'Unavailable' : props.gliderLoading ? 'Loading' : props.gliderCount !== null ? `${props.gliderCount} profiles` : ''}</small></label><p className="control-note">Glider observations are from 2019 and are not co-temporal with the 2026 model.</p>{(props.argoError || props.gliderError) && <p role="alert" className="text-red-200">{props.argoError ?? props.gliderError}</p>}</div>}</>}

            {!historical && <><button type="button" className={`tool-row ${props.alertsVisible ? 'active-amber' : ''}`} disabled={!alertsAvailable} aria-pressed={props.alertsVisible} onClick={() => props.onAlertsToggle(!props.alertsVisible)}><span>Model–Observation Deviation</span><small>{!alertsAvailable ? 'Unavailable' : props.alertsLoading ? 'Loading' : props.alertsVisible ? `${props.filteredAlertsCount} shown` : 'Residual thresholds'}</small></button>{props.alertsVisible && <div className="tool-settings tool-settings--amber"><label>Map filter<select value={props.alertFilter} onChange={(event) => props.onAlertFilterChange(event.target.value as AlertFilter)}><option value="all">All</option><option value="moderate_plus">Moderate+</option><option value="high">High only</option></select></label>{props.alertThresholds && <p className="control-note">{props.alertThresholds.label}. Deviation is not a hazard classification.</p>}{props.alertsError && <p role="alert" className="text-red-200">{props.alertsError}</p>}</div>}</>}

            <details className={`historical-tool ${historical ? 'active' : ''}`} open={historical || undefined}><summary>Historical Events <span>{props.historicalEventDetail?.name ?? 'Cyclone Amphan'}</span></summary><HistoricalEventPanel events={props.historicalEvents} selectedEventId={props.selectedHistoricalEventId} detail={props.historicalEventDetail} track={props.historicalEventTrack} visible={props.historicalEventVisible} selectedPointIndex={props.selectedHistoricalPointIndex} loading={props.historicalEventLoading} error={props.historicalEventError} onEventSelect={props.onHistoricalEventSelect} onVisibilityChange={props.onHistoricalEventVisibilityChange} onPointSelect={props.onHistoricalPointSelect} onRetry={props.onHistoricalEventRetry} analysisContext={props.analysisContext} analysisMode={props.historicalAnalysisMode} historicalVariable={props.historicalVariable} historicalPhase={props.historicalPhase} historicalComparison={props.historicalComparison} configuration={props.historicalConfiguration} configurationLoading={props.historicalConfigurationLoading} configurationError={props.historicalConfigurationError} historicalTimeValues={props.historicalTimeValues} historicalTimeIndex={props.historicalTimeIndex} historicalOceanTime={props.historicalOceanTime} currentOperationalModelTime={props.currentOperationalModelTime} differenceSummary={props.historicalDifferenceSummary} oceanLoading={historical && props.historicalOceanLoading} oceanError={historical ? props.historicalOceanError : null} onEnterHistoricalOcean={props.onEnterHistoricalOcean} onReturnToCurrentOcean={props.onReturnToCurrentOcean} onAnalysisModeChange={props.onHistoricalAnalysisModeChange} onHistoricalVariableChange={props.onHistoricalVariableChange} onHistoricalPhaseChange={props.onHistoricalPhaseChange} onHistoricalComparisonChange={props.onHistoricalComparisonChange} onHistoricalTimeChange={props.onHistoricalTimeChange} onInspectTrackPoint={props.onInspectHistoricalTrackPoint} /></details>
          </div>
        </WorkflowSection>
      </div>
    </aside>
  )
}
