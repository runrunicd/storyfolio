import { useState } from 'react'
import { useActiveProject } from '@/store'
import { SpreadThumbnail } from './SpreadThumbnail'
import { SpreadZoom } from './SpreadZoom'

const COLS = 5

export function FlowView() {
  const project = useActiveProject()
  const [zoomedId, setZoomedId] = useState<string | null>(null)

  if (!project) return null

  const spreads = project.storyFlow
  const zoomedSpread = zoomedId ? spreads.find((s) => s.id === zoomedId) ?? null : null

  // Chunk into rows of COLS
  const rows: typeof spreads[] = []
  for (let i = 0; i < spreads.length; i += COLS) {
    rows.push(spreads.slice(i, i + COLS))
  }

  const filledCount = spreads.filter((s) => s.manuscriptText || s.sceneImageDataUrl).length

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="px-8 py-8">
        {/* Header */}
        <div className="flex items-baseline justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl text-ink-700">{project.title}</h1>
            <p className="font-sans text-sm text-ink-500/50 mt-1">
              Storyboard · {filledCount} / 16 spreads · Click any spread to zoom
            </p>
          </div>
        </div>

        {/* Storyboard grid */}
        <div className="flex flex-col gap-6">
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
              {row.map((spread) => (
                <SpreadThumbnail
                  key={spread.id}
                  spread={spread}
                  onClick={() => setZoomedId(spread.id)}
                />
              ))}
              {/* Fill empty cells in last row */}
              {row.length < COLS &&
                Array.from({ length: COLS - row.length }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
            </div>
          ))}
        </div>

        {/* Page number legend */}
        <p className="mt-8 font-sans text-xs text-ink-500/30 text-center">
          {project.title} · 32 pages · 16 spreads
        </p>
      </div>

      {/* Zoom overlay */}
      {zoomedSpread && (
        <SpreadZoom
          spread={zoomedSpread}
          spreads={spreads}
          onClose={() => setZoomedId(null)}
          onNavigate={(id) => setZoomedId(id)}
        />
      )}
    </div>
  )
}
