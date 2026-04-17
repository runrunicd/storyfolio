import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 border-2 border-dashed border-cream-300 rounded-2xl text-center">
      {icon && <div className="text-4xl mb-3 opacity-40">{icon}</div>}
      <p className="font-serif text-ink-700 text-lg mb-1">{title}</p>
      {description && (
        <p className="font-sans text-sm text-ink-500/60 mb-4 max-w-xs">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
