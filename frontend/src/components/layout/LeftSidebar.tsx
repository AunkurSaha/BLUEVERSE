import React from 'react'
import DatasetSelector from '../datasets/DatasetSelector'

interface LeftSidebarProps {
  datasets: string[]
  selectedDataset: string | null
  onDatasetSelect: (datasetId: string) => void
  isLoading: boolean
  error: string | null
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  datasets,
  selectedDataset,
  onDatasetSelect,
  isLoading,
  error,
}) => {
  const layerCategories = [
    { name: 'Temperature', status: 'Available' },
    { name: 'Salinity', status: 'Coming later' },
    { name: 'Ocean Currents', status: 'Coming later' },
    { name: 'Argo Floats', status: 'Coming later' },
  ]
  const temperatureSelected = selectedDataset?.includes('temperature') ?? false

  return (
    <aside
      aria-labelledby="left-sidebar-title"
      className="w-full shrink-0 border border-white/10 bg-[#08111f] lg:h-full lg:min-h-0 lg:w-64 lg:border-y-0 lg:border-l-0 lg:overflow-y-auto"
    >
      <div className="flex flex-col gap-5 px-4 py-5">
        <section aria-labelledby="dataset-section-title" className="space-y-2">
          <h3
            id="left-sidebar-title"
            className="text-[11px] font-semibold uppercase tracking-[0.08em] text-cyan-200/80"
          >
            Layers
          </h3>
          <h4 id="dataset-section-title" className="text-sm font-semibold text-white">
            Dataset context
          </h4>
          <DatasetSelector
            datasets={datasets}
            selectedDataset={selectedDataset}
            onSelect={onDatasetSelect}
            isLoading={isLoading}
            error={error}
          />
        </section>

        <section aria-labelledby="layer-section-title" className="space-y-2">
          <h4
            id="layer-section-title"
            className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400"
          >
            Layer categories
          </h4>
          <ul className="space-y-1.5">
            {layerCategories.map((layer) => (
              <li
                key={layer.name}
                aria-disabled={layer.status === 'Coming later'}
                aria-current={layer.name === 'Temperature' && temperatureSelected ? 'true' : undefined}
                className={
                  layer.name === 'Temperature' && temperatureSelected
                    ? 'flex min-h-[2.25rem] items-center justify-between gap-3 rounded-md border border-cyan-300/40 bg-cyan-950/30 px-3 py-2 text-sm'
                    : 'flex min-h-[2.25rem] items-center justify-between gap-3 rounded-md border border-white/10 bg-[#0b1524] px-3 py-2 text-sm'
                }
              >
                <span className="font-medium text-white">{layer.name}</span>
                <span
                  className={
                    layer.status === 'Available'
                      ? 'text-[11px] font-semibold tracking-[0.04em] text-cyan-200'
                      : 'text-[10px] font-medium tracking-[0.02em] text-slate-500'
                  }
                >
                  {layer.name === 'Temperature' && temperatureSelected ? 'Selected dataset' : layer.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  )
}

export default LeftSidebar
