import { useEffect, useRef, useState } from 'react'
import { useProjectStore, useActiveProject } from '@/store'
import { useInspectorStore } from '@/store'
import { useImageUpload } from '@/hooks/useImageUpload'
import { buildScenePrompt } from '@/lib/promptBuilder'
import type { SpreadSketch, StorySpread } from '@/types'

// ─── Inline label editor ─────────────────────────────────────────

function SketchLabelEditor({
  label,
  onRename,
}: {
  label: string | undefined
  onRename: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(label ?? '')
  const commit = () => { onRename(draft.trim()); setEditing(false) }
  if (editing) {
    return (
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
        autoFocus
        placeholder="add label…"
        className="font-sans text-[10px] text-ink-500/70 bg-transparent border-b border-ochre-400 focus:outline-none min-w-0 w-28"
      />
    )
  }
  return (
    <button
      onClick={() => setEditing(true)}
      className="font-sans text-[10px] text-ink-500/40 hover:text-ink-500/70 transition-colors italic"
    >
      {label || 'add label…'}
    </button>
  )
}

// ─── Lightbox ────────────────────────────────────────────────────

function SketchLightbox({
  sketches,
  initialIdx,
  onClose,
}: {
  sketches: SpreadSketch[]
  initialIdx: number
  onClose: () => void
}) {
  const [idx, setIdx] = useState(initialIdx)
  const sk = sketches[idx]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(sketches.length - 1, i + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, sketches.length])

  return (
    <div
      className="fixed inset-0 z-50 bg-ink-900/90 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center max-w-4xl max-h-full p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={sk.imageDataUrl}
          alt=""
          className="max-h-[78vh] max-w-full rounded-xl shadow-2xl object-contain"
        />
        <div className="mt-3 flex items-center gap-3">
          <span className="font-mono text-xs text-white/50">v{idx + 1} of {sketches.length}</span>
          {sk.label && (
            <span className="font-sans text-xs text-white/50 italic">{sk.label}</span>
          )}
        </div>
        {sketches.length > 1 && (
          <>
            <button
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="absolute left-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-20 flex items-center justify-center transition-colors"
            >
              ←
            </button>
            <button
              onClick={() => setIdx((i) => Math.min(sketches.length - 1, i + 1))}
              disabled={idx === sketches.length - 1}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-20 flex items-center justify-center transition-colors"
            >
              →
            </button>
          </>
        )}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-colors text-sm"
        >
          ×
        </button>
      </div>
    </div>
  )
}

// ─── Main SpreadEditPanel ─────────────────────────────────────────

interface SpreadEditPanelProps {
  spread: StorySpread
  onBack?: () => void
  onPrev?: () => void
  onNext?: () => void
}

export function SpreadEditPanel({ spread, onBack, onPrev, onNext }: SpreadEditPanelProps) {
  const { updateSpread, updateArtNotes, toggleSpreadLock, addSketch, removeSketch, renameSketch } =
    useProjectStore()

  const sketches = spread.sketches ?? []
  const manuscriptRef = useRef<HTMLTextAreaElement>(null)

  // Active sketch version (index into sketches array)
  const [activeSketchIdx, setActiveSketchIdx] = useState(() => Math.max(0, sketches.length - 1))

  // Lightbox
  const [expandedSketchIdx, setExpandedSketchIdx] = useState<number | null>(null)

  // MJ prompt copy + local draft (editable override)
  const [mjCopied, setMjCopied] = useState(false)
  const [promptDraft, setPromptDraft] = useState<string | null>(null)

  const project = useActiveProject()
  const colorSwatches = useInspectorStore((s) => s.colorSwatches)
  const moodKeywords = useInspectorStore((s) => s.moodKeywords)
  const illustrationStyle = useInspectorStore((s) => s.illustrationStyle)
  const selectedSwatches = colorSwatches.filter((sw) => sw.selected)
  const selectedMoods = moodKeywords.filter((kw) => kw.selected)

  // Reset local state when navigating to a different spread
  useEffect(() => {
    setExpandedSketchIdx(null)
    setActiveSketchIdx(Math.max(0, (spread.sketches ?? []).length - 1))
    setPromptDraft(null)
  }, [spread.id])

  // Auto-resize manuscript textarea
  useEffect(() => {
    const el = manuscriptRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [spread.manuscriptText])

  const clampedIdx = Math.min(activeSketchIdx, Math.max(0, sketches.length - 1))
  const activeSk = sketches[clampedIdx] ?? null

  // ── Sketch upload ──────────────────────────────────────────────
  const { triggerUpload: triggerSketchUpload, inputProps: sketchInputProps } =
    useImageUpload((dataUrl) => {
      addSketch(spread.id, dataUrl)
      setActiveSketchIdx(sketches.length)
    })

  // ── Adjacent beats ────────────────────────────────────────────
  const storyFlow = project?.storyFlow ?? []
  const spreadIdx = storyFlow.findIndex((s) => s.id === spread.id)
  const prevSpread = spreadIdx > 0 ? storyFlow[spreadIdx - 1] : null
  const nextSpread = spreadIdx < storyFlow.length - 1 ? storyFlow[spreadIdx + 1] : null

  // ── MJ Prompt ─────────────────────────────────────────────────
  const mjPrompt = buildScenePrompt({
    sceneDescription: spread.artNotes.scene,
    charactersInScene: spread.artNotes.characters,
    designNotes: spread.artNotes.designNotes,
    selectedSwatches,
    selectedMoods,
    illustrationStyle,
  })

  const displayedPrompt = promptDraft ?? mjPrompt

  const copyMjPrompt = () => {
    navigator.clipboard.writeText(displayedPrompt)
    setMjCopied(true)
    setTimeout(() => setMjCopied(false), 2000)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-cream-100">

      {/* Header */}
      <div className="shrink-0 px-4 py-2.5 border-b border-cream-300 bg-cream-100/95 backdrop-blur-sm flex items-center gap-2">
        {onBack && (
          <button
            onClick={onBack}
            className="font-sans text-xs text-ink-500/50 hover:text-ink-700 transition-colors flex items-center gap-1 pr-2 border-r border-cream-300 mr-1"
          >
            ← Storyboard
          </button>
        )}
        <span className="font-sans text-xs font-semibold text-ochre-600 bg-ochre-500/10 px-2 py-0.5 rounded-full">
          {spread.pageLabel}
        </span>
        {spread.spreadNumber === 1 && (
          <span className="font-sans text-[10px] text-ink-500/40">Cover spread</span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {onPrev && (
            <button onClick={onPrev} title="Previous spread" className="w-6 h-6 flex items-center justify-center rounded-lg text-ink-500/40 hover:bg-cream-200 hover:text-ink-700 transition-colors text-xs">←</button>
          )}
          {onNext && (
            <button onClick={onNext} title="Next spread" className="w-6 h-6 flex items-center justify-center rounded-lg text-ink-500/40 hover:bg-cream-200 hover:text-ink-700 transition-colors text-xs">→</button>
          )}
          <button
            onClick={() => toggleSpreadLock(spread.id)}
            className={[
              'font-sans text-[10px] px-2.5 py-1 rounded-full transition-colors ml-1',
              spread.locked ? 'bg-moss-500 text-white' : 'border border-cream-300 text-ink-500/40 hover:border-moss-400 hover:text-moss-600',
            ].join(' ')}
          >
            {spread.locked ? '✓ Locked' : '○ Lock'}
          </button>
        </div>
      </div>

      {/* Body: author's canvas (full-width) */}
      <div className="flex-1 overflow-hidden flex min-h-0 justify-center">
        <div className="w-full max-w-3xl overflow-y-auto scrollbar-thin px-6 py-6 flex flex-col gap-5">
          <input {...sketchInputProps} />

          {/* Story beat */}
          <div className="flex flex-col gap-1.5">
            <span className="font-sans text-[10px] font-medium text-ink-500/50 uppercase tracking-wide">Story Beat</span>
            <input
              type="text"
              value={spread.plotBeat ?? ''}
              onChange={(e) => updateSpread(spread.id, { plotBeat: e.target.value })}
              placeholder="What happens in this spread? (one sentence)"
              className="w-full font-sans text-sm bg-cream-50 border border-cream-300 rounded-xl px-3 py-2 text-ink-700 placeholder:text-ink-500/25 focus:outline-none focus:ring-2 focus:ring-ochre-400/50 focus:border-ochre-400 transition-colors"
            />
            {(prevSpread?.plotBeat?.trim() || nextSpread?.plotBeat?.trim()) && (
              <div className="flex justify-between gap-2 px-0.5">
                {prevSpread?.plotBeat?.trim() ? (
                  <p className="font-sans text-[10px] text-ink-500/35 leading-snug flex-1 truncate">
                    ← {prevSpread.pageLabel}: {prevSpread.plotBeat}
                  </p>
                ) : <div className="flex-1" />}
                {nextSpread?.plotBeat?.trim() && (
                  <p className="font-sans text-[10px] text-ink-500/35 leading-snug flex-1 truncate text-right">
                    {nextSpread.pageLabel}: {nextSpread.plotBeat} →
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Sketch */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-sans text-[10px] font-medium text-ink-500/50 uppercase tracking-wide">Sketch</span>
              <button
                onClick={triggerSketchUpload}
                className="font-sans text-[10px] text-ochre-600 hover:text-ochre-700 transition-colors"
              >
                {sketches.length === 0 ? '↑ Upload' : '+ Add version'}
              </button>
            </div>

            {sketches.length === 0 ? (
              <button
                onClick={triggerSketchUpload}
                className="w-full h-28 rounded-xl border-2 border-dashed border-cream-300 hover:border-ochre-400 hover:bg-cream-200/50 transition-colors flex flex-col items-center justify-center gap-2 text-ink-500/30 hover:text-ochre-500"
              >
                <span className="text-2xl leading-none">↑</span>
                <span className="font-sans text-xs">Upload a sketch</span>
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                {/* Large active sketch */}
                <button
                  onClick={() => setExpandedSketchIdx(clampedIdx)}
                  className="w-full block group relative"
                >
                  <div className="w-full h-44 rounded-xl overflow-hidden border border-cream-300 bg-cream-50">
                    <img
                      src={activeSk!.imageDataUrl}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-ink-900/0 group-hover:bg-ink-900/10 transition-colors">
                    <span className="font-sans text-xs text-white/0 group-hover:text-white/70 bg-ink-900/0 group-hover:bg-ink-900/40 px-3 py-1 rounded-full transition-all">
                      expand
                    </span>
                  </div>
                </button>

                {/* Active sketch info row */}
                <div className="flex items-center gap-2 px-0.5">
                  <span className="font-mono text-[9px] bg-ink-700/10 text-ink-500/70 px-1.5 py-0.5 rounded shrink-0">
                    v{clampedIdx + 1}
                  </span>
                  <SketchLabelEditor
                    label={activeSk!.label}
                    onRename={(label) => renameSketch(spread.id, activeSk!.id, label)}
                  />
                  <button
                    onClick={() => {
                      removeSketch(spread.id, activeSk!.id)
                      setActiveSketchIdx(Math.max(0, clampedIdx - 1))
                    }}
                    className="ml-auto font-sans text-[10px] px-2 py-0.5 rounded-full text-red-400 hover:text-white hover:bg-red-500 border border-red-200 hover:border-red-500 transition-colors"
                    title="Remove this version"
                  >
                    Remove
                  </button>
                </div>

                {/* Version thumbnail strip */}
                {sketches.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
                    {sketches.map((sk, i) => (
                      <div key={sk.id} className="shrink-0 group/thumb relative flex flex-col items-center gap-1">
                        <button
                          onClick={() => setActiveSketchIdx(i)}
                          className={[
                            'w-14 aspect-[4/3] rounded-lg overflow-hidden border-2 transition-colors',
                            i === clampedIdx
                              ? 'border-ochre-400 shadow-sm'
                              : 'border-cream-300 hover:border-cream-400',
                          ].join(' ')}
                        >
                          <img src={sk.imageDataUrl} alt="" className="w-full h-full object-cover" />
                        </button>
                        <button
                          onClick={() => {
                            removeSketch(spread.id, sk.id)
                            setActiveSketchIdx(Math.max(0, i === clampedIdx ? clampedIdx - 1 : clampedIdx))
                          }}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-ink-900/50 text-white text-[9px] opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-500"
                          title="Remove this version"
                        >
                          ×
                        </button>
                        <span className="font-mono text-[7px] text-ink-500/40 leading-none">v{i + 1}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Manuscript */}
          <div className="flex flex-col gap-1.5">
            <span className="font-sans text-[10px] font-medium text-ink-500/50 uppercase tracking-wide">Manuscript</span>
            <textarea
              ref={manuscriptRef}
              value={spread.manuscriptText}
              onChange={(e) => {
                updateSpread(spread.id, { manuscriptText: e.target.value })
                e.target.style.height = 'auto'
                e.target.style.height = e.target.scrollHeight + 'px'
              }}
              placeholder="Write the words for this spread…"
              rows={2}
              className="w-full resize-none rounded-xl bg-cream-50 border border-cream-300 px-4 py-3 font-serif text-base text-ink-700 placeholder:text-ink-500/25 focus:outline-none focus:ring-2 focus:ring-ochre-400/50 focus:border-ochre-400 transition-colors leading-relaxed overflow-hidden"
              style={{ minHeight: '3.5rem' }}
            />
          </div>

          {/* Art Notes */}
          <div className="flex flex-col gap-3">
            <span className="font-sans text-[10px] font-medium text-ink-500/50 uppercase tracking-wide">Art Notes</span>
            <div className="flex flex-col gap-3">
              <LabeledField
                label="Characters"
                value={spread.artNotes.characters}
                onChange={(v) => updateArtNotes(spread.id, { characters: v })}
                placeholder="Who appears in this spread? What are they doing?"
              />
              <LabeledField
                label="Scene"
                value={spread.artNotes.scene}
                onChange={(v) => updateArtNotes(spread.id, { scene: v })}
                placeholder="Setting, time of day, atmosphere…"
              />
              <LabeledField
                label="Design"
                value={spread.artNotes.designNotes}
                onChange={(v) => updateArtNotes(spread.id, { designNotes: v })}
                placeholder="Colors, mood, composition, lighting…"
              />
            </div>
          </div>

          {/* Picture Inspiration — editable MJ prompt */}
          <div className="border border-cream-300 rounded-xl px-4 py-3 flex flex-col gap-2 bg-cream-50/60">
            <div className="flex items-center justify-between">
              <span className="font-sans text-[10px] font-medium text-ink-500/40 uppercase tracking-wide">Picture Inspiration</span>
              <div className="flex items-center gap-2">
                {promptDraft !== null && (
                  <button
                    onClick={() => setPromptDraft(null)}
                    title="Reset to generated prompt"
                    className="font-sans text-[10px] text-ink-500/40 hover:text-ink-600 transition-colors"
                  >
                    ↺ Reset
                  </button>
                )}
                <button
                  onClick={copyMjPrompt}
                  className={[
                    'font-sans text-[10px] px-2.5 py-1 rounded-full border transition-colors',
                    mjCopied
                      ? 'bg-moss-500 text-white border-moss-500'
                      : 'text-ink-500/50 border-cream-300 hover:bg-ochre-500/10 hover:border-ochre-400 hover:text-ochre-600',
                  ].join(' ')}
                >
                  {mjCopied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <textarea
              value={displayedPrompt}
              onChange={(e) => setPromptDraft(e.target.value)}
              placeholder="Fill in art notes to generate a prompt…"
              rows={4}
              className="w-full resize-none rounded-lg bg-transparent font-mono text-[10px] text-ink-500/70 leading-relaxed placeholder:text-ink-500/30 focus:outline-none focus:text-ink-700 transition-colors overflow-y-auto scrollbar-thin"
            />
          </div>
        </div>

      </div>

      {/* Lightbox */}
      {expandedSketchIdx !== null && sketches.length > 0 && (
        <SketchLightbox
          sketches={sketches}
          initialIdx={Math.min(expandedSketchIdx, sketches.length - 1)}
          onClose={() => setExpandedSketchIdx(null)}
        />
      )}
    </div>
  )
}

// ─── Simple labeled textarea ──────────────────────────────────────

function LabeledField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-sans text-[10px] text-ink-500/40">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full resize-none rounded-lg bg-cream-50 border border-cream-300 px-3 py-2 font-sans text-sm text-ink-700 placeholder:text-ink-500/25 focus:outline-none focus:ring-2 focus:ring-ochre-400/50 focus:border-ochre-400 transition-colors leading-relaxed"
      />
    </div>
  )
}
