import React from 'react'
import type { DatasetMetadata } from '../../services/api'

interface RightInspectorProps {
  dataset: string | null
  metadata: DatasetMetadata | null
  isLoading: boolean
  error: string | null
}

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return 'Not provided'
  if (Array.isArray(value)) return value.length > 0 ? value.map(String).join(', ') : 'Empty list'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

const RightInspector: React.FC<RightInspectorProps> = ({
  dataset,
  metadata,
  isLoading,
  error,
}) => {
  const coordinates = metadata
    ? [
        { label: 'Time', value: metadata.time_coordinate },
        { label: 'Vertical', value: metadata.vertical_coordinate },
        { label: 'Latitude', value: metadata.latitude_coordinate },
        { label: 'Longitude', value: metadata.longitude_coordinate },
      ]
    : []

  return (
    <aside
      aria-labelledby="inspector-title"
      className="scientific-scroll w-full shrink-0 border border-white/10 bg-[#08111f] lg:h-full lg:min-h-0 lg:w-[340px] lg:border-y-0 lg:border-r-0 lg:overflow-y-auto"
    >
      <div className="flex flex-col gap-4 px-4 py-4">
        <div>
          <h3
            id="inspector-title"
            className="text-[11px] font-semibold uppercase tracking-[0.08em] text-cyan-200/80"
          >
            Inspector
          </h3>
          <p className="mt-1 truncate text-sm font-semibold text-white">
            {dataset ?? 'No dataset selected'}
          </p>
        </div>

        {!dataset && (
          <p className="rounded-md border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-slate-300">
            Select a dataset to load its metadata.
          </p>
        )}

        {dataset && isLoading && (
          <p className="rounded-md border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-slate-300">
            Loading dataset metadata.
          </p>
        )}

        {dataset && error && (
          <p
            role="alert"
            className="rounded-md border border-red-400/40 bg-red-950/40 px-3 py-2 text-sm text-red-200"
          >
            {error}
          </p>
        )}

        {dataset && !isLoading && !error && metadata && (
          <>
            <section aria-labelledby="coordinates-title" className="space-y-2">
              <h4
                id="coordinates-title"
                className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400"
              >
                Detected coordinates
              </h4>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
                {coordinates.map((coordinate) => (
                  <React.Fragment key={coordinate.label}>
                    <dt className="text-slate-400">{coordinate.label}</dt>
                    <dd className="min-w-0 break-words font-medium text-white">
                      {coordinate.value ?? 'Not detected'}
                    </dd>
                  </React.Fragment>
                ))}
              </dl>
            </section>

            <section aria-labelledby="variables-title" className="space-y-2">
              <h4
                id="variables-title"
                className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400"
              >
                Variables
              </h4>
              {metadata.variables.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {metadata.variables.map((variable) => (
                    <li
                      key={variable}
                      className="rounded border border-white/10 bg-[#0b1524] px-2 py-1 font-mono text-xs text-slate-200"
                    >
                      {variable}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-300">No data variables reported.</p>
              )}
            </section>

            <section aria-labelledby="dimensions-title" className="space-y-2">
              <h4
                id="dimensions-title"
                className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400"
              >
                Dimensions
              </h4>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
                {Object.entries(metadata.dimensions).map(([name, size]) => (
                  <React.Fragment key={name}>
                    <dt className="font-mono text-slate-400">{name}</dt>
                    <dd className="text-right text-white">{size}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </section>

            <section aria-labelledby="provenance-title" className="space-y-2">
              <h4
                id="provenance-title"
                className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400"
              >
                Provenance
              </h4>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
                {[
                  { label: 'Provider', value: metadata.provenance.provider },
                  { label: 'Product', value: metadata.provenance.product_id },
                  { label: 'Model source', value: metadata.provenance.model_source },
                  { label: 'Institution', value: metadata.provenance.institution },
                ].map((item) => (
                  <React.Fragment key={item.label}>
                    <dt className="text-slate-400">{item.label}</dt>
                    <dd className="min-w-0 break-words font-medium text-slate-200">
                      {item.value ?? 'Not provided'}
                    </dd>
                  </React.Fragment>
                ))}
              </dl>
            </section>

            <section aria-labelledby="attributes-title" className="space-y-2">
              <h4
                id="attributes-title"
                className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400"
              >
                Global attributes
              </h4>
              <div className="scientific-scroll max-h-64 overflow-auto rounded-md border border-white/10 bg-[#0b1524] p-3">
                <dl className="space-y-2 text-xs">
                  {Object.entries(metadata.global_attributes).map(([name, value]) => (
                    <div key={name} className="grid gap-1">
                      <dt className="font-mono text-slate-400">{name}</dt>
                      <dd className="whitespace-pre-wrap break-words text-slate-200">
                        {formatValue(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          </>
        )}
      </div>
    </aside>
  )
}

export default RightInspector
