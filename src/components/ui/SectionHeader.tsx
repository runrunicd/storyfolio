import type { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  action?: ReactNode
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-sans text-xs font-semibold text-ink-500/60 uppercase tracking-widest">
        {title}
      </h3>
      {action && <div>{action}</div>}
    </div>
  )
}
