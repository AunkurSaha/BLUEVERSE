import React from 'react'

interface TemperatureLayerStatusProps {
  isLoading: boolean
  error: string | null
  isEmpty: boolean
}

const TemperatureLayerStatus: React.FC<TemperatureLayerStatusProps> = ({
  isLoading,
  error,
  isEmpty,
}) => {
  if (!isLoading && !error && !isEmpty) return null

  return (
    <div
      role={error ? 'alert' : 'status'}
      aria-live="polite"
      className="pointer-events-none absolute left-3 top-3 z-10 max-w-[min(22rem,calc(100%-1.5rem))] rounded-lg border border-white/12 bg-[#07101e]/95 px-3 py-2 text-xs leading-relaxed shadow-[0_10px_30px_rgba(2,6,13,0.5)] sm:left-4 sm:top-4"
    >
      {isLoading && <p className="text-slate-300">Loading temperature layer…</p>}
      {!isLoading && isEmpty && (
        <p className="text-slate-300">No valid temperature cells are available.</p>
      )}
      {!isLoading && error && <p className="text-red-200">{error}</p>}
    </div>
  )
}

export default TemperatureLayerStatus
