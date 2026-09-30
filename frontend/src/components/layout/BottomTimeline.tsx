import { formatNumber, formatSelectedTime, type PreparedTemperatureSlice } from '../../lib/temperatureSlice'
import type { TemperatureSliceSelection } from './RightInspector'

interface Props {
  oceanLayer: { type: 'scalar'; data: PreparedTemperatureSlice } | { type: 'vector'; uo: PreparedTemperatureSlice; vo: PreparedTemperatureSlice } | null
  sliceSelection: TemperatureSliceSelection | null
  timeLevels: number | null
  timeValues: string[] | null
  timeUnits: string | null
  selectedTimeIndex: number
  onTimeChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  depthLevels: number | null
  depthValues: number[] | null
  depthUnits: string | null
  selectedDepthIndex: number
  isLoading: boolean
  error: string | null
  onDepthChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  isPlaying: boolean
  onPlayToggle: () => void
  timeControlEnabled?: boolean
  timeContextLabel?: string | null
}

export default function BottomTimeline({
  oceanLayer, timeLevels, timeValues, selectedTimeIndex, onTimeChange, depthLevels, depthValues,
  depthUnits, selectedDepthIndex, isLoading, error, onDepthChange, isPlaying, onPlayToggle,
  timeControlEnabled = true, timeContextLabel = null,
}: Props) {
  const slice = oceanLayer?.type === 'scalar' ? oceanLayer.data.slice : oceanLayer?.uo.slice
  const timestamp = timeContextLabel ?? (slice?.actual_time
    ? formatSelectedTime(slice.actual_time)
    : timeValues?.[selectedTimeIndex] ? formatSelectedTime(timeValues[selectedTimeIndex]) : 'Source time pending')
  const actualDepth = slice?.actual_depth ?? depthValues?.[selectedDepthIndex] ?? null
  const unit = slice?.depth_units ?? depthUnits ?? 'm'
  const maxDepth = depthValues?.[depthValues.length - 1]

  return (
    <footer className="time-depth-controller" aria-label="Time and depth controls">
      <div className="controller-row">
        <div className="controller-heading">
          <button type="button" onClick={onPlayToggle} disabled={!timeControlEnabled || !timeLevels || timeLevels < 2} title={!timeControlEnabled ? 'Playback is unavailable for a derived field.' : undefined} className="transport-button" aria-label={timeControlEnabled && isPlaying ? 'Pause time animation' : 'Play time animation'}>
            {timeControlEnabled && isPlaying ? 'Pause' : 'Play'}
          </button>
          <div><p className="controller-label">{timeControlEnabled ? 'TIME' : 'OCEAN ANALYSIS'}</p><p className={`controller-value ${!timeControlEnabled ? 'controller-value--derived' : ''}`}>{timestamp}</p></div>
        </div>
        <input type="range" min={0} max={Math.max(0, (timeLevels ?? 1) - 1)} step={1} value={selectedTimeIndex} onChange={onTimeChange} disabled={!timeControlEnabled} className="controller-slider" aria-label="Time selector" aria-valuetext={timestamp} />
        <p className="controller-count">{timeControlEnabled ? `Frame ${selectedTimeIndex + 1} / ${timeLevels ?? 1}` : 'Derived field'}</p>
      </div>
      <div className="controller-row">
        <div className="controller-heading"><div><p className="controller-label">DEPTH</p><p className="controller-value">{actualDepth !== null ? `${formatNumber(actualDepth, 3)} ${unit}` : isLoading ? 'Loading source levels' : error ?? 'Depth pending'}</p></div></div>
        <div className="min-w-0">
          <input type="range" min={0} max={Math.max(0, (depthLevels ?? 1) - 1)} step={1} value={selectedDepthIndex} onChange={onDepthChange} disabled={!depthLevels} className="controller-slider" aria-label="Depth selector" aria-valuetext={actualDepth !== null ? `${actualDepth.toFixed(3)} ${unit}, level ${selectedDepthIndex + 1} of ${depthLevels ?? 1}` : 'Depth pending'} />
          <div className="mt-1 flex justify-between text-[10px] text-slate-500"><span>Surface</span><span>{maxDepth !== undefined ? `${formatNumber(maxDepth, 1)} ${depthUnits ?? 'm'}` : 'Deepest source level'}</span></div>
        </div>
        <p className="controller-count">Level {selectedDepthIndex + 1} / {depthLevels ?? 1}</p>
      </div>
    </footer>
  )
}
