type PillType = 'personality' | 'visual' | 'mood' | 'default'

interface PillProps {
  label: string
  selected?: boolean
  type?: PillType
  onToggle?: () => void
  onRemove?: () => void
}

const typeClasses: Record<PillType, { base: string; selected: string }> = {
  personality: {
    base:     'bg-ochre-400/20 text-ochre-600 border border-ochre-400/30',
    selected: 'bg-ochre-500 text-white border-ochre-500',
  },
  visual: {
    base:     'bg-moss-400/20 text-moss-600 border border-moss-400/30',
    selected: 'bg-moss-500 text-white border-moss-500',
  },
  mood: {
    base:     'bg-cream-200 text-ink-500 border border-cream-300',
    selected: 'bg-ink-500 text-cream-100 border-ink-500',
  },
  default: {
    base:     'bg-cream-200 text-ink-500 border border-cream-300',
    selected: 'bg-ink-700 text-cream-100 border-ink-700',
  },
}

export function Pill({ label, selected = false, type = 'default', onToggle, onRemove }: PillProps) {
  const colors = typeClasses[type]
  const colorClass = selected ? colors.selected : colors.base

  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium font-sans',
        'transition-colors duration-150',
        colorClass,
        onToggle ? 'cursor-pointer select-none' : '',
      ].join(' ')}
      onClick={onToggle}
    >
      {label}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity leading-none"
          aria-label={`Remove ${label}`}
        >
          ×
        </button>
      )}
    </span>
  )
}
