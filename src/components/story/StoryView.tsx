import { useEffect, useRef, useState } from 'react'
import { useProjectStore, useActiveProject } from '@/store'
import { RoughIdeas } from '@/components/dream/RoughIdeas'
import { SpreadThumbnail } from '@/components/flow/SpreadThumbnail'
import { SpreadEditPanel } from './SpreadEditPanel'
import { ReadMode } from './ReadMode'
import type { StorySpread } from '@/types'

const COLS = 5
const UNDO_DURATION = 5000

export function StoryView() {
  const project = useActiveProject()
  const [activeSpreadId, setActiveSpreadId] = useState<string | null>(null)
  const [readModeOpen, setReadModeOpen] = useState(false)
  const { addSpread, insertSpread, removeSpread, restoreSpread, updateSpread } = useProjectStore()

  // Undo state
  const [undoState, setUndoState] = useState<{ spread: StorySpread; atIndex: number } | null>(null)
  const [undoProgress, setUndoProgress] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const undoStartRef = useRef<number>(0)

  const clearUndo = () => {
    setUndoState(null)
    setUndoProgress(0)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  useEffect(() => () => clearUndo(), [])

  if (!project) return null

  const spreads = project.storyFlow

  const activeSpread = spreads.find((s) => s.id === activeSpreadId) ?? null
  if (activeSpreadId && !activeSpread) setActiveSpreadId(null)

  const handleRemove = (id: string) => {
    const idx = spreads.findIndex((s) => s.id === id)
    const spread = spreads[idx]
    if (!spread) return
    removeSpread(id)
    if (activeSpreadId === id) setActiveSpreadId(null)

    clearUndo()
    setUndoState({ spread, atIndex: idx })
    setUndoProgress(100)
    undoStartRef.current = Date.now()
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - undoStartRef.current
      setUndoProgress(Math.max(0, 100 - (elapsed / UNDO_DURATION) * 100))
    }, 50)
    timerRef.current = setTimeout(clearUndo, UNDO_DURATION)
  }

  const handleUndo = () => {
    if (!undoState) return
    restoreSpread(undoState.spread, undoState.atIndex)
    clearUndo()
  }

  // ── Workspace mode ────────────────────────────────────────────
  if (activeSpread) {
    const idx = spreads.findIndex((s) => s.id === activeSpread.id)
    const prev = idx > 0 ? spreads[idx - 1] : null
    const next = idx < spreads.length - 1 ? spreads[idx + 1] : null

    return (
      <div className="flex flex-col h-full overflow-hidden">
        <SpreadEditPanel
          spread={activeSpread}
          onBack={() => setActiveSpreadId(null)}
          onPrev={prev ? () => setActiveSpreadId(prev.id) : undefined}
          onNext={next ? () => setActiveSpreadId(next.id) : undefined}
        />
      </div>
    )
  }

  // ── Storyboard mode ───────────────────────────────────────────
  const filledCount = spreads.filter((s) => s.manuscriptText || s.sceneImageDataUrl).length

  // Build flat array of items: each spread + an "insert after" slot
  // Render as CSS grid; insertion slots sit in the gap column between cards
  // Strategy: render rows manually, inserting a thin "insert" column between spread columns

  const rows: typeof spreads[] = []
  for (let i = 0; i < spreads.length; i += COLS) {
    rows.push(spreads.slice(i, i + COLS))
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin bg-cream-100 relative">
      <div className="px-8 py-6 flex flex-col gap-6">

        <RoughIdeas project={project} />

        <StoryArc spreads={spreads} onUpdateBeat={(id, beat) => updateSpread(id, { plotBeat: beat })} />

        <div className="flex items-baseline justify-between">
          <h1 className="font-serif text-2xl text-ink-700">{project.title}</h1>
          <div className="flex items-center gap-3">
            {spreads.length > 0 && (
              <button
                onClick={() => setReadModeOpen(true)}
                className="font-sans text-xs text-ink-500/50 hover:text-ochre-600 border border-cream-300 hover:border-ochre-400 hover:bg-ochre-500/5 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <span className="text-[11px] leading-none">▶</span>
                Read
              </button>
            )}
            <p className="font-sans text-xs text-ink-500/40">
              {filledCount} / {spreads.length} spreads
            </p>
          </div>
        </div>

        {/* Spread grid with insert slots */}
        <div className="flex flex-col gap-3">
          {rows.map((row, rowIdx) => {
            const rowStartIdx = rowIdx * COLS
            return (
              <div key={rowIdx} className="flex flex-col gap-3">

                {/* Insert-before row: only show for first row (insert at position 0) */}
                {rowIdx === 0 && (
                  <InsertRow
                    onInsert={() => insertSpread(0)}
                    label="Insert at start"
                  />
                )}

                <div className="flex items-stretch gap-0">
                  {row.map((spread, colIdx) => {
                    const spreadIdx = rowStartIdx + colIdx
                    return (
                      <div key={spread.id} className="flex items-stretch flex-1 min-w-0">
                        {/* Spread card */}
                        <div className="relative group flex-1 min-w-0">
                          <div className="rounded-lg overflow-hidden ring-1 ring-cream-300 hover:ring-ochre-400 transition-all duration-150 hover:shadow-medium">
                            <SpreadThumbnail
                              spread={spread}
                              onClick={() => setActiveSpreadId(spread.id)}
                            />
                          </div>

                          {spread.locked && (
                            <div className="absolute bottom-6 right-1 w-4 h-4 rounded-full bg-moss-500 flex items-center justify-center text-white text-[8px] z-10 pointer-events-none">
                              ✓
                            </div>
                          )}

                          {spreads.length > 1 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemove(spread.id) }}
                              title="Remove spread"
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-cream-100 border border-cream-300 text-ink-500/50 text-[10px] leading-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:border-red-200 shadow-soft z-10"
                            >
                              ×
                            </button>
                          )}
                        </div>

                        {/* Insert-after slot (between cards, and after last in row) */}
                        <InsertSlot onInsert={() => insertSpread(spreadIdx + 1)} />
                      </div>
                    )
                  })}

                  {/* Empty cells to maintain grid alignment */}
                  {row.length < COLS &&
                    Array.from({ length: COLS - row.length }).map((_, i) => (
                      <div key={`empty-${i}`} className="flex-1 min-w-0" />
                    ))}
                </div>

              </div>
            )
          })}
        </div>

        <button
          onClick={addSpread}
          className="self-start font-sans text-xs text-ink-500/50 hover:text-ochre-600 border border-dashed border-cream-300 hover:border-ochre-400 hover:bg-ochre-500/5 px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
        >
          <span className="text-base leading-none">+</span>
          Add spread
        </button>

      </div>

      {readModeOpen && (
        <ReadMode
          spreads={spreads}
          startIndex={0}
          onClose={() => setReadModeOpen(false)}
        />
      )}

      {/* Undo toast */}
      {undoState && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col rounded-2xl overflow-hidden shadow-xl border border-cream-300 bg-ink-800 min-w-[280px]">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="font-sans text-sm text-white/80 flex-1">
              Spread {undoState.spread.pageLabel} removed
            </span>
            <button
              onClick={handleUndo}
              className="font-sans text-sm font-semibold text-ochre-400 hover:text-ochre-300 transition-colors shrink-0"
            >
              Undo
            </button>
            <button
              onClick={clearUndo}
              className="font-sans text-xs text-white/30 hover:text-white/60 transition-colors shrink-0"
            >
              ×
            </button>
          </div>
          <div className="h-0.5 bg-white/10">
            <div
              className="h-full bg-ochre-400 transition-all duration-100 ease-linear"
              style={{ width: `${undoProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Story Arc accordion ───────────────────────────────────────────

function StoryArc({
  spreads,
  onUpdateBeat,
}: {
  spreads: StorySpread[]
  onUpdateBeat: (id: string, beat: string) => void
}) {
  const [open, setOpen] = useState(false)
  const filledCount = spreads.filter((s) => s.plotBeat?.trim()).length

  return (
    <div className="bg-cream-200 rounded-2xl border border-cream-300 shadow-soft overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-cream-300/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-ochre-500 text-sm">✦</span>
          <span className="font-serif text-sm text-ink-700">Story Arc</span>
          {filledCount > 0 && (
            <span className="font-sans text-xs text-ink-500/50">
              {filledCount} / {spreads.length} beats
            </span>
          )}
        </div>
        <span className={`text-ink-500/40 text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {open && (
        <div className="border-t border-cream-300 px-5 py-3 flex flex-col gap-1">
          {spreads.map((spread) => (
            <div key={spread.id} className="flex items-center gap-3 py-1">
              <span className="font-sans text-[10px] text-ink-500/40 w-16 shrink-0 text-right leading-none">
                {spread.pageLabel}
              </span>
              <input
                type="text"
                value={spread.plotBeat ?? ''}
                onChange={(e) => onUpdateBeat(spread.id, e.target.value)}
                placeholder="What happens here…"
                className={[
                  'flex-1 font-sans text-xs bg-transparent border-b border-cream-300 focus:border-ochre-400 focus:outline-none py-0.5 transition-colors placeholder:text-ink-500/20',
                  spread.plotBeat?.trim() ? 'text-ink-700' : 'text-ink-500/40',
                ].join(' ')}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Insert slot between cards (vertical) ─────────────────────────

function InsertSlot({ onInsert }: { onInsert: () => void }) {
  return (
    <div className="group/slot flex items-center justify-center w-6 shrink-0 relative">
      <button
        onClick={onInsert}
        title="Insert spread here"
        className="opacity-0 group-hover/slot:opacity-100 transition-all duration-150 w-5 h-5 rounded-full bg-ochre-500 text-white text-sm font-sans flex items-center justify-center hover:bg-ochre-600 hover:scale-110 shadow-sm z-10"
      >
        +
      </button>
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-ochre-400/0 group-hover/slot:bg-ochre-400/30 transition-colors" />
    </div>
  )
}

// ── Insert row above first row ────────────────────────────────────

function InsertRow({ onInsert, label }: { onInsert: () => void; label: string }) {
  return (
    <div className="group/row flex items-center gap-2 h-5">
      <div className="flex-1 h-px bg-ochre-400/0 group-hover/row:bg-ochre-400/30 transition-colors" />
      <button
        onClick={onInsert}
        title={label}
        className="opacity-0 group-hover/row:opacity-100 transition-all duration-150 font-sans text-[10px] text-ochre-600 hover:text-ochre-700 bg-ochre-500/10 hover:bg-ochre-500/20 border border-ochre-400/40 px-2 py-0.5 rounded-full shrink-0"
      >
        + Insert here
      </button>
      <div className="flex-1 h-px bg-ochre-400/0 group-hover/row:bg-ochre-400/30 transition-colors" />
    </div>
  )
}
