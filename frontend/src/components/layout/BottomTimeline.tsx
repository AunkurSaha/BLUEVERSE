import React from 'react'

import {
  formatNumber,
  formatSelectedTime,
  type PreparedTemperatureSlice,
} from '../../lib/temperatureSlice'
import type { TemperatureSliceSelection } from './RightInspector'

interface BottomTimelineProps {
  temperatureLayer: PreparedTemperatureSlice | null
  sliceSelection: TemperatureSliceSelection | null
  timeLevels: number | null
  depthLevels: number | null
  depthValues: number[] | null
  depthUnits: string | null
  selectedDepthIndex: number
  isLoading: boolean
  error: string | null
  onDepthChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const BottomTimeline: React.FC<BottomTimelineProps> = ({
  temperatureLayer,
  sliceSelection,
  timeLevels,
  depthLevels,
  depthValues,
  depthUnits,
  selectedDepthIndex,
  isLoading,
  error,
  onDepthChange,
}) => {
  const slice = temperatureLayer?.slice ?? null
  const timeValue = slice ? formatSelectedTime(slice.actual_time) : null
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
    <footer className="shrink-0 border-t border-white/10 bg-[#08111f]">
      <div className="flex flex-col gap-2 px-3 py-2 sm:px-4 lg:flex-row lg:items-start lg:justify-between gap-x-6">
        <div className="flex min-w-0 items-center gap-2 flex-shrink-0">
          <fieldset disabled>
            <legend className="sr-only">Time playback</legend>
            <button
              type="button"
              className="rounded-md border border-white/15 bg-[#0b1524] px-2.5 py-1.5 text-sm font-medium text-slate-400 disabled:cursor-not-allowed"
              aria-label="Play time animation"
            >
              Play
            </button>
          </fieldset>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.04em] text-slate-500">
              Selected time
            </p>
            <p className="truncate text-sm font-medium text-slate-200">
              {isLoading
                ? 'Loading…'
                : error
                  ? error
                  : timeValue ?? slice
                    ? timeValue ?? 'Not available'
                    : 'Waiting for slice'}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2 flex-1">
          <p className="text-xs text-slate-400">
            {timeLevels === null
              ? 'Time levels pending'
              : `${timeLevels} time ${timeLevels === 1 ? 'slice' : 'slices'} in source`}
          </p>
          <p className="shrink-0 text-[10px] font-medium tracking-[0.02em] text-slate-500">
            Playback disabled
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 flex-shrink-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.04em] text-slate-500">
            Selected depth
          </p>
          {depthValues && depthUnits ? (
            <>
              <input
                type="range"
                min={0}
                max={depthLevels - 1}
                step={1}
                value={selectedDepthIndex}
                onChange={onDepthChange}
                className="flex-1 bg-[#0b1524] sm:w-full"
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
                    <p>level — of {depthLevels}</p>
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
    </footer>
  )
}

export default BottomTimeline
