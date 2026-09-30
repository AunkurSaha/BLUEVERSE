interface Props {
  title: string
  steps: string[]
  tone?: 'current' | 'historical'
}

export default function ToolInstruction({ title, steps, tone = 'current' }: Props) {
  return (
    <div className={`tool-instruction ${tone === 'historical' ? 'tool-instruction--historical' : ''}`} role="status">
      <p className="text-xs font-semibold text-white">{title}</p>
      {steps.map((step) => <p key={step} className="mt-1 text-[11px] text-slate-300">{step}</p>)}
    </div>
  )
}
