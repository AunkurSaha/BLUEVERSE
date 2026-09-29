import { useEffect, useRef, useState } from 'react'
import { cividisCssGradient, formatDisplayUnit, formatSelectedTime, temperatureRgba } from '../../lib/temperatureSlice'
import type { TransectFrame } from '../../lib/transect'

interface Props { frame: TransectFrame | null; loading: boolean; status: string | null }
interface Inspection { distance: number; depth: number; latitude: number; longitude: number; value: number | null }

export default function TransectCrossSection({ frame, loading, status }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [inspection, setInspection] = useState<Inspection | null>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !frame) return
    const draw = () => {
      const rect = canvas.getBoundingClientRect(); const ratio = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.round(rect.width * ratio)); canvas.height = Math.max(1, Math.round(rect.height * ratio))
      const context = canvas.getContext('2d'); if (!context) return
      context.scale(ratio, ratio); context.clearRect(0, 0, rect.width, rect.height)
      const left = 62, right = 14, top = 12, bottom = 42, width = rect.width - left - right, height = rect.height - top - bottom
      const maxDistance = frame.points[frame.points.length - 1]?.distanceKm ?? 1; const maxDepth = frame.depths[frame.depths.length - 1] ?? 1
      for (let depthIndex = 0; depthIndex < frame.depths.length; depthIndex += 1) {
        const upper = depthIndex === 0 ? 0 : (frame.depths[depthIndex - 1] + frame.depths[depthIndex]) / 2
        const lower = depthIndex === frame.depths.length - 1 ? maxDepth : (frame.depths[depthIndex] + frame.depths[depthIndex + 1]) / 2
        const y = top + upper / maxDepth * height; const cellHeight = Math.max(1, (lower - upper) / maxDepth * height)
        for (let pointIndex = 0; pointIndex < frame.points.length; pointIndex += 1) {
          const value = frame.values[depthIndex][pointIndex]; if (value === null) continue
          const [red, green, blue] = temperatureRgba(value, frame.colorScale.min, frame.colorScale.max)
          context.fillStyle = `rgb(${red},${green},${blue})`
          context.fillRect(left + pointIndex / frame.points.length * width, y, width / frame.points.length + 0.5, cellHeight)
        }
      }
      context.strokeStyle = '#94a3b8'; context.lineWidth = 1; context.strokeRect(left, top, width, height)
      context.fillStyle = '#cbd5e1'; context.font = '11px sans-serif'; context.fillText('0', left, top + height + 14); context.fillText(maxDistance.toFixed(1), rect.width - 42, top + height + 14)
      context.textAlign = 'center'; context.fillText('Distance along transect (km)', left + width / 2, rect.height - 6); context.textAlign = 'start'
      context.fillText('0', left - 18, top + 8); context.fillText(maxDepth.toFixed(0), 24, top + height)
      context.save(); context.translate(11, top + height / 2); context.rotate(-Math.PI / 2); context.textAlign = 'center'; context.fillText(`Depth (${frame.depthUnits}), increasing downward`, 0, 0); context.restore()
    }
    draw(); const observer = new ResizeObserver(draw); observer.observe(canvas); return () => observer.disconnect()
  }, [frame])
  const inspect = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!frame) return
    const rect = event.currentTarget.getBoundingClientRect(), left = 62, right = 14, top = 12, bottom = 42
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left - left) / (rect.width - left - right))); const y = Math.min(1, Math.max(0, (event.clientY - rect.top - top) / (rect.height - top - bottom)))
    const pointIndex = Math.min(frame.points.length - 1, Math.round(x * (frame.points.length - 1))); const targetDepth = y * (frame.depths[frame.depths.length - 1] ?? 0)
    const depthIndex = frame.depths.reduce((best, depth, index) => Math.abs(depth - targetDepth) < Math.abs(frame.depths[best] - targetDepth) ? index : best, 0)
    const point = frame.points[pointIndex]; setInspection({ distance: point.distanceKm, depth: frame.depths[depthIndex], latitude: point.latitude, longitude: point.longitude, value: frame.values[depthIndex][pointIndex] })
  }
  return <section aria-labelledby="transect-panel-title" className="absolute inset-x-3 bottom-3 z-20 h-[46%] min-h-56 border border-white/15 bg-[#08111f] p-3 shadow-xl">
    <div className="mb-2 flex flex-wrap items-start justify-between gap-2"><div><h3 id="transect-panel-title" className="text-sm font-semibold text-white">Vertical Temperature Section</h3><p className="text-xs text-slate-400">{frame ? `${formatSelectedTime(frame.actualTime)} · Horizontal sampling: Nearest model-grid point` : 'No transect selected'}</p></div>{frame && <div className="text-right text-xs text-slate-300"><p>Section scale: {frame.colorScale.min.toFixed(2)}–{frame.colorScale.max.toFixed(2)} {formatDisplayUnit(frame.units)}</p><div className="mt-1 h-2 w-32" style={{ background: cividisCssGradient() }} /></div>}</div>
    {loading && <p role="status" className="text-sm text-cyan-100">Loading transect data...</p>}
    {!loading && status && <p role="alert" className="text-sm text-amber-200">{status}</p>}
    {frame && <><canvas ref={canvasRef} onMouseMove={inspect} onMouseLeave={() => setInspection(null)} className="h-[calc(100%_-_3.5rem)] w-full" role="img" aria-label="Distance by actual depth temperature cross-section" />{inspection && <div className="pointer-events-none absolute right-4 top-14 border border-white/15 bg-[#0b1524] px-2 py-1.5 text-[11px] text-slate-200"><p>Distance: {inspection.distance.toFixed(1)} km</p><p>Depth: {inspection.depth.toFixed(1)} {frame.depthUnits}</p><p>Latitude: {inspection.latitude.toFixed(4)}°</p><p>Longitude: {inspection.longitude.toFixed(4)}°</p><p>Model value: {inspection.value === null ? 'Missing' : `${inspection.value.toFixed(2)} ${formatDisplayUnit(frame.units)}`}</p><p>Timestamp: {formatSelectedTime(frame.actualTime)}</p><p className="text-slate-400">Sampling: Nearest model-grid point</p></div>}</>}
  </section>
}
