import React from 'react'
import DatasetSelector from '../datasets/DatasetSelector'
import VisualizationControls, { type VisualizationMode } from './VisualizationControls'
import type { SubsurfaceLayerCount, VerticalExaggeration } from '../../lib/subsurfaceFrame'
import type { IsosurfaceQuality } from '../../lib/oceanAnalysis'
import type { GeoPoint } from '../../lib/transect'

interface LeftSidebarProps {
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
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
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
  gliderVisible, gliderLoading, gliderError, gliderCount, onGliderToggle,
  visualizationMode, subsurfaceLayerCount, verticalExaggeration, subsurfaceOpacityPercent,
  onVisualizationModeChange, onSubsurfaceLayerCountChange, onVerticalExaggerationChange,
  onSubsurfaceOpacityChange,
  isosurfaceTarget, isosurfaceRange, isosurfaceQuality, isosurfaceOpacityPercent,
  onIsosurfaceTargetChange, onIsosurfaceQualityChange, onIsosurfaceOpacityChange,
  transectEnabled, transectDrawMode, transectStart, transectEnd, transectDistanceKm, transectSampleCount, transectStatus,
  onTransectEnabledChange, onDrawTransect, onClearTransect, onTransectSampleCountChange,
}) => {
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
                onChange={handleVariableChange}
                aria-label="Ocean Currents"
                className="h-4 w-4 accent-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
              />
              <span className="font-medium text-white">Ocean Currents</span>
            </label>
          </div>
        </section>

        <VisualizationControls
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
        />

        <section aria-labelledby="analysis-section-title" className="space-y-3">
          <h4 id="analysis-section-title" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Analysis</h4>
          <label className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${transectEnabled ? 'border-lime-300/40 bg-lime-950/20' : 'border-white/10 bg-[#0b1524]'}`}><input type="checkbox" checked={transectEnabled} disabled={selectedVariable !== 'thetao'} onChange={(event) => onTransectEnabledChange(event.target.checked)} className="h-4 w-4 accent-lime-400" /><span className="font-medium text-white">Vertical Transect</span></label>
          {selectedVariable !== 'thetao' && <p className="text-xs text-slate-400">Vertical Transect currently supports Temperature.</p>}
          {transectEnabled && selectedVariable === 'thetao' && <div className="space-y-2 border-t border-white/10 pt-3">
            <div className="grid grid-cols-2 gap-2"><button type="button" onClick={onDrawTransect} disabled={transectDrawMode} className="rounded-md border border-lime-300/40 bg-lime-950/20 px-2 py-2 text-xs font-medium text-lime-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-300 disabled:cursor-crosshair disabled:opacity-70">{transectDrawMode ? (transectStart ? 'Choose end point' : 'Choose start point') : 'Draw Transect'}</button><button type="button" onClick={onClearTransect} disabled={!transectStart && !transectEnd} className="rounded-md border border-white/15 bg-[#0b1524] px-2 py-2 text-xs font-medium text-slate-300 disabled:opacity-40">Clear Transect</button></div>
            <label className="block text-xs text-slate-300"><span className="mb-1 block text-slate-400">Samples</span><select value={transectSampleCount} onChange={(event) => onTransectSampleCountChange(Number(event.target.value) as 50 | 100 | 200)} className="w-full rounded-md border border-white/15 bg-[#0b1524] px-2 py-1.5 text-sm text-white">{[50, 100, 200].map((count) => <option key={count} value={count}>{count}</option>)}</select></label>
            <p className="text-xs text-slate-400">Horizontal sampling: Nearest model-grid point</p>
            {transectStart && <p className="text-xs text-slate-300">Start: {transectStart.latitude.toFixed(4)}, {transectStart.longitude.toFixed(4)}</p>}
            {transectEnd && <p className="text-xs text-slate-300">End: {transectEnd.latitude.toFixed(4)}, {transectEnd.longitude.toFixed(4)}</p>}
            {transectDistanceKm !== null && <p className="text-xs text-slate-300">Distance: {transectDistanceKm.toFixed(1)} km</p>}
            {transectStatus && <p role="status" className="text-xs text-amber-200">{transectStatus}</p>}
          </div>}
        </section>

        <section aria-labelledby="dataset-section-title" className="space-y-2">
          <h4
            id="dataset-section-title"
            className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400"
          >
            Dataset context
          </h4>
          {/* DatasetSelector is kept for now, but we could remove it in future if variable selection implies dataset */}
          {/* However, we keep it to allow potential future multiple datasets per variable */}
          <DatasetSelector
            datasets={datasets}
            selectedDataset={selectedDataset}
            onSelect={onDatasetSelect}
            isLoading={isLoading}
            error={error}
          />
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
              aria-disabled={false}
              aria-current={selectedVariable === "thetao" ? 'true' : undefined}
              className={
                selectedVariable === "thetao"
                  ? 'flex min-h-[2.25rem] items-center justify-between gap-3 rounded-md border border-cyan-300/40 bg-cyan-950/30 px-3 py-2 text-sm'
                  : 'flex min-h-[2.25rem] items-center justify-between gap-3 rounded-md border border-white/10 bg-[#0b1524] px-3 py-2 text-sm'
              }
            >
              <span className="font-medium text-white">Temperature</span>
              <span className="text-[11px] font-semibold tracking-[0.04em] text-cyan-200">
                {selectedVariable === "thetao" ? 'Selected' : 'Available'}
              </span>
            </li>
            <li
              key="Salinity"
              aria-disabled={false}
              aria-current={selectedVariable === "so" ? 'true' : undefined}
              className={
                selectedVariable === "so"
                  ? 'flex min-h-[2.25rem] items-center justify-between gap-3 rounded-md border border-cyan-300/40 bg-cyan-950/30 px-3 py-2 text-sm'
                  : 'flex min-h-[2.25rem] items-center justify-between gap-3 rounded-md border border-white/10 bg-[#0b1524] px-3 py-2 text-sm'
              }
            >
              <span className="font-medium text-white">Salinity</span>
              <span className="text-[11px] font-semibold tracking-[0.04em] text-cyan-200">
                {selectedVariable === "so" ? 'Selected' : 'Available'}
              </span>
            </li>
            <li
              key="Ocean Currents"
              aria-disabled={false}
              aria-current={selectedVariable === "currents" ? 'true' : undefined}
              className={
                selectedVariable === "currents"
                  ? 'flex min-h-[2.25rem] items-center justify-between gap-3 rounded-md border border-cyan-300/40 bg-cyan-950/30 px-3 py-2 text-sm'
                  : 'flex min-h-[2.25rem] items-center justify-between gap-3 rounded-md border border-white/10 bg-[#0b1524] px-3 py-2 text-sm'
              }
            >
              <span className="font-medium text-white">Ocean Currents</span>
              <span className="text-[11px] font-semibold tracking-[0.04em] text-cyan-200">
                {selectedVariable === "currents" ? 'Selected' : 'Available'}
              </span>
            </li>
          </ul>
        </section>

        <section aria-labelledby="observation-section-title" className="space-y-2">
          <h4
            id="observation-section-title"
            className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400"
          >
            Observations
          </h4>
          <label
            className={`flex min-h-[2.25rem] cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm ${
              argoVisible
                ? 'border-cyan-300/40 bg-cyan-950/30'
                : 'border-white/10 bg-[#0b1524]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={argoVisible}
                onChange={(event) => onArgoToggle(event.target.checked)}
                aria-label="Show ARGO floats"
                className="h-4 w-4 accent-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
              />
              <span className="font-medium text-white">ARGO Floats</span>
            </span>
            <span className="text-[11px] font-medium tracking-[0.02em] text-slate-400">
              {argoLoading
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
          <label className={`flex min-h-[2.25rem] cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm ${gliderVisible ? 'border-orange-300/40 bg-orange-950/30' : 'border-white/10 bg-[#0b1524]'}`}>
            <span className="flex items-center gap-2.5"><input type="checkbox" checked={gliderVisible} onChange={e=>onGliderToggle(e.target.checked)} aria-label="Show Gliders" className="h-4 w-4 accent-orange-400"/><span className="font-medium text-white">Gliders</span></span>
            <span className="text-[11px] text-slate-400">{gliderLoading?'Loading…':gliderError?'Unavailable':gliderVisible&&gliderCount!==null?`${gliderCount} profiles`:''}</span>
          </label>
          {gliderError&&gliderVisible&&<p role="alert" className="text-xs text-red-200">{gliderError}</p>}
        </section>
      </div>
    </aside>
  )
}

export default LeftSidebar
