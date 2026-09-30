import { SUBSURFACE_LAYER_COUNTS, VERTICAL_EXAGGERATIONS, type SubsurfaceLayerCount, type VerticalExaggeration } from '../../lib/subsurfaceFrame'
import { ISOSURFACE_QUALITIES, type IsosurfaceQuality } from '../../lib/oceanAnalysis'

export type VisualizationMode = 'depth_slice' | 'subsurface' | 'isosurface'

interface Props {
  selectedVariable: 'thetao' | 'so' | 'currents'; mode: VisualizationMode
  layerCount: SubsurfaceLayerCount; verticalExaggeration: VerticalExaggeration; opacityPercent: number
  onModeChange: (mode: VisualizationMode) => void; onLayerCountChange: (count: SubsurfaceLayerCount) => void
  onVerticalExaggerationChange: (scale: VerticalExaggeration) => void; onOpacityChange: (opacity: number) => void
  isosurfaceTarget: number | null; isosurfaceRange: { min: number; max: number } | null
  isosurfaceQuality: IsosurfaceQuality; isosurfaceOpacityPercent: number
  onIsosurfaceTargetChange: (target: number) => void; onIsosurfaceQualityChange: (quality: IsosurfaceQuality) => void
  onIsosurfaceOpacityChange: (opacity: number) => void
}

export default function VisualizationControls(props: Props) {
  const supportsTemperature3d = props.selectedVariable === 'thetao'
  const modes: Array<[VisualizationMode, string]> = [['depth_slice', '2D Map'], ['subsurface', '3D'], ['isosurface', 'Isosurface']]
  return (
    <div className="space-y-3">
      <div className="segmented-control" role="group" aria-label="Visualization mode">
        {modes.map(([mode, label]) => <button key={mode} type="button" disabled={mode !== 'depth_slice' && !supportsTemperature3d} aria-pressed={props.mode === mode} onClick={() => props.onModeChange(mode)} title={mode !== 'depth_slice' && !supportsTemperature3d ? 'Available for Temperature only' : undefined}>{label}</button>)}
      </div>
      {!supportsTemperature3d && <p className="control-note">3D and isosurface require Temperature.</p>}
      {props.mode === 'subsurface' && supportsTemperature3d && <div className="tool-settings">
        <label>Source levels<select value={props.layerCount} onChange={(event) => props.onLayerCountChange(Number(event.target.value) as SubsurfaceLayerCount)}>{SUBSURFACE_LAYER_COUNTS.map((count) => <option key={count} value={count}>{count} levels</option>)}</select></label>
        <label>Vertical display scale<select value={props.verticalExaggeration} onChange={(event) => props.onVerticalExaggerationChange(Number(event.target.value) as VerticalExaggeration)}>{VERTICAL_EXAGGERATIONS.map((scale) => <option key={scale} value={scale}>{scale}x</option>)}</select></label>
        <label>Opacity <span>{props.opacityPercent}%</span><input type="range" min={0} max={100} value={props.opacityPercent} onChange={(event) => props.onOpacityChange(Number(event.target.value))} /></label>
      </div>}
      {props.mode === 'isosurface' && supportsTemperature3d && <div className="tool-settings">
        <p className="tool-state">ISOSURFACE <span>{props.isosurfaceRange ? 'Ready' : 'Preparing range'}</span></p>
        <label>Target <span>{props.isosurfaceTarget?.toFixed(1) ?? 'Pending'} °C</span><input aria-label="Isosurface target temperature" type="range" min={props.isosurfaceRange?.min ?? 0} max={props.isosurfaceRange?.max ?? 1} step={0.5} disabled={!props.isosurfaceRange || props.isosurfaceTarget === null} value={props.isosurfaceTarget ?? 0} onChange={(event) => props.onIsosurfaceTargetChange(Number(event.target.value))} /></label>
        <label>Quality<select value={props.isosurfaceQuality} onChange={(event) => props.onIsosurfaceQualityChange(event.target.value as IsosurfaceQuality)}>{ISOSURFACE_QUALITIES.map((quality) => <option key={quality} value={quality}>{quality[0].toUpperCase() + quality.slice(1)}</option>)}</select></label>
        <label>Opacity <span>{props.isosurfaceOpacityPercent}%</span><input type="range" min={0} max={100} value={props.isosurfaceOpacityPercent} onChange={(event) => props.onIsosurfaceOpacityChange(Number(event.target.value))} /></label>
      </div>}
    </div>
  )
}
