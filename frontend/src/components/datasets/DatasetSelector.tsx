import React from 'react'

interface DatasetSelectorProps {
  datasets: string[]
  selectedDataset: string | null
  onSelect: (datasetId: string) => void
  isLoading: boolean
  error: string | null
}

const DatasetSelector: React.FC<DatasetSelectorProps> = ({
  datasets,
  selectedDataset,
  onSelect,
  isLoading,
  error,
}) => {
  return (
    <div className="space-y-2">
      <label htmlFor="dataset-select" className="block text-[11px] font-medium text-slate-400">
        Active dataset
      </label>
      <select
        id="dataset-select"
        aria-describedby="dataset-status"
        aria-invalid={Boolean(error)}
        disabled={isLoading || datasets.length === 0}
        value={selectedDataset ?? ''}
        onChange={(event) => onSelect(event.target.value)}
        className="w-full rounded-md border border-white/15 bg-[#0d1a2b] px-2.5 py-2 text-sm text-white outline-none transition-colors focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/30 disabled:cursor-not-allowed disabled:text-slate-400"
      >
        <option value="">
          {isLoading
            ? 'Loading datasets'
            : datasets.length === 0
              ? 'No datasets returned'
              : 'Select a dataset'}
        </option>
        {datasets.map((dataset) => (
          <option key={dataset} value={dataset}>
            {dataset}
          </option>
        ))}
      </select>
      <p
        id="dataset-status"
        aria-live="polite"
        className={error ? 'text-xs text-red-300' : 'text-xs text-slate-400'}
      >
        {error ?? `${datasets.length} dataset${datasets.length === 1 ? '' : 's'} available`}
      </p>
    </div>
  )
}

export default DatasetSelector
