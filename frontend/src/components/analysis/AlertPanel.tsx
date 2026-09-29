import React from 'react'
import type { ArgoPairAlert, ArgoProfileAlertDetail } from '../../services/alertApi'
import ResidualProfileChart from './ResidualProfileChart'

interface Props {
  detail: ArgoProfileAlertDetail | null
  loading: boolean
  error: string | null
  onClose: () => void
}

const signed = (value: number): string => `${value >= 0 ? '+' : ''}${value.toFixed(2)}`
const severityClass = (severity: ArgoPairAlert['severity']): string => ({
  normal: 'text-cyan-200',
  moderate: 'text-amber-200',
  high: 'text-red-200',
  not_assessable: 'text-slate-300',
})[severity]

export default function AlertPanel({ detail, loading, error, onClose }: Props) {
  const [expandedAlertId, setExpandedAlertId] = React.useState<string | null>(null)
  const summary = detail?.summary
  const firstAlert = detail?.alerts[0] ?? null
  const collocationProvenance = detail?.provenance.collocation_provenance as Record<string, unknown> | undefined
  return <aside aria-labelledby="alert-panel-title" className="scientific-scroll w-full min-w-0 overflow-y-auto border border-white/10 bg-[#08111f] lg:h-full">
    <div className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="alert-panel-title" className="text-sm font-semibold text-white">Model-Observation Deviation</h2>
          <p className="text-xs text-slate-400">ARGO temperature collocation evidence</p>
        </div>
        <button type="button" onClick={onClose} className="min-h-11 px-2 text-sm text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">Close</button>
      </div>
      {loading && <p role="status" className="text-sm text-cyan-100">Loading alert evidence...</p>}
      {error && <p role="alert" className="border border-red-400/40 bg-red-950/30 p-3 text-sm text-red-200">{error}</p>}
      {!loading && !error && !detail && <p role="status" className="text-sm text-slate-300">Select an alert marker to inspect its evidence.</p>}
      {summary && <>
        <section className="border border-white/10 bg-[#0b1524] p-3 text-xs">
          <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2">
            <dt className="text-slate-400">Platform</dt><dd className="text-right font-medium text-white">ARGO {summary.platform_id}</dd>
            <dt className="text-slate-400">Profile</dt><dd className="text-right font-medium text-white">{summary.profile_number}</dd>
            <dt className="text-slate-400">ARGO position</dt><dd className="text-right font-medium text-white">{summary.observation_latitude === null || summary.observation_longitude === null ? 'Unavailable' : `${summary.observation_latitude.toFixed(4)}°, ${summary.observation_longitude.toFixed(4)}°`}</dd>
            <dt className="text-slate-400">Model grid</dt><dd className="text-right font-medium text-white">{firstAlert ? `${firstAlert.model_latitude.toFixed(4)}°, ${firstAlert.model_longitude.toFixed(4)}°` : 'Not assessable'}</dd>
            <dt className="text-slate-400">Severity</dt><dd className={`text-right font-semibold uppercase ${severityClass(summary.severity)}`}>{summary.severity.replace('_', ' ')}</dd>
            <dt className="text-slate-400">Maximum residual</dt><dd className="text-right font-medium text-white">{summary.residual_at_maximum === null ? 'Not assessable' : `${signed(summary.residual_at_maximum)} °C`}</dd>
            <dt className="text-slate-400">At depth</dt><dd className="text-right font-medium text-white">{summary.depth_of_maximum_residual === null ? 'Not assessable' : `${summary.depth_of_maximum_residual.toFixed(1)} m`}</dd>
            <dt className="text-slate-400">Matched levels</dt><dd className="text-right font-medium text-white">{summary.matched_pair_count}</dd>
            <dt className="text-slate-400">Bias</dt><dd className="text-right font-medium text-white">{summary.bias === null ? 'Not assessable' : `${signed(summary.bias)} °C`}</dd>
            <dt className="text-slate-400">RMSE</dt><dd className="text-right font-medium text-white">{summary.rmse === null ? 'Not assessable' : `${summary.rmse.toFixed(2)} °C`}</dd>
            <dt className="text-slate-400">MAE</dt><dd className="text-right font-medium text-white">{summary.mae === null ? 'Not assessable' : `${summary.mae.toFixed(2)} °C`}</dd>
          </dl>
          {summary.not_assessable_reason && <p className="mt-3 text-amber-200">Not assessable: {summary.not_assessable_reason}</p>}
        </section>
        <section className="space-y-2 text-xs">
          <h3 className="font-semibold uppercase tracking-[0.08em] text-slate-400">Threshold configuration</h3>
          <p className="text-amber-100">{detail.thresholds.label}</p>
          <p className="text-slate-300">Normal: |residual| &lt; {detail.thresholds.normal_max_c.toFixed(2)} °C</p>
          <p className="text-slate-300">Moderate: {detail.thresholds.normal_max_c.toFixed(2)} to &lt; {detail.thresholds.moderate_max_c.toFixed(2)} °C</p>
          <p className="text-slate-300">High: |residual| ≥ {detail.thresholds.moderate_max_c.toFixed(2)} °C</p>
        </section>
        {detail.alerts.length > 0 && <ResidualProfileChart alerts={detail.alerts} />}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Matched-pair evidence</h3>
          {detail.alerts.length === 0 ? <p className="text-xs text-slate-300">No assessable collocation pairs.</p> : <div className="overflow-x-auto border border-white/10">
            <table className="w-full min-w-[430px] text-left text-[11px]">
              <thead className="bg-[#0b1524] text-slate-400"><tr><th className="p-2">Depth</th><th className="p-2">Observation</th><th className="p-2">Model</th><th className="p-2">Residual</th><th className="p-2">Severity</th></tr></thead>
              <tbody>{detail.alerts.map((alert) => <React.Fragment key={alert.alert_id}>
                <tr className="border-t border-white/10 text-slate-200">
                  <td className="p-2">{alert.observation_depth_m.toFixed(1)} m</td>
                  <td className="p-2">{alert.observation_value.toFixed(2)}</td>
                  <td className="p-2">{alert.model_value.toFixed(2)}</td>
                  <td className="p-2">{signed(alert.residual)}</td>
                  <td className="p-2"><button type="button" aria-expanded={expandedAlertId === alert.alert_id} onClick={() => setExpandedAlertId((current) => current === alert.alert_id ? null : alert.alert_id)} className={`min-h-11 text-left font-semibold uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 ${severityClass(alert.severity)}`}>{alert.severity}</button></td>
                </tr>
                {expandedAlertId === alert.alert_id && <tr className="border-t border-white/10 bg-[#0b1524]"><td colSpan={5} className="space-y-1 p-3 text-slate-300">
                  <p>Observation time: {alert.observation_time}</p><p>Model time: {alert.model_time}</p><p>Time offset: {alert.time_offset_hours.toFixed(2)} hours</p><p>Spatial distance: {alert.horizontal_distance_km.toFixed(2)} km</p><p>Model grid: {alert.model_latitude.toFixed(4)}°, {alert.model_longitude.toFixed(4)}°</p><p>Pressure: {alert.observation_pressure_dbar.toFixed(2)} dbar</p><p>Vertical mismatch: {alert.vertical_difference_m.toFixed(2)} m</p><p>QC: {alert.qc_status}</p>
                </td></tr>}
              </React.Fragment>)}</tbody>
            </table>
          </div>}
        </section>
        <section className="space-y-2 border-t border-white/10 pt-3 text-xs text-slate-300">
          <h3 className="font-semibold uppercase tracking-[0.08em] text-slate-400">Scientific interpretation</h3>
          <p>Residual is observation minus model at a validated matched point.</p>
          <p>Deviation indicates disagreement between model and observation at a matched point. It does not by itself imply a hazardous ocean condition.</p>
          <p>Source: {String(detail.provenance.source ?? 'Existing ARGO/model collocation')}</p>
          <p>Method: {String(detail.provenance.collocation_method ?? 'Not provided')}</p>
          <p>Observation provider: {String(collocationProvenance?.provider ?? 'Not provided')}</p>
          <p>Model source: {String(collocationProvenance?.model_source ?? 'Not provided')}</p>
        </section>
      </>}
    </div>
  </aside>
}
