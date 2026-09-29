import type { ArgoPairAlert } from '../../services/alertApi'

const colorFor = (severity: ArgoPairAlert['severity']): string => ({
  normal: '#67e8f9',
  moderate: '#fbbf24',
  high: '#f87171',
  not_assessable: '#94a3b8',
})[severity]

export default function ResidualProfileChart({ alerts }: { alerts: ArgoPairAlert[] }) {
  if (alerts.length === 0) {
    return <p className="border border-white/10 bg-[#0b1524] p-3 text-xs text-slate-300">No matched residuals are available.</p>
  }
  const width = 300
  const height = 210
  const left = 46
  const right = 16
  const top = 18
  const bottom = 34
  const maximumDepth = Math.max(...alerts.map((alert) => alert.observation_depth_m), 1)
  const absoluteLimit = Math.max(...alerts.map((alert) => alert.absolute_residual), 0.1)
  const x = (value: number) => left + ((value + absoluteLimit) / (2 * absoluteLimit)) * (width - left - right)
  const y = (depth: number) => top + (depth / maximumDepth) * (height - top - bottom)
  const zeroX = x(0)

  return <figure className="border border-white/10 bg-[#0b1524] p-2">
    <figcaption className="mb-1 text-xs font-medium text-white">Residual vs Depth</figcaption>
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full max-w-full" role="img" aria-label="Observation minus model temperature residual by matched observation depth">
      <line x1={left} y1={top} x2={left} y2={height - bottom} stroke="#64748b" />
      <line x1={left} y1={height - bottom} x2={width - right} y2={height - bottom} stroke="#64748b" />
      <line x1={zeroX} y1={top} x2={zeroX} y2={height - bottom} stroke="#cbd5e1" strokeDasharray="4 3" />
      {alerts.map((alert) => <circle key={alert.alert_id} cx={x(alert.residual)} cy={y(alert.observation_depth_m)} r="4" fill={colorFor(alert.severity)}>
        <title>{`${alert.residual >= 0 ? '+' : ''}${alert.residual.toFixed(2)} °C at ${alert.observation_depth_m.toFixed(1)} m`}</title>
      </circle>)}
      <text x="3" y={top + 4} fill="#cbd5e1" fontSize="10">0 m</text>
      <text x="3" y={height - bottom + 3} fill="#cbd5e1" fontSize="10">{maximumDepth.toFixed(0)} m</text>
      <text x={left} y={height - 10} fill="#cbd5e1" fontSize="10">{-absoluteLimit.toFixed(2)}</text>
      <text x={zeroX} y={height - 10} textAnchor="middle" fill="#cbd5e1" fontSize="10">0</text>
      <text x={width - right} y={height - 10} textAnchor="end" fill="#cbd5e1" fontSize="10">+{absoluteLimit.toFixed(2)} °C</text>
    </svg>
    <p className="mt-1 text-[11px] text-slate-400">Points are validated matched levels only. Depth increases downward; no missing levels are interpolated.</p>
  </figure>
}
