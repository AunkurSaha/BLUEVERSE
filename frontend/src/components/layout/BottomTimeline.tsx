import React from 'react'

import {
  formatNumber,
  formatSelectedTime,
  type PreparedTemperatureSlice,
} from '../../lib/temperatureSlice'
import type { TemperatureSliceSelection } from './RightInspector'

interface BottomTimelineProps {
  oceanLayer: {
    type: 'scalar'
    data: PreparedTemperatureSlice
  } | {
    type: 'vector'
    uo: PreparedTemperatureSlice
    vo: PreparedTemperatureSlice
  } | null
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

const BottomTimeline: React.FC<BottomTimelineProps> = ({
  oceanLayer,
  sliceSelection,
  timeLevels,
  timeValues,
  timeUnits,
  selectedTimeIndex,
  onTimeChange,
  depthLevels,
  depthValues,
  depthUnits,
  selectedDepthIndex,
  isLoading,
  error,
  onDepthChange,
  isPlaying,
  onPlayToggle,
  timeControlEnabled = true,
  timeContextLabel = null,
}) => {
  // Get the slice data for display (scalar or vector components)
  const getSliceData = () => {
    if (!oceanLayer) return null
    if (oceanLayer.type === 'scalar') {
      return oceanLayer.data.slice
    } else {
      // For vector timeline, we'll show uo component info primarily
      return oceanLayer.uo.slice
    }
  }

  const slice = getSliceData()
  const timeValue = slice ? formatSelectedTime(slice.actual_time) : null
  // Human-facing timestamp: "2026-09-21 00:00" (raw backend value stays untouched).
  const displayTime =
    timeValue ??
    (timeValues && timeValues[selectedTimeIndex] !== undefined
      ? formatSelectedTime(timeValues[selectedTimeIndex])
      : String(selectedTimeIndex))
  const depthValue = slice
    ? `${formatNumber(slice.actual_depth)} ${slice.depth_units}`
    : null
  const depthLevelValue =
    sliceSelection && depthLevels !== null
      ? `level ${sliceSelection.depthIndex + 1} of ${depthLevels}`
      : sliceSelection
        ? `zero-based index ${sliceSelection.depthIndex}`
        : null

  // Calculate actual depth from depthValues if available (for the slider)
  const actualDepthFromValues = depthValues && depthValues[selectedDepthIndex] !== undefined
    ? depthValues[selectedDepthIndex]
    : null

  return (
    <footer className="min-w-0 shrink-0 border-t border-white/10 bg-[#08111f]">
      <div className="flex min-w-0 flex-col gap-2 px-3 py-2 sm:px-4 lg:flex-row lg:items-start lg:justify-between lg:gap-x-6">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:flex-nowrap">
          {/* Play/Pause button and time controls */}
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={onPlayToggle}
              disabled={!timeControlEnabled}
              className={`rounded-md border border-white/15 bg-[#0b1524] px-2.5 py-1.5 text-sm font-medium text-slate-400 disabled:cursor-not-allowed disabled:opacity-40 ${isPlaying ? 'bg-[#1e293b]' : ''}`}
              aria-label={isPlaying ? 'Pause time animation' : 'Play time animation'}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.04em] text-slate-500">
                Selected time
              </p>
              <div className="flex min-w-0 items-center gap-2">
                {/* Time slider */}
                <input
                  type="range"
                  min={0}
                  max={timeLevels !== null ? timeLevels - 1 : 0}
                  step={1}
                  value={selectedTimeIndex}
                  onChange={onTimeChange}
                  disabled={!timeControlEnabled}
                  className="min-w-0 flex-1 bg-[#0b1524] sm:w-full"
                  aria-label="Time selector"
                  aria-valuemin={0}
                  aria-valuemax={timeLevels !== null ? timeLevels - 1 : 0}
                  aria-valuenow={selectedTimeIndex}
                  aria-valuetext={displayTime}
                />
                {/* Selected time display */}
                <div className="flex-shrink-0 whitespace-nowrap text-sm font-medium text-slate-200">
                  {timeContextLabel ?? displayTime}
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:flex-1">
            <p className="whitespace-nowrap text-xs text-slate-400">
              {!timeControlEnabled && timeContextLabel
                ? 'Derived from source dates'
                : timeLevels === null
                ? 'Time levels pending'
                : `time ${selectedTimeIndex + 1} of ${timeLevels}`}
            </p>
            <p className="shrink-0 text-[10px] font-medium tracking-[0.02em] text-slate-500">
              {isPlaying ? 'Playing' : 'Paused'}
            </p>
          </div>

          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.04em] text-slate-500">
              Selected depth
            </p>
            {depthValues && depthUnits && depthLevels !== null ? (
              <>
                <input
                  type="range"
                  min={0}
                  max={depthLevels - 1}
                  step={1}
                  value={selectedDepthIndex}
                  onChange={onDepthChange}
                  className="w-full min-w-0 flex-1 bg-[#0b1524] sm:w-full"
                  aria-label="Depth selector"
                  aria-valuemin={0}
                  aria-valuemax={depthLevels - 1}
                  aria-valuenow={selectedDepthIndex}
                  aria-valuetext={`${actualDepthFromValues?.toFixed(3)} meters, level ${selectedDepthIndex + 1} of ${depthLevels}`}
                />
                <div className="flex flex-col items-center text-sm font-medium text-slate-200 flex-shrink-0">
                  {actualDepthFromValues !== null ? (
                    <>
                      <p className="truncate">
                        {actualDepthFromValues.toFixed(3)} m
                      </p>
                      <p>
                        level {selectedDepthIndex + 1} of {depthLevels}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="truncate">Waiting for depth data…</p>
                      <p>level unavailable of {depthLevels}</p>
                    </>
                  )}
                </div>
              </>
            ) : (
              <p className="truncate text-sm font-medium text-slate-200">
                {isLoading
                  ? 'Loading…'
                  : error
                    ? error
                    : depthValue
                      ? `${depthValue} · ${depthLevelValue ?? 'level not available'}`
                      : 'Waiting for slice'}
              </p>
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}

export default BottomTimeline
