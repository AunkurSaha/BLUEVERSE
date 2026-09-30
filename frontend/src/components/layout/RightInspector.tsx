import React from 'react'
import { formatDisplayUnit, formatGridShape, formatNumber, formatSelectedTime, type PreparedTemperatureSlice } from '../../lib/temperatureSlice'
import type { SubsurfaceSample } from '../../lib/subsurfaceFrame'
import type { IsosurfaceSample } from '../globe/IsosurfaceLayer'
import type { DatasetMetadata } from '../../services/api'

export interface TemperatureSliceSelection { variable: string; timeIndex: number; depthIndex: number }
interface Props {
  dataset: string | null; metadata: DatasetMetadata | null
  oceanLayer: { type: 'scalar'; data: PreparedTemperatureSlice } | { type: 'vector'; uo: PreparedTemperatureSlice; vo: PreparedTemperatureSlice } | null
  sliceSelection: TemperatureSliceSelection | null; isLoading: boolean; error: string | null
  sliceLoading: boolean; sliceError: string | null; colorScale: { min: number; max: number } | null
  scaleLoading: boolean; previousTimeMean: number | null; subsurfaceSample: SubsurfaceSample | null
  isosurfaceSample: IsosurfaceSample | null; onClose?: () => void
}

const formatValue = (value: unknown) => value === null || value === undefined || value === '' ? 'Not provided' : Array.isArray(value) ? value.join(', ') : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)

export default function RightInspector({ dataset, metadata, oceanLayer, sliceSelection, isLoading, error, sliceLoading, sliceError, colorScale, scaleLoading, previousTimeMean, subsurfaceSample, isosurfaceSample, onClose }: Props) {
  const slice = oceanLayer?.type === 'scalar' ? oceanLayer.data.slice : oceanLayer?.uo.slice
  const unit = slice ? formatDisplayUnit(slice.var_units) : ''
  const variable = sliceSelection?.variable === 'thetao' ? 'Temperature' : sliceSelection?.variable === 'so' ? 'Salinity' : 'Currents'
  const primarySample = isosurfaceSample
    ? { title: 'Temperature Isosurface', value: `${formatNumber(isosurfaceSample.target, 1)} ${formatDisplayUnit(isosurfaceSample.units)}`, depth: `${formatNumber(isosurfaceSample.realDepth)} m`, time: formatSelectedTime(isosurfaceSample.actualTime), location: `${formatNumber(isosurfaceSample.latitude)}°, ${formatNumber(isosurfaceSample.longitude)}°` }
    : subsurfaceSample
      ? { title: '3D Subsurface Sample', value: subsurfaceSample.value === null ? 'Missing value' : `${formatNumber(subsurfaceSample.value)} ${formatDisplayUnit(subsurfaceSample.units)}`, depth: `${formatNumber(subsurfaceSample.realDepth)} ${subsurfaceSample.depthUnits}`, time: formatSelectedTime(subsurfaceSample.actualTime), location: `${formatNumber(subsurfaceSample.latitude)}°, ${formatNumber(subsurfaceSample.longitude)}°` }
      : slice
        ? { title: variable, value: `${formatNumber(slice.tmean)} ${unit} mean`, depth: `${formatNumber(slice.actual_depth)} ${slice.depth_units}`, time: formatSelectedTime(slice.actual_time), location: 'Displayed model domain' }
        : null

  return (
    <aside aria-labelledby="inspector-title" className="inspector-content">
      <div className="drawer-titlebar"><div><p className="workflow-label">INSPECT</p><h2 id="inspector-title" className="text-base font-semibold text-white">Scientific details</h2></div>{onClose && <button type="button" className="drawer-close" onClick={onClose} aria-label="Close inspector">Close</button>}</div>
      {!dataset && <p className="empty-state">Choose a data-backed region and variable to inspect its scientific context.</p>}
      {(isLoading || sliceLoading) && <p role="status" className="loading-state">Loading scientific context…</p>}
      {(error || sliceError) && <p role="alert" className="error-state">{error ?? sliceError}</p>}
      {primarySample && <section className="result-summary" aria-labelledby="result-summary-title">
        <p id="result-summary-title" className="result-variable">{primarySample.title}</p>
        <p className="result-value">{primarySample.value}</p>
        <dl className="result-facts"><div><dt>Depth</dt><dd>{primarySample.depth}</dd></div><div><dt>Time</dt><dd>{primarySample.time}</dd></div><div><dt>Location</dt><dd>{primarySample.location}</dd></div></dl>
      </section>}
      {metadata && <details className="provenance-details">
        <summary>SOURCE &amp; PROVENANCE</summary>
        <dl className="metadata-list">
          <div><dt>Dataset</dt><dd>{dataset}</dd></div>
          {slice && <><div><dt>Variable</dt><dd>{slice.var_name}</dd></div><div><dt>Standard name</dt><dd>{slice.var_standard_name}</dd></div><div><dt>Units</dt><dd>{slice.var_units}</dd></div><div><dt>Actual time</dt><dd>{formatSelectedTime(slice.actual_time)}</dd></div><div><dt>Actual depth</dt><dd>{formatNumber(slice.actual_depth)} {slice.depth_units}</dd></div><div><dt>Grid</dt><dd>{formatGridShape(slice)}</dd></div><div><dt>Grid order</dt><dd>latitude, longitude</dd></div><div><dt>Valid cells</dt><dd>{slice.finite_count.toLocaleString()}</dd></div><div><dt>Missing cells</dt><dd>{slice.missing_count.toLocaleString()}</dd></div></>}
          {sliceSelection && <><div><dt>Requested time index</dt><dd>{sliceSelection.timeIndex}</dd></div><div><dt>Requested depth index</dt><dd>{sliceSelection.depthIndex}</dd></div></>}
          <div><dt>Coordinates</dt><dd>{[metadata.time_coordinate, metadata.vertical_coordinate, metadata.latitude_coordinate, metadata.longitude_coordinate].filter(Boolean).join(', ')}</dd></div>
          <div><dt>Provider</dt><dd>{metadata.provenance.provider ?? 'Not provided'}</dd></div><div><dt>Product</dt><dd>{metadata.provenance.product_id ?? 'Not provided'}</dd></div><div><dt>Model source</dt><dd>{metadata.provenance.model_source ?? 'Not provided'}</dd></div>
          {colorScale && <div><dt>Display scale</dt><dd>{formatNumber(colorScale.min)} to {formatNumber(colorScale.max)} {unit}; fixed across source times at this depth</dd></div>}
          {scaleLoading && <div><dt>Display scale</dt><dd>Computing temporal scale…</dd></div>}
          {slice && previousTimeMean !== null && <div><dt>Mean change</dt><dd>{formatNumber(slice.tmean - previousTimeMean)} {unit} from previous source time</dd></div>}
        </dl>
        <details className="mt-3"><summary className="text-xs text-slate-400">Global attributes</summary><dl className="metadata-list mt-2">{Object.entries(metadata.global_attributes).map(([name, value]) => <div key={name}><dt>{name}</dt><dd className="whitespace-pre-wrap">{formatValue(value)}</dd></div>)}</dl></details>
      </details>}
    </aside>
  )
}
