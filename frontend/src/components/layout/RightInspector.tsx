import React from 'react'

import {
  formatDisplayUnit,
  formatGridShape,
  formatNumber,
  formatSelectedTime,
  type PreparedTemperatureSlice,
} from '../../lib/temperatureSlice'
import type { DatasetMetadata } from '../../services/api'

export interface TemperatureSliceSelection {
  variable: string
  timeIndex: number
  depthIndex: number
}

interface RightInspectorProps {
  dataset: string | null
  metadata: DatasetMetadata | null
  temperatureLayer: PreparedTemperatureSlice | null
  sliceSelection: TemperatureSliceSelection | null
  isLoading: boolean
  error: string | null
  sliceLoading: boolean
  sliceError: string | null
}

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return 'Not provided'
  if (Array.isArray(value)) return value.length > 0 ? value.map(String).join(', ') : 'Empty list'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

const formatCount = (value: number): string => value.toLocaleString()

const RightInspector: React.FC<RightInspectorProps> = ({
  dataset,
  metadata,
  temperatureLayer,
  sliceSelection,
  isLoading,
  error,
  sliceLoading,
  sliceError,
}) => {
  const coordinates = metadata
    ? [
        { label: 'Time', value: metadata.time_coordinate },
        { label: 'Vertical', value: metadata.vertical_coordinate },
        { label: 'Latitude', value: metadata.latitude_coordinate },
        { label: 'Longitude', value: metadata.longitude_coordinate },
      ]
    : []
  const slice = temperatureLayer?.slice ?? null
  const displayUnit = slice ? formatDisplayUnit(slice.var_units) : null

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

        {dataset && sliceLoading && (
          <p
            role="status"
            className="rounded-md border border-white/10 bg-[#0b1524] px-3 py-2 text-sm text-slate-300"
          >
            Loading temperature layer.
          </p>
        )}

        {dataset && sliceError && (
          <p
            role="alert"
            className="rounded-md border border-red-400/40 bg-red-950/40 px-3 py-2 text-sm text-red-200"
          >
            {sliceError}
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

            {slice && sliceSelection && (
              <section aria-labelledby="selected-slice-title" className="space-y-2">
                <h4
                  id="selected-slice-title"
                  className="text-[11px] font-semibold uppercase tracking-[0.08em] text-cyan-200/80"
                >
                  Selected temperature slice
                </h4>
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
                  {[
                    { label: 'Variable', value: slice.var_name },
                    { label: 'Long name', value: slice.var_long_name },
                    { label: 'Standard name', value: slice.var_standard_name },
                    { label: 'Units', value: `${displayUnit} (${slice.var_units})` },
                    { label: 'Actual time', value: formatSelectedTime(slice.actual_time) },
                    { label: 'Requested time index', value: sliceSelection.timeIndex },
                    {
                      label: 'Actual depth',
                      value: `${formatNumber(slice.actual_depth)} ${slice.depth_units}`,
                    },
                    { label: 'Requested depth index', value: sliceSelection.depthIndex },
                    { label: 'Depth units', value: slice.depth_units },
                    { label: 'Grid shape', value: formatGridShape(slice) },
                    { label: 'Grid order', value: 'latitude, longitude' },
                    { label: 'Valid cells', value: formatCount(slice.finite_count) },
                    { label: 'Missing cells', value: formatCount(slice.missing_count) },
                    { label: 'Minimum', value: `${formatNumber(slice.tmin)} ${displayUnit}` },
                    { label: 'Maximum', value: `${formatNumber(slice.tmax)} ${displayUnit}` },
                    { label: 'Mean', value: `${formatNumber(slice.tmean)} ${displayUnit}` },
                  ].map((item) => (
                    <React.Fragment key={item.label}>
                      <dt className="text-slate-400">{item.label}</dt>
                      <dd className="min-w-0 break-words font-medium text-slate-100">
                        {item.value}
                      </dd>
                    </React.Fragment>
                  ))}
                </dl>
              </section>
            )}

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
