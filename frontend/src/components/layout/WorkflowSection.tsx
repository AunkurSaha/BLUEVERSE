import type { PropsWithChildren, ReactNode } from 'react'

interface Props extends PropsWithChildren {
  id: string
  label: 'WHERE' | 'WHAT' | 'EXPLORE' | 'ANALYSE'
  summary: string
  action?: ReactNode
}

export default function WorkflowSection({ id, label, summary, action, children }: Props) {
  return (
    <section aria-labelledby={`${id}-title`} className="workflow-section">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="workflow-label">{label}</h2>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{summary}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
