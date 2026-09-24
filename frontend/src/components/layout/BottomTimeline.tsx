import React from 'react'

const BottomTimeline: React.FC = () => {
  return (
    <footer className="shrink-0 border-t border-white/10 bg-[#08111f]">
      <fieldset disabled className="px-3 py-2 sm:px-4">
        <legend className="sr-only">Time and depth controls</legend>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-white/15 bg-[#0b1524] px-2.5 py-1.5 text-sm font-medium text-slate-400 disabled:cursor-not-allowed"
            >
              Play
            </button>
            <p className="text-sm text-slate-400">
              Time: <span className="text-slate-300">Not selected</span>
            </p>
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="h-1.5 min-w-0 flex-1 rounded-full bg-white/10" aria-hidden="true" />
            <span className="shrink-0 text-[10px] font-medium tracking-[0.02em] text-slate-500">
              Coming later
            </span>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-400">
            Depth
            <select className="rounded-md border border-white/15 bg-[#0b1524] px-2 py-1 text-sm text-slate-400 disabled:cursor-not-allowed">
              <option>Waiting for slice loading</option>
            </select>
          </label>
        </div>
      </fieldset>
    </footer>
  )
}

export default BottomTimeline
