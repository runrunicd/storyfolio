import type { StorySpread } from '@/types'
import { SpreadThumbnail } from '@/components/flow/SpreadThumbnail'

interface FilmStripProps {
  spreads: StorySpread[]
  activeId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
  onRemove: (id: string) => void
}

export function FilmStrip({ spreads, activeId, onSelect, onAdd, onRemove }: FilmStripProps) {
  return (
    <div className="flex items-end gap-1.5 px-4 py-2.5 overflow-x-auto scrollbar-thin">
      {spreads.map((spread) => (
        <div key={spread.id} className="relative group shrink-0 w-28">
          <div
            className={[
              'rounded-lg overflow-hidden transition-all duration-150',
              activeId === spread.id
                ? 'ring-2 ring-ochre-500 ring-offset-1 ring-offset-cream-200/40'
                : 'ring-1 ring-cream-300 hover:ring-ochre-300',
            ].join(' ')}
          >
            <SpreadThumbnail spread={spread} onClick={() => onSelect(spread.id)} />
          </div>

          {/* Active underline accent */}
          {activeId === spread.id && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-ochre-500 rounded-full" />
          )}

          {/* Lock badge */}
          {spread.locked && (
            <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-moss-500 flex items-center justify-center text-white text-[8px] z-10 pointer-events-none">
              ✓
            </div>
          )}

          {/* Delete button */}
          {spreads.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemove(spread.id)
              }}
              title="Remove spread"
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cream-100 border border-cream-300 text-ink-500/50 text-[10px] leading-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-200 shadow-soft z-10"
            >
              ×
            </button>
          )}
        </div>
      ))}

      {/* Add spread */}
      <button
        onClick={onAdd}
        className="shrink-0 w-28 aspect-[2/1.4] rounded-lg border-2 border-dashed border-cream-300 hover:border-ochre-400 hover:bg-cream-200/50 transition-colors flex flex-col items-center justify-center gap-1 text-ink-500/40 hover:text-ochre-500 ml-0.5"
      >
        <span className="text-lg leading-none">+</span>
        <span className="font-sans text-[8px]">Add spread</span>
      </button>
    </div>
  )
}
