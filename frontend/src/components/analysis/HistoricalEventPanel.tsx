import type { ChangeEvent } from 'react'
import { formatHistoricalUtc, selectedTrackPoint } from '../../lib/historicalEvents'
import { historicalOceanAvailabilityState } from '../../lib/historicalEventPanelState'
import { matchHistoricalOceanTime, type AnalysisContext, type HistoricalAnalysisMode } from '../../lib/historicalOcean'
import type { HistoricalEventDetail, HistoricalEventSummary, HistoricalEventTrack } from '../../services/eventApi'
import type { HistoricalComparison, HistoricalOceanConfiguration, HistoricalPhase, HistoricalVariable } from '../../services/historicalOceanApi'

interface DifferenceSummary {
  finitePairedCellCount: number
  mean: number
  minimum: number
  maximum: number
  units: string
}

interface Props {
  events?: HistoricalEventSummary[]
  selectedEventId: string
  detail?: HistoricalEventDetail | null
  track?: HistoricalEventTrack | null
  visible: boolean
  selectedPointIndex: number
  analysisContext: AnalysisContext
  analysisMode: HistoricalAnalysisMode
  historicalVariable: HistoricalVariable
  historicalPhase: HistoricalPhase
  historicalComparison: HistoricalComparison
  configuration: HistoricalOceanConfiguration | null
  configurationLoading: boolean
  configurationError: string | null
  historicalTimeValues: string[]
  historicalTimeIndex: number
  historicalOceanTime: string | null
  currentOperationalModelTime: string | null
  differenceSummary: DifferenceSummary | null
  oceanLoading: boolean
  oceanError: string | null
  loading: boolean
  error: string | null
  onEventSelect: (eventId: string) => void
  onVisibilityChange: (visible: boolean) => void
  onPointSelect: (index: number) => void
  onRetry: () => void
  onEnterHistoricalOcean: () => void
  onReturnToCurrentOcean: () => void
  onAnalysisModeChange: (mode: HistoricalAnalysisMode) => void
  onHistoricalVariableChange: (variable: HistoricalVariable) => void
  onHistoricalPhaseChange: (phase: HistoricalPhase) => void
  onHistoricalComparisonChange: (comparison: HistoricalComparison) => void
  onHistoricalTimeChange: (index: number) => void
  onInspectTrackPoint: () => void
}

const valueOrUnavailable = (value: number | string | null, unit = ''): string =>
  value === null || value === '' ? 'Unavailable' : `${value}${unit ? ` ${unit}` : ''}`

const shortDate = (value: string): string => {
  const date = new Date(`${value}T00:00:00Z`)
  return `${date.getUTCDate()} May`
}

export default function HistoricalEventPanel(props: Props) {
  const {
    events, selectedEventId, detail, track, visible, selectedPointIndex,
    analysisContext, analysisMode, historicalVariable, historicalPhase,
    historicalComparison, configuration, configurationLoading, configurationError,
    historicalTimeValues, historicalTimeIndex,
    historicalOceanTime, currentOperationalModelTime, differenceSummary,
    oceanLoading, oceanError, loading, error, onEventSelect, onVisibilityChange,
    onPointSelect, onRetry, onEnterHistoricalOcean, onReturnToCurrentOcean,
    onAnalysisModeChange, onHistoricalVariableChange, onHistoricalPhaseChange,
    onHistoricalComparisonChange, onHistoricalTimeChange, onInspectTrackPoint,
  } = props
  const availableEvents = events ?? []
  const historicalAvailability = historicalOceanAvailabilityState(detail, configurationError)
  const historicalAvailabilityLabel = historicalAvailability === 'LOADING'
    ? 'Resolving availability'
    : historicalAvailability === 'ERROR'
      ? 'Availability error'
      : historicalAvailability === 'AVAILABLE'
        ? 'Available'
        : 'Unavailable'
  const exploreLabel = historicalAvailability === 'LOADING'
    ? 'Resolving Availability...'
    : historicalAvailability === 'ERROR'
      ? 'Historical Ocean Error'
      : historicalAvailability === 'UNAVAILABLE'
        ? 'Historical Ocean Unavailable'
        : configurationLoading || !configuration
          ? 'Loading Ocean Metadata...'
          : 'Explore Historical Ocean'
  const point = selectedTrackPoint(track ?? null, selectedPointIndex)
  const historicalActive = analysisContext === 'historical-event'
  const timeMatch = point && historicalTimeValues.length
    ? matchHistoricalOceanTime(point.time, historicalTimeValues)
    : null
  const handleTimeline = (event: ChangeEvent<HTMLInputElement>) => onPointSelect(Number(event.target.value))

  return (
    <div className={`border px-3 py-3 ${historicalActive ? 'border-amber-300/55 bg-amber-950/20' : visible ? 'border-amber-300/40 bg-amber-950/15' : 'border-white/10 bg-[#0b1524]'}`}>
      <label htmlFor="historical-event-select" className="block text-xs font-medium text-slate-300">Historical events</label>
      <select id="historical-event-select" value={selectedEventId} onChange={(event) => onEventSelect(event.target.value)} disabled={loading || availableEvents.length === 0 || historicalActive} className="mt-2 min-h-11 w-full border border-white/15 bg-[#08111f] px-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 disabled:opacity-60">
        {availableEvents.length === 0 && <option value="">No events loaded</option>}
        {availableEvents.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.start_time.slice(0, 4)})</option>)}
      </select>

      {loading && <p role="status" className="mt-3 text-xs text-amber-100">Loading historical event...</p>}
      {error && <div className="mt-3 space-y-2"><p role="alert" className="text-xs text-red-200">{error}</p><button type="button" onClick={onRetry} className="min-h-11 border border-red-300/40 px-3 text-xs font-medium text-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-300">Retry Event Load</button></div>}

      {!loading && !error && detail && track && <div className="mt-3 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><p className="font-medium text-white">{detail.name}</p><p className="text-xs text-slate-400">{detail.basin} basin, {detail.track_point_count} source points</p></div>
          <button type="button" aria-pressed={visible} onClick={() => onVisibilityChange(!visible)} className="min-h-11 shrink-0 border border-amber-300/40 px-3 text-xs font-medium text-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">{visible ? 'Hide Track' : 'Show Track'}</button>
        </div>

        <section aria-labelledby="historical-ocean-title" className="border-t border-white/10 pt-3">
          <div className="flex items-start justify-between gap-3">
            <div><h4 id="historical-ocean-title" className="text-sm font-semibold text-white">Historical Ocean</h4><p role={historicalAvailability === 'ERROR' ? 'alert' : 'status'} className={`mt-0.5 text-xs ${historicalAvailability === 'ERROR' ? 'text-red-200' : 'text-slate-400'}`}>{historicalAvailabilityLabel}</p></div>
            {!historicalActive ? <button type="button" disabled={historicalAvailability !== 'AVAILABLE' || configurationLoading || !configuration} onClick={onEnterHistoricalOcean} className="min-h-11 border border-cyan-300/50 bg-cyan-950/30 px-3 text-xs font-semibold text-cyan-100 hover:bg-cyan-900/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-50">{exploreLabel}</button> : <button type="button" onClick={onReturnToCurrentOcean} className="min-h-11 border border-white/20 px-3 text-xs font-semibold text-slate-100 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">Return to Current Ocean</button>}
          </div>
          {configurationError && <p role="alert" className="mt-2 text-xs text-red-200">{configurationError}</p>}

          {historicalActive && <div className="mt-3 space-y-3">
            <div className="border border-cyan-300/25 bg-[#071421] p-3"><p className="text-sm font-semibold text-cyan-100">Amphan Historical Ocean</p><p className="text-xs text-slate-300">GLORYS12V1 Reanalysis · May 2020</p><p className="mt-1 text-[11px] leading-4 text-slate-400">Model reanalysis values, not observations or a forecast.</p></div>

            <fieldset><legend className="text-xs font-medium text-slate-300">Variable</legend><div className="mt-1 grid grid-cols-3 gap-1">
              {([['thetao', 'Temperature'], ['so', 'Salinity'], ['currents', 'Currents']] as const).map(([value, label]) => <label key={value} className={`flex min-h-11 cursor-pointer items-center justify-center border px-1 text-center text-[11px] font-medium ${historicalVariable === value ? 'border-cyan-300/60 bg-cyan-950/35 text-cyan-100' : 'border-white/10 text-slate-300'}`}><input className="sr-only" type="radio" name="historical-variable" value={value} checked={historicalVariable === value} onChange={() => onHistoricalVariableChange(value)} />{label}</label>)}
            </div></fieldset>

            <fieldset><legend className="text-xs font-medium text-slate-300">Analysis mode</legend><div className="mt-1 grid grid-cols-3 gap-1">
              {([['daily', 'Daily'], ['phase_mean', 'Phase Mean'], ['difference', 'Difference']] as const).map(([value, label]) => <label key={value} className={`flex min-h-11 cursor-pointer items-center justify-center border px-1 text-center text-[11px] font-medium ${analysisMode === value ? 'border-amber-300/60 bg-amber-950/30 text-amber-100' : 'border-white/10 text-slate-300'} ${value === 'difference' && historicalVariable === 'currents' ? 'cursor-not-allowed opacity-45' : ''}`}><input className="sr-only" type="radio" name="historical-mode" value={value} checked={analysisMode === value} disabled={value === 'difference' && historicalVariable === 'currents'} onChange={() => onAnalysisModeChange(value)} />{label}</label>)}
            </div></fieldset>

            {analysisMode === 'daily' && <label className="block text-xs text-slate-300">Historical ocean date<select value={historicalTimeIndex} onChange={(event) => onHistoricalTimeChange(Number(event.target.value))} className="mt-1 min-h-11 w-full border border-white/15 bg-[#08111f] px-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">{historicalTimeValues.map((value, index) => <option key={value} value={index}>{formatHistoricalUtc(value)}</option>)}</select></label>}

            {analysisMode === 'phase_mean' && <fieldset><legend className="text-xs font-medium text-slate-300">Analysis window</legend><div className="mt-1 grid grid-cols-3 gap-1">{configuration?.analysis_windows.map((window) => <button key={window.id} type="button" aria-pressed={historicalPhase === window.id} onClick={() => onHistoricalPhaseChange(window.id)} className={`min-h-14 border px-1 py-1 text-[10px] leading-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 ${historicalPhase === window.id ? 'border-amber-300/60 bg-amber-950/30 text-amber-100' : 'border-white/10 text-slate-300'}`}><span className="block font-semibold">{window.id === 'during' ? 'During' : window.id[0].toUpperCase() + window.id.slice(1)}</span><span className="block">{shortDate(window.dates[0])}–{shortDate(window.dates[window.dates.length - 1])}</span><span className="block">n = {window.sample_count}</span></button>)}</div><p className="mt-1 text-[11px] text-slate-400">Analysis windows, not storm classification boundaries.</p></fieldset>}

            {analysisMode === 'difference' && <fieldset><legend className="text-xs font-medium text-slate-300">Phase difference</legend><div className="mt-1 grid grid-cols-2 gap-1">{([['during-before', 'During − Before'], ['after-before', 'After − Before']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={historicalComparison === value} onClick={() => onHistoricalComparisonChange(value)} className={`min-h-11 border px-2 text-[11px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 ${historicalComparison === value ? 'border-amber-300/60 bg-amber-950/30 text-amber-100' : 'border-white/10 text-slate-300'}`}>{label}</button>)}</div><p className="mt-1 text-[11px] text-slate-400">Temporal comparison around the event; no causal attribution.</p></fieldset>}

            {oceanLoading && <p role="status" className="text-xs text-cyan-100">Loading historical model field...</p>}
            {!oceanLoading && oceanError && <p role="alert" className="text-xs text-red-200">{oceanError}</p>}
            {analysisMode === 'difference' && differenceSummary && <dl className="grid grid-cols-2 gap-x-2 gap-y-1 border-t border-white/10 pt-2 text-[11px]"><dt className="text-slate-400">Finite paired cells</dt><dd className="text-right tabular-nums text-slate-100">{differenceSummary.finitePairedCellCount.toLocaleString()}</dd><dt className="text-slate-400">Mean difference</dt><dd className="text-right tabular-nums text-slate-100">{differenceSummary.mean.toFixed(4)} {differenceSummary.units}</dd><dt className="text-slate-400">Range</dt><dd className="text-right tabular-nums text-slate-100">{differenceSummary.minimum.toFixed(4)} to {differenceSummary.maximum.toFixed(4)}</dd></dl>}
          </div>}
        </section>

        <div className="space-y-1.5 border-t border-white/10 pt-3">
          <div className="flex items-center justify-between gap-2 text-xs"><span className="text-slate-400">Cyclone track time</span><span className="text-right font-medium tabular-nums text-amber-100">{formatHistoricalUtc(point?.time ?? null)}</span></div>
          <input type="range" min={0} max={Math.max(0, track.points.length - 1)} step={1} value={Math.min(selectedPointIndex, Math.max(0, track.points.length - 1))} onChange={handleTimeline} className="h-11 w-full accent-amber-400" aria-label="Historical event timeline" aria-valuetext={formatHistoricalUtc(point?.time ?? null)} />
          <p className="text-xs tabular-nums text-slate-400">Track point {selectedPointIndex + 1} of {track.point_count}</p>
        </div>

        <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-x-3 gap-y-1.5 text-xs">
          <dt className="text-slate-400">Historical ocean field</dt><dd className="break-words text-right font-medium tabular-nums text-cyan-100">{analysisMode === 'daily' ? formatHistoricalUtc(historicalOceanTime) : analysisMode === 'phase_mean' ? `${historicalPhase} phase mean` : historicalComparison.replace('-', ' − ')}</dd>
          <dt className="text-slate-400">Current operational time</dt><dd className="break-words text-right tabular-nums text-slate-300">{formatHistoricalUtc(currentOperationalModelTime)}</dd>
          {timeMatch && <><dt className="text-slate-400">Nearest ocean field</dt><dd className="text-right tabular-nums text-cyan-100">{formatHistoricalUtc(timeMatch.matchedModelTime)}</dd><dt className="text-slate-400">Time offset</dt><dd className="text-right tabular-nums text-slate-100">{timeMatch.absoluteOffsetHours.toFixed(0)} h</dd><dt className="text-slate-400">Match method</dt><dd className="break-words text-right text-slate-300">Nearest available source time</dd></>}
          <dt className="text-slate-400">Latitude</dt><dd className="text-right tabular-nums text-slate-100">{point ? `${point.latitude.toFixed(2)} ${track.units.latitude}` : 'Unavailable'}</dd>
          <dt className="text-slate-400">Longitude</dt><dd className="text-right tabular-nums text-slate-100">{point ? `${point.longitude.toFixed(2)} ${track.units.longitude}` : 'Unavailable'}</dd>
          <dt className="text-slate-400">Wind</dt><dd className="text-right tabular-nums text-slate-100">{valueOrUnavailable(point?.wind ?? null, track.units.wind)}</dd>
          <dt className="text-slate-400">Pressure</dt><dd className="text-right tabular-nums text-slate-100">{valueOrUnavailable(point?.pressure ?? null, track.units.pressure)}</dd>
        </dl>
        {historicalActive && point && <button type="button" onClick={onInspectTrackPoint} className="min-h-11 w-full border border-cyan-300/45 px-3 text-xs font-semibold text-cyan-100 hover:bg-cyan-950/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">Inspect Ocean Here</button>}

        <details className="border-t border-white/10 pt-2 text-xs"><summary className="min-h-11 cursor-pointer py-3 font-medium text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">Sources and provenance</summary><div className="space-y-3 pb-2"><section><h5 className="font-semibold text-amber-100">Cyclone track source</h5><p className="mt-1 leading-5 text-slate-300">NOAA IBTrACS v04r01 · RSMC New Delhi / IMD · source ID {detail.source_event_id}</p></section>{configuration && <section className="border-t border-white/10 pt-2"><h5 className="font-semibold text-cyan-100">Ocean model source</h5><dl className="mt-1 grid grid-cols-[0.8fr_1.2fr] gap-x-2 gap-y-1 text-slate-300"><dt>Product</dt><dd className="break-all text-right">{configuration.product_id}</dd><dt>Model</dt><dd className="text-right">{configuration.model}</dd><dt>Provider</dt><dd className="text-right">{configuration.provider}</dd><dt>Dataset</dt><dd className="break-all text-right">{configuration.dataset_id}</dd><dt>Classification</dt><dd className="text-right">{configuration.classification}</dd><dt>Window</dt><dd className="text-right">{configuration.historical_time_window}</dd></dl></section>}</div></details>
      </div>}
    </div>
  )
}
