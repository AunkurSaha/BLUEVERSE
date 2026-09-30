import { formatDisplayUnit, formatSelectedTime } from '../../lib/temperatureSlice'
import type { OceanProbeFrame, ProbeCurrentLevel, ProbeLevel, ProbeLocation, ProbeScalarProfile } from '../../lib/oceanProbe'

interface Props {
  frame: OceanProbeFrame | null
  location: ProbeLocation | null
  loading: boolean
  status: string | null
  error: string | null
  historical?: boolean
  modelSource: string
  onCancel: () => void
  onRetry: () => void
  onChooseAnother: () => void
}

const formatOffset = (milliseconds: number): string => {
  if (milliseconds === 0) return 'Matches global time'
  const hours = Math.abs(milliseconds) / 3_600_000
  const amount = hours >= 48 ? `${(hours / 24).toFixed(1)} days` : `${hours.toFixed(1)} hours`
  return `${milliseconds > 0 ? 'After' : 'Before'} global time by ${amount}`
}

const surfaceLevel = <T extends ProbeLevel | ProbeCurrentLevel>(levels: T[], value: (level: T) => number | null): T | null =>
  levels.find((level) => value(level) !== null) ?? null

function ProfileChart({ title, levels, units, depthUnits }: { title: string; levels: ProbeLevel[]; units: string; depthUnits: string }) {
  const finite = levels.filter((level): level is ProbeLevel & { value: number } => level.value !== null && Number.isFinite(level.value))
  if (finite.length === 0) return <div className="border border-white/10 bg-[#0b1524] p-3 text-xs text-amber-200">{title}: No valid data at location.</div>
  const width = 288; const height = 150; const left = 42; const right = 12; const top = 18; const bottom = 28
  const values = finite.map((level) => level.value); const minimum = Math.min(...values); const maximum = Math.max(...values)
  const maximumDepth = Math.max(...levels.map((level) => level.depth), 1)
  const x = (value: number) => left + (maximum === minimum ? 0.5 : (value - minimum) / (maximum - minimum)) * (width - left - right)
  const y = (depth: number) => top + depth / maximumDepth * (height - top - bottom)
  const segments: string[] = []; let active: string[] = []
  levels.forEach((level) => {
    if (level.value === null || !Number.isFinite(level.value)) { if (active.length) segments.push(active.join(' ')); active = []; return }
    active.push(`${x(level.value)},${y(level.depth)}`)
  })
  if (active.length) segments.push(active.join(' '))
  return <figure className="border border-white/10 bg-[#0b1524] p-2">
    <figcaption className="mb-1 text-xs font-medium text-white">{title}</figcaption>
    <svg viewBox={`0 0 ${width} ${height}`} className="h-36 w-full" role="img" aria-label={`${title}, actual depth increases downward`}>
      <line x1={left} y1={top} x2={left} y2={height - bottom} stroke="#64748b" />
      <line x1={left} y1={height - bottom} x2={width - right} y2={height - bottom} stroke="#64748b" />
      {segments.map((points, index) => <polyline key={index} points={points} fill="none" stroke="#22d3ee" strokeWidth="2" />)}
      {finite.map((level) => <circle key={`${level.depth}-${level.value}`} cx={x(level.value)} cy={y(level.depth)} r="2" fill="#67e8f9" />)}
      <text x="4" y={top + 4} fill="#cbd5e1" fontSize="10">0</text>
      <text x="4" y={height - bottom + 3} fill="#cbd5e1" fontSize="10">{maximumDepth.toFixed(0)} {depthUnits}</text>
      <text x={left} y={height - 8} fill="#cbd5e1" fontSize="10">{minimum.toFixed(2)}</text>
      <text x={width - right} y={height - 8} textAnchor="end" fill="#cbd5e1" fontSize="10">{maximum.toFixed(2)} {formatDisplayUnit(units)}</text>
    </svg>
  </figure>
}

function ScalarSummary({ label, profile }: { label: string; profile: ProbeScalarProfile }) {
  const surface = surfaceLevel(profile.levels, (level) => level.value)
  return <div className="border-t border-white/10 pt-2 text-xs">
    <div className="flex items-baseline justify-between gap-3"><span className="font-medium text-white">{label}</span><span className="text-cyan-100">{surface?.value === null || !surface ? 'Unavailable' : `${surface.value.toFixed(2)} ${formatDisplayUnit(profile.units)}`}</span></div>
    {surface && <p className="text-slate-400">Shallowest valid level: {surface.depth.toFixed(2)} {profile.depthUnits}</p>}
    <p className="text-slate-300">Actual time: {formatSelectedTime(profile.actualTime)}</p>
    <p className={profile.timeOffsetMilliseconds === 0 ? 'text-slate-400' : 'text-amber-200'}>{formatOffset(profile.timeOffsetMilliseconds)}</p>
    <p className="text-slate-400">Matched grid: {profile.matched.latitude.toFixed(4)}°, {profile.matched.longitude.toFixed(4)}°</p>
  </div>
}

export default function OceanProbePanel({
  frame, location, loading, status, error, historical = false, modelSource,
  onCancel, onRetry, onChooseAnother,
}: Props) {
  const currentSurface = frame?.currents ? surfaceLevel(frame.currents.levels, (level) => level.speed) : null
  const deepest = frame ? [
    ...(frame.temperature?.levels.filter((level) => level.value !== null).map((level) => level.depth) ?? []),
    ...(frame.salinity?.levels.filter((level) => level.value !== null).map((level) => level.depth) ?? []),
    ...(frame.currents?.levels.filter((level) => level.speed !== null).map((level) => level.depth) ?? []),
  ] : []
  const depthUnits = frame?.temperature?.depthUnits ?? frame?.salinity?.depthUnits ?? frame?.currents?.depthUnits ?? ''
  return <aside aria-labelledby="ocean-probe-title" className="w-full min-w-0 overflow-y-auto border border-white/10 bg-[#08111f] p-4 lg:h-full">
    <h2 id="ocean-probe-title" className="text-base font-semibold text-white">{historical ? 'Historical Ocean Probe' : 'Virtual Ocean Probe'}</h2>
    <p className="mt-1 text-xs text-slate-400">{historical ? 'GLORYS12V1 reanalysis water column at the nearest model-grid point.' : 'Model water column sampled at one nearest valid grid point.'}</p>
    {!location && <p role="status" className="mt-4 border border-white/10 bg-[#0b1524] p-3 text-sm text-slate-300">Click inside the Temperature model domain to select a probe.</p>}
    {location && <div className="mt-4 text-xs text-slate-300"><p>Requested: {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°</p>{frame && <p>{historical ? 'Requested event/source time' : 'Global selected time'}: {formatSelectedTime(frame.globalTime)}</p>}</div>}
    {location && <p className="mt-1 text-xs text-slate-400">Model source: {modelSource}</p>}
    {loading && <div className="loading-state" role="status"><div className="flex items-center gap-2"><span className="request-spinner" aria-hidden="true" /><p className="text-sm font-medium text-cyan-100">Loading water-column profiles...</p></div><button type="button" onClick={onCancel} className="mt-3 min-h-11 border border-white/20 px-3 text-xs font-semibold text-slate-100">Cancel</button></div>}
    {!loading && error && <div className="error-state" role="alert"><p className="text-sm font-semibold text-red-100">Profile unavailable</p><p className="mt-1">We couldn't load the model water column for this location.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={onRetry} className="min-h-11 border border-red-300/40 px-3 font-semibold text-red-100">Retry</button><button type="button" onClick={onChooseAnother} className="min-h-11 border border-white/20 px-3 font-semibold text-slate-100">Choose another point</button></div><details className="mt-2"><summary className="min-h-11 cursor-pointer py-3 text-slate-300">Technical details</summary><p className="break-words pb-2 text-slate-400">{error}</p></details></div>}
    {!loading && !error && status && <p role="status" className="mt-4 text-sm text-amber-200">{status}</p>}
    {frame && <div className="mt-4 space-y-4">
      <section aria-labelledby="probe-surface-title"><h3 id="probe-surface-title" className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Surface summary</h3>
        {frame.temperature ? <ScalarSummary label="Temperature model value" profile={frame.temperature} /> : <p className="border-t border-white/10 pt-2 text-xs text-amber-200">Temperature unavailable: {frame.errors.temperature}</p>}
        {frame.salinity ? <ScalarSummary label="Salinity model value" profile={frame.salinity} /> : <p className="border-t border-white/10 pt-2 text-xs text-amber-200">Salinity unavailable: {frame.errors.salinity}</p>}
        {frame.currents ? <div className="border-t border-white/10 pt-2 text-xs"><div className="flex items-baseline justify-between gap-3"><span className="font-medium text-white">Current model value</span><span className="text-cyan-100">{currentSurface?.speed === null || !currentSurface ? 'Unavailable' : `${currentSurface.speed.toFixed(3)} ${frame.currents.units}`}</span></div>{currentSurface && <><p className="text-slate-300">Direction toward: {currentSurface.directionTowardDegrees === null ? 'Undefined at zero speed' : `${currentSurface.directionTowardDegrees.toFixed(1)}° true`}</p><p className="text-slate-400">U: {currentSurface.u?.toFixed(3)} {frame.currents.units}; V: {currentSurface.v?.toFixed(3)} {frame.currents.units}; depth: {currentSurface.depth.toFixed(2)} {frame.currents.depthUnits}</p></>}<p className="text-slate-300">Actual time: {formatSelectedTime(frame.currents.actualTime)}</p><p className={frame.currents.timeOffsetMilliseconds === 0 ? 'text-slate-400' : 'text-amber-200'}>{formatOffset(frame.currents.timeOffsetMilliseconds)}</p><p className="text-slate-400">Matched grid: {frame.currents.matched.latitude.toFixed(4)}°, {frame.currents.matched.longitude.toFixed(4)}°</p></div> : <p className="border-t border-white/10 pt-2 text-xs text-amber-200">Currents unavailable: {frame.errors.currents}</p>}
      </section>
      <section aria-labelledby="probe-profile-title" className="space-y-2"><h3 id="probe-profile-title" className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Water-column profiles</h3>
        {frame.temperature && <ProfileChart title="Temperature vs Depth" levels={frame.temperature.levels} units={frame.temperature.units} depthUnits={frame.temperature.depthUnits} />}
        {frame.salinity && <ProfileChart title="Salinity vs Depth" levels={frame.salinity.levels} units={frame.salinity.units} depthUnits={frame.salinity.depthUnits} />}
        {frame.currents && <ProfileChart title="Current Speed vs Depth" levels={frame.currents.levels.map((level) => ({ depth: level.depth, value: level.speed }))} units={frame.currents.units} depthUnits={frame.currents.depthUnits} />}
      </section>
      <div className="border-t border-white/10 pt-3 text-xs text-slate-300"><p>Deepest valid depth: {deepest.length ? `${Math.max(...deepest).toFixed(2)} ${depthUnits}` : 'Unavailable'}</p><p>Sampling method: Nearest model-grid point</p><p>Values: {historical ? 'GLORYS12V1 model reanalysis, not observations' : 'Model values, not observations'}</p>{historical && <><p>Product: GLOBAL_MULTIYEAR_PHY_001_030</p><p>Provider: Mercator Ocean International</p></>}</div>
    </div>}
  </aside>
}
