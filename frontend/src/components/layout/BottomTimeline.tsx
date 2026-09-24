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
  isLoading: boolean
  error: string | null
}

const BottomTimeline: React.FC<BottomTimelineProps> = ({
  temperatureLayer,
  sliceSelection,
  timeLevels,
  depthLevels,
  isLoading,
  error,
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

  return (
    <footer className="shrink-0 border-t border-white/10 bg-[#08111f]">
      <div className="flex flex-col gap-2 px-3 py-2 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-2">
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

        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 lg:justify-center">
          <p className="text-xs text-slate-400">
            {timeLevels === null
              ? 'Time levels pending'
              : `${timeLevels} time ${timeLevels === 1 ? 'slice' : 'slices'} in source`}
          </p>
          <p className="shrink-0 text-[10px] font-medium tracking-[0.02em] text-slate-500">
            Playback disabled
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.04em] text-slate-500">
            Selected depth
          </p>
          <p className="truncate text-sm font-medium text-slate-200">
            {isLoading
              ? 'Loading…'
              : error
                ? error
                : depthValue
                  ? `${depthValue} · ${depthLevelValue ?? 'level not available'}`
                  : 'Waiting for slice'}
          </p>
        </div>
      </div>
    </footer>
  )
}

export default BottomTimeline
