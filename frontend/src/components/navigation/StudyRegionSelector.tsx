import type { RegionSummary } from '../../services/regionApi'

interface Props {
  regions: RegionSummary[]
  selectedRegionId: string
  loading: boolean
  error: string | null
  onSelect: (regionId: string) => void
}

const statusLabel = (status: RegionSummary['data_status']): string => {
  if (status === 'DATA_BACKED') return 'Data available'
  if (status === 'NAVIGATION_ONLY') return 'Navigation only'
  return 'Unavailable'
}

export default function StudyRegionSelector({ regions, selectedRegionId, loading, error, onSelect }: Props) {
  return (
    <section aria-labelledby="study-region-title" className="space-y-2">
      <h3 id="study-region-title" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-cyan-200/80">
        Study region
      </h3>
      <label className="block text-xs text-slate-300">
        <span className="sr-only">Viewed region</span>
        <select
          aria-label="Viewed study region"
          value={selectedRegionId}
          disabled={loading || regions.length === 0}
          onChange={(event) => onSelect(event.target.value)}
          className="min-h-11 w-full min-w-0 rounded-md border border-white/15 bg-[#0b1524] px-3 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 disabled:cursor-wait disabled:text-slate-400"
        >
          {regions.map((region) => (
            <option key={region.id} value={region.id}>
              {region.name} ({statusLabel(region.data_status)})
            </option>
          ))}
        </select>
      </label>
      {loading && <p role="status" className="text-xs text-slate-300">Loading region registry...</p>}
      {error && <p role="alert" className="rounded-md border border-red-400/40 bg-red-950/40 px-3 py-2 text-xs text-red-200">{error}</p>}
    </section>
  )
}
