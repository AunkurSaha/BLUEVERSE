import React from 'react'

import {
  cividisCssGradient,
  formatDisplayUnit,
  formatNumber,
  type PreparedTemperatureSlice,
} from '../../lib/temperatureSlice'

interface TemperatureLegendProps {
  layer: PreparedTemperatureSlice
}

const TemperatureLegend: React.FC<TemperatureLegendProps> = ({ layer }) => {
  const { slice } = layer
  const unit = formatDisplayUnit(slice.var_units)
  const minimum = formatNumber(slice.tmin)
  const maximum = formatNumber(slice.tmax)

  return (
    <figure
      aria-label={`Temperature color scale from ${minimum} to ${maximum} ${unit}`}
      className="pointer-events-none absolute bottom-3 right-3 z-10 w-[min(15rem,calc(100%-1.5rem))] rounded-lg border border-white/12 bg-[#07101e]/95 p-3 shadow-[0_10px_30px_rgba(2,6,13,0.5)] sm:bottom-4 sm:right-4"
    >
      <figcaption className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-300">
        Temperature
      </figcaption>
      <div
        aria-hidden="true"
        className="mt-2 h-2.5 w-full rounded-full border border-black/30"
        style={{ backgroundImage: cividisCssGradient() }}
      />
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-slate-300">
        <span className="font-mono">{minimum}</span>
        <span className="min-w-0 truncate">{unit}</span>
        <span className="font-mono">{maximum}</span>
      </div>
      <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">
        Source grid cells; no interpolation. No data is transparent.
      </p>
    </figure>
  )
}

export default TemperatureLegend
