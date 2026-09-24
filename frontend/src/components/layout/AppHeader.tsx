import React from 'react'
import type { BackendStatus } from '../../services/api'

const statusLabels: Record<BackendStatus, string> = {
  checking: 'Checking backend',
  online: 'Backend online',
  offline: 'Backend offline',
}

const AppHeader: React.FC<{
  backendStatus: BackendStatus
  selectedDataset: string | null
}> = ({ backendStatus, selectedDataset }) => {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#08111f] px-3 sm:px-4 lg:h-14">
      <div className="min-w-0">
        <p className="truncate text-base font-semibold tracking-tight text-white">BLUEVERSE</p>
        <p className="truncate text-[11px] text-slate-400">Oceanographic analysis workspace</p>
      </div>

      <div className="flex min-w-0 items-center gap-3 text-right sm:gap-5">
        <div className="hidden min-w-0 sm:block">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-400">Dataset</p>
          <p className="max-w-[36vw] truncate text-sm font-medium text-white">
            {selectedDataset ?? 'None selected'}
          </p>
        </div>

        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-400">Status</p>
          <p
            aria-live="polite"
            className={
              backendStatus === 'online'
                ? 'text-sm font-medium text-cyan-200'
                : backendStatus === 'offline'
                  ? 'text-sm font-medium text-red-300'
                  : 'text-sm font-medium text-slate-300'
            }
          >
            {statusLabels[backendStatus]}
          </p>
        </div>
      </div>
    </header>
  )
}

export default AppHeader
