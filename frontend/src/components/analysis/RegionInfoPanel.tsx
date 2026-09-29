import { datasetDisplayName } from '../../lib/regions'
import type { RegionDetail, RegionSummary } from '../../services/regionApi'

interface Props {
  region: RegionSummary | null
  detail: RegionDetail | null
  detailLoading: boolean
  detailError: string | null
  activeDatasetId: string | null
}

export default function RegionInfoPanel({ region, detail, detailLoading, detailError, activeDatasetId }: Props) {
  if (!region) return null
  const dataBacked = region.data_status === 'DATA_BACKED'
  const activeModelDataset = detail?.model_datasets.find((dataset) => dataset.id === activeDatasetId)
    ?? detail?.model_datasets[0]

  return (
    <section aria-labelledby="region-context-title" className="space-y-3 border-t border-white/10 pt-4 text-xs">
      <h4 id="region-context-title" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Active context</h4>
      <dl className="space-y-2">
        <div>
          <dt className="text-slate-400">Viewed region</dt>
          <dd className="break-words font-medium text-white">{region.name}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Active scientific dataset</dt>
          <dd className="break-words font-medium text-white">{datasetDisplayName(activeDatasetId, detail)}</dd>
        </div>
      </dl>
      <div className={`rounded-md border px-3 py-2 ${dataBacked ? 'border-cyan-300/30 bg-cyan-950/20' : 'border-amber-300/30 bg-amber-950/20'}`}>
        <p className={`font-semibold ${dataBacked ? 'text-cyan-100' : 'text-amber-100'}`}>
          {dataBacked ? 'DATA-BACKED REGION' : region.data_status === 'NAVIGATION_ONLY' ? 'NAVIGATION PRESET' : 'REGION UNAVAILABLE'}
        </p>
        {!dataBacked && (
          <p className="mt-1 leading-5 text-slate-200">
            {region.data_status === 'NAVIGATION_ONLY'
              ? 'Navigation preset only. No BLUEVERSE model dataset is currently registered for this region.'
              : 'The required model dataset is not currently available for this region.'}
          </p>
        )}
      </div>
      {detailLoading && <p role="status" className="text-slate-300">Loading region details...</p>}
      {detailError && <p role="alert" className="text-red-200">{detailError}</p>}
      {detail && dataBacked && (
        <details className="border-t border-white/10 pt-3">
          <summary className="min-h-11 cursor-pointer py-3 font-medium text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">Region data sources</summary>
          <dl className="space-y-2 pb-1 text-slate-300">
            <div><dt className="text-slate-400">Model datasets</dt><dd>{detail.model_datasets.map((dataset) => dataset.label).join(', ') || 'None registered'}</dd></div>
            <div><dt className="text-slate-400">Available model variables</dt><dd>{detail.supported_variables.join(', ') || 'None registered'}</dd></div>
            <div><dt className="text-slate-400">Observations</dt><dd>{detail.observation_sources.join(', ') || 'None registered'}</dd></div>
            <div><dt className="text-slate-400">Validation</dt><dd>{detail.observation_sources.includes('ARGO') ? 'Available' : 'Unavailable'}</dd></div>
            <div><dt className="text-slate-400">Glider</dt><dd>{detail.observation_sources.includes('Spray Glider') ? 'Available' : 'Unavailable'}</dd></div>
            <div><dt className="text-slate-400">Model–Observation Alerts</dt><dd>{detail.analysis_capabilities.includes('Model-Observation Alerts') ? 'Available' : 'Unavailable'}</dd></div>
            <div><dt className="text-slate-400">Analysis tools</dt><dd>{detail.analysis_capabilities.join(', ') || 'None registered'}</dd></div>
            {detail.time_coverage && <div><dt className="text-slate-400">Time coverage</dt><dd>{detail.time_coverage}</dd></div>}
            {activeModelDataset?.bounds && (
              <div>
                <dt className="text-slate-400">Model dataset extent</dt>
                <dd>
                  {activeModelDataset.bounds.west.toFixed(2)}°E–{activeModelDataset.bounds.east.toFixed(2)}°E,{' '}
                  {activeModelDataset.bounds.south.toFixed(2)}°N–{activeModelDataset.bounds.north.toFixed(2)}°N
                </dd>
              </div>
            )}
            {activeModelDataset?.depth_coverage && <div><dt className="text-slate-400">Model depth coverage</dt><dd>{activeModelDataset.depth_coverage}</dd></div>}
            {activeModelDataset?.time_coverage && <div><dt className="text-slate-400">Model time coverage</dt><dd>{activeModelDataset.time_coverage}</dd></div>}
          </dl>
        </details>
      )}
      {!dataBacked && <p className="leading-5 text-slate-400">Scientific map layers are hidden here and remain tied to their registered Bay of Bengal datasets.</p>}
    </section>
  )
}
