import React from 'react'

import {
  SUBSURFACE_LAYER_COUNTS,
  VERTICAL_EXAGGERATIONS,
  type SubsurfaceLayerCount,
  type VerticalExaggeration,
} from '../../lib/subsurfaceFrame'
import { ISOSURFACE_QUALITIES, type IsosurfaceQuality } from '../../lib/oceanAnalysis'

export type VisualizationMode = 'depth_slice' | 'subsurface' | 'isosurface'

interface VisualizationControlsProps {
  selectedVariable: 'thetao' | 'so' | 'currents'
  mode: VisualizationMode
  layerCount: SubsurfaceLayerCount
  verticalExaggeration: VerticalExaggeration
  opacityPercent: number
  onModeChange: (mode: VisualizationMode) => void
  onLayerCountChange: (count: SubsurfaceLayerCount) => void
  onVerticalExaggerationChange: (scale: VerticalExaggeration) => void
  onOpacityChange: (opacity: number) => void
  isosurfaceTarget: number | null
  isosurfaceRange: { min: number; max: number } | null
  isosurfaceQuality: IsosurfaceQuality
  isosurfaceOpacityPercent: number
  onIsosurfaceTargetChange: (target: number) => void
  onIsosurfaceQualityChange: (quality: IsosurfaceQuality) => void
  onIsosurfaceOpacityChange: (opacity: number) => void
}

const VisualizationControls: React.FC<VisualizationControlsProps> = ({
  selectedVariable,
  mode,
  layerCount,
  verticalExaggeration,
  opacityPercent,
  onModeChange,
  onLayerCountChange,
  onVerticalExaggerationChange,
  onOpacityChange,
  isosurfaceTarget, isosurfaceRange, isosurfaceQuality, isosurfaceOpacityPercent,
  onIsosurfaceTargetChange, onIsosurfaceQualityChange, onIsosurfaceOpacityChange,
}) => {
  const supportsSubsurface = selectedVariable === 'thetao'

  return (
    <section aria-labelledby="visualization-section-title" className="space-y-3">
      <h4 id="visualization-section-title" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        Visualization
      </h4>
      <div className="grid grid-cols-1 gap-2" role="group" aria-label="Visualization mode">
        {([
          ['depth_slice', 'Depth Slice'],
          ['subsurface', '3D Subsurface'],
          ['isosurface', 'Temperature Isosurface'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            disabled={value !== 'depth_slice' && !supportsSubsurface}
            onClick={() => onModeChange(value)}
            className={`rounded-md border px-2 py-2 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-50 ${mode === value ? 'border-cyan-300/50 bg-cyan-950/40 text-cyan-100' : 'border-white/10 bg-[#0b1524] text-slate-300'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {!supportsSubsurface && (
        <p className="text-xs text-slate-400">3D Subsurface is available for Temperature only.</p>
      )}
      {mode === 'subsurface' && supportsSubsurface && (
        <div className="space-y-3 border-t border-white/10 pt-3">
          <label className="block text-xs text-slate-300">
            <span className="mb-1 block text-slate-400">3D layers</span>
            <select value={layerCount} onChange={(event) => onLayerCountChange(Number(event.target.value) as SubsurfaceLayerCount)} className="w-full rounded-md border border-white/15 bg-[#0b1524] px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/30">
              {SUBSURFACE_LAYER_COUNTS.map((count) => <option key={count} value={count}>{count} source levels</option>)}
            </select>
          </label>
          <label className="block text-xs text-slate-300">
            <span className="mb-1 block text-slate-400">Vertical scale (display only)</span>
            <select value={verticalExaggeration} onChange={(event) => onVerticalExaggerationChange(Number(event.target.value) as VerticalExaggeration)} className="w-full rounded-md border border-white/15 bg-[#0b1524] px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-300/30">
              {VERTICAL_EXAGGERATIONS.map((scale) => <option key={scale} value={scale}>{scale}x</option>)}
            </select>
          </label>
          <label className="block text-xs text-slate-300">
            <span className="mb-1 flex justify-between text-slate-400"><span>Layer opacity</span><span>{opacityPercent}%</span></span>
            <input type="range" min={0} max={100} value={opacityPercent} onChange={(event) => onOpacityChange(Number(event.target.value))} className="w-full accent-cyan-400" aria-label="3D layer opacity" />
          </label>
        </div>
      )}
      {mode === 'isosurface' && supportsSubsurface && (
        <div className="space-y-3 border-t border-white/10 pt-3">
          <label className="block text-xs text-slate-300"><span className="mb-1 flex justify-between text-slate-400"><span>Target temperature</span><span>{isosurfaceTarget?.toFixed(1) ?? 'Pending'} °C</span></span><input type="range" min={isosurfaceRange?.min ?? 0} max={isosurfaceRange?.max ?? 1} step={0.5} disabled={!isosurfaceRange || isosurfaceTarget === null} value={isosurfaceTarget ?? 0} onChange={(event) => onIsosurfaceTargetChange(Number(event.target.value))} className="w-full accent-amber-400" /></label>
          <label className="block text-xs text-slate-300"><span className="mb-1 block text-slate-400">Quality</span><select value={isosurfaceQuality} onChange={(event) => onIsosurfaceQualityChange(event.target.value as IsosurfaceQuality)} className="w-full rounded-md border border-white/15 bg-[#0b1524] px-2 py-1.5 text-sm text-white">{ISOSURFACE_QUALITIES.map((quality) => <option key={quality} value={quality}>{quality[0].toUpperCase() + quality.slice(1)}</option>)}</select></label>
          <label className="block text-xs text-slate-300"><span className="mb-1 flex justify-between text-slate-400"><span>Opacity</span><span>{isosurfaceOpacityPercent}%</span></span><input type="range" min={0} max={100} value={isosurfaceOpacityPercent} onChange={(event) => onIsosurfaceOpacityChange(Number(event.target.value))} className="w-full accent-amber-400" /></label>
          <label className="block text-xs text-slate-300"><span className="mb-1 block text-slate-400">Vertical scale (display only)</span><select value={verticalExaggeration} onChange={(event) => onVerticalExaggerationChange(Number(event.target.value) as VerticalExaggeration)} className="w-full rounded-md border border-white/15 bg-[#0b1524] px-2 py-1.5 text-sm text-white">{VERTICAL_EXAGGERATIONS.map((scale) => <option key={scale} value={scale}>{scale}x</option>)}</select></label>
        </div>
      )}
    </section>
  )
}

export default VisualizationControls
