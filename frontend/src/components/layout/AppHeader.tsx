import type { BackendStatus } from '../../services/api'
import type { AnalysisContext, HistoricalAnalysisMode } from '../../lib/historicalOcean'
import { formatSelectedTime } from '../../lib/temperatureSlice'

interface Props {
  backendStatus: BackendStatus
  selectedDataset: string | null
  regionName: string | null
  variable: 'thetao' | 'so' | 'currents'
  actualTime: string | null
  actualDepth: number | null
  depthUnits: string | null
  analysisContext: AnalysisContext
  historicalMode: HistoricalAnalysisMode
  historicalEventName: string | null
  drawerOpen: boolean
  onDrawerToggle: () => void
  onWorkflowOpen: () => void
}

const variableLabel = { thetao: 'Temperature', so: 'Salinity', currents: 'Currents' } as const
const historicalModeLabel = { daily: 'Daily', phase_mean: 'Phase Mean', difference: 'Difference' } as const

export default function AppHeader({
  backendStatus, selectedDataset, regionName, variable, actualTime, actualDepth, depthUnits,
  analysisContext, historicalMode, historicalEventName, drawerOpen, onDrawerToggle, onWorkflowOpen,
}: Props) {
  const historical = analysisContext === 'historical-event'
  const statusLabel = backendStatus === 'online' ? 'Backend online' : backendStatus === 'offline' ? 'Backend offline' : 'Checking backend'
  return (
    <header className={`workspace-header ${historical ? 'workspace-header--historical' : ''}`}>
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={onWorkflowOpen} className="header-action lg:hidden" aria-label="Open workflow controls">Workflow</button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-[0.08em] text-white">BLUEVERSE</p>
          <p className="hidden truncate text-[10px] text-slate-500 sm:block">Oceanographic analysis workspace</p>
        </div>
        <div className="hidden h-7 w-px bg-white/10 sm:block" />
        <div className="min-w-0">
          <p className={`truncate text-sm font-semibold ${historical ? 'text-amber-100' : 'text-slate-100'}`}>
            {historical ? `${historicalEventName ?? 'Historical Event'} / Historical Ocean` : `${regionName ?? 'Study region'} / ${variableLabel[variable]}`}
          </p>
          <p className="truncate text-[11px] text-slate-400">
            {historical
              ? `${variableLabel[variable]} · ${historicalModeLabel[historicalMode]} · GLORYS12V1 Reanalysis`
              : `${actualTime ? formatSelectedTime(actualTime) : 'Source time pending'}${actualDepth !== null ? ` · ${actualDepth.toFixed(3)} ${depthUnits ?? 'm'}` : ''}`}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`status-dot ${backendStatus}`} aria-hidden="true" />
        <span className="hidden text-xs text-slate-300 sm:inline" aria-live="polite">{statusLabel}</span>
        <button type="button" className="header-action" aria-expanded={drawerOpen} aria-controls="context-inspector" onClick={onDrawerToggle}>
          {drawerOpen ? 'Close details' : 'Details'}
        </button>
      </div>
      <span className="sr-only">Dataset: {selectedDataset ?? 'none selected'}</span>
    </header>
  )
}
