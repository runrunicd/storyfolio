import type { ColorSwatch } from '@/types'

interface SwatchProps {
  color: ColorSwatch
  onToggle: () => void
}

export function Swatch({ color, onToggle }: SwatchProps) {
  return (
    <button
      title={color.name}
      onClick={onToggle}
      className={[
        'w-7 h-7 rounded-full transition-transform duration-150',
        'border-2 relative flex items-center justify-center',
        color.selected
          ? 'border-ink-700 scale-110'
          : 'border-cream-300 hover:border-ink-500 hover:scale-105',
      ].join(' ')}
      style={{ backgroundColor: color.hex }}
    >
      {color.selected && (
        <span
          className="text-[10px] leading-none font-bold drop-shadow"
          style={{ color: isLight(color.hex) ? '#2C2825' : '#FAF7F2' }}
        >
          ✓
        </span>
      )}
    </button>
  )
}

function isLight(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
}
