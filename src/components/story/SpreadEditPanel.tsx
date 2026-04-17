import { useEffect, useRef, useState } from 'react'
import { useProjectStore, useAppStore, useActiveProject } from '@/store'
import { useInspectorStore } from '@/store'
import { useImageUpload } from '@/hooks/useImageUpload'
import { sendSpreadMessage, probeSpread } from '@/lib/storyAssistant'
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

// ─── Quick actions for the chat ──────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'Brainstorm',  prompt: 'Help me brainstorm what could happen in this spread. What moments would serve the story here?' },
  { label: 'Write text',  prompt: 'Write manuscript text for this spread based on the context and art notes.' },
  { label: 'Art notes',   prompt: 'Suggest detailed art direction for this spread — characters, scene, mood, composition.' },
  { label: 'Feedback',    prompt: "Give me honest feedback on this spread. What's working? What could be stronger?" },
  { label: 'Lock this down', prompt: "Help me finalise this spread. Review everything — story beat, manuscript text, art notes — and tell me: is this spread ready to lock? What, if anything, still needs to be resolved before I move on?" },
  { label: 'Ask me something', prompt: 'Ask me a thought-provoking question about this spread to help me think deeper.' },
]

// ─── Main SpreadEditPanel ─────────────────────────────────────────

interface SpreadEditPanelProps {
  spread: StorySpread
  onBack?: () => void
  onPrev?: () => void
  onNext?: () => void
}

export function SpreadEditPanel({ spread, onBack, onPrev, onNext }: SpreadEditPanelProps) {
  const { updateSpread, updateArtNotes, toggleSpreadLock, addSketch, removeSketch, renameSketch, addAiMessage, clearAiMessages } =
    useProjectStore()

  const sketches = spread.sketches ?? []
  const manuscriptRef = useRef<HTMLTextAreaElement>(null)

  // Active sketch version (index into sketches array)
  const [activeSketchIdx, setActiveSketchIdx] = useState(() => Math.max(0, sketches.length - 1))

  // Lightbox
  const [expandedSketchIdx, setExpandedSketchIdx] = useState<number | null>(null)

  // AI chat state
  const [chatInput, setChatInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [probing, setProbing] = useState(false)
  const messagesRef = useRef<HTMLDivElement>(null)

  // MJ prompt copy + local draft (editable override)
  const [mjCopied, setMjCopied] = useState(false)
  const [promptDraft, setPromptDraft] = useState<string | null>(null)

  const project = useActiveProject()
  const apiKey = useAppStore((s) => s.settings.claudeApiKey)
  const openSettings = useAppStore((s) => s.openSettings)
  const colorSwatches = useInspectorStore((s) => s.colorSwatches)
  const moodKeywords = useInspectorStore((s) => s.moodKeywords)
  const illustrationStyle = useInspectorStore((s) => s.illustrationStyle)
  const selectedSwatches = colorSwatches.filter((sw) => sw.selected)
  const selectedMoods = moodKeywords.filter((kw) => kw.selected)

  // Reset local state when navigating to a different spread
  useEffect(() => {
    setExpandedSketchIdx(null)
    setActiveSketchIdx(Math.max(0, (spread.sketches ?? []).length - 1))
    setChatInput('')
    setError(null)
    setPromptDraft(null)
  }, [spread.id])

  // Auto-resize manuscript textarea
  useEffect(() => {
    const el = manuscriptRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [spread.manuscriptText])

  // Scroll chat to bottom when messages change
  useEffect(() => {
    const el = messagesRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [spread.aiMessages.length, loading, probing, error])

  // Proactive probe: when navigating to a spread with content but no conversation yet
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!apiKey) return
    if (spread.aiMessages.length > 0) return

    const hasContent =
      spread.manuscriptText.trim() ||
      spread.artNotes.characters.trim() ||
      spread.artNotes.scene.trim() ||
      spread.artNotes.designNotes.trim() ||
      spread.artNotes.keyWords.trim() ||
      (spread.sketches ?? []).length > 0

    if (!hasContent) return

    setProbing(true)
    const arcForProbe = (project?.storyFlow ?? [])
      .filter((s) => s.plotBeat?.trim())
      .map((s) => `${s.pageLabel}: ${s.plotBeat}`)
      .join('\n') || undefined
    probeSpread({
      apiKey,
      projectTitle: project?.title ?? '',
      roughIdeas: project?.roughIdeas ?? '',
      storyArc: arcForProbe,
      spreadNumber: spread.spreadNumber,
      pageLabel: spread.pageLabel,
      plotBeat: spread.plotBeat || undefined,
      manuscriptText: spread.manuscriptText,
      artNotes: spread.artNotes,
      hasSketches: (spread.sketches ?? []).length > 0,
    })
      .then((reply) => {
        addAiMessage(spread.id, { role: 'assistant', content: reply })
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      })
      .finally(() => setProbing(false))
  }, [spread.id]) // intentionally only runs on spread change

  const clampedIdx = Math.min(activeSketchIdx, Math.max(0, sketches.length - 1))
  const activeSk = sketches[clampedIdx] ?? null

  // ── Sketch upload ──────────────────────────────────────────────
  const { triggerUpload: triggerSketchUpload, inputProps: sketchInputProps } =
    useImageUpload((dataUrl) => {
      addSketch(spread.id, dataUrl)
      setActiveSketchIdx(sketches.length)
    })

  // ── Story arc + adjacent beats ────────────────────────────────
  const storyFlow = project?.storyFlow ?? []
  const spreadIdx = storyFlow.findIndex((s) => s.id === spread.id)
  const prevSpread = spreadIdx > 0 ? storyFlow[spreadIdx - 1] : null
  const nextSpread = spreadIdx < storyFlow.length - 1 ? storyFlow[spreadIdx + 1] : null

  const storyArc = storyFlow
    .filter((s) => s.plotBeat?.trim())
    .map((s) => `${s.pageLabel}: ${s.plotBeat}`)
    .join('\n') || undefined

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

  // ── AI send ───────────────────────────────────────────────────
  const send = async (message: string) => {
    if (!message.trim() || loading || probing) return
    if (!apiKey) { openSettings(); return }

    const historySnapshot = [...spread.aiMessages]
    setChatInput('')
    setError(null)
    addAiMessage(spread.id, { role: 'user', content: message })
    setLoading(true)

    try {
      const reply = await sendSpreadMessage({
        apiKey,
        projectTitle: project?.title ?? '',
        roughIdeas: project?.roughIdeas ?? '',
        storyArc,
        spreadNumber: spread.spreadNumber,
        pageLabel: spread.pageLabel,
        plotBeat: spread.plotBeat || undefined,
        manuscriptText: spread.manuscriptText,
        artNotes: spread.artNotes,
        history: historySnapshot,
        userMessage: message,
      })
      addAiMessage(spread.id, { role: 'assistant', content: reply })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
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

      {/* Body: 2-column */}
      <div className="flex-1 overflow-hidden flex min-h-0">

        {/* ── LEFT: Author's canvas ─────────────────────────── */}
        <div className="w-[44%] shrink-0 border-r border-cream-300 overflow-y-auto scrollbar-thin px-5 py-5 flex flex-col gap-5">
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

        {/* ── RIGHT: AI co-creator ──────────────────────────── */}
        <div className="flex-1 flex flex-col h-full min-w-0">

          {/* Chat header */}
          <div className="shrink-0 px-5 py-3 border-b border-cream-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-moss-500">✦</span>
              <span className="font-sans text-xs font-medium text-ink-500">AI Co-creator</span>
              {spread.aiMessages.length > 0 && (
                <span className="text-[10px] font-sans bg-moss-500/15 text-moss-600 px-1.5 py-0.5 rounded-full">
                  {spread.aiMessages.length}
                </span>
              )}
            </div>
            {spread.aiMessages.length > 0 && (
              <button
                onClick={() => clearAiMessages(spread.id)}
                className="font-sans text-[10px] text-ink-500/30 hover:text-red-500 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Messages */}
          <div ref={messagesRef} className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 flex flex-col gap-3">

            {!apiKey && (
              <p className="text-xs font-sans text-ink-500/60 bg-cream-300/50 rounded-xl px-3 py-2">
                <button onClick={openSettings} className="text-ochre-500 underline hover:text-ochre-600">
                  Add your Claude API key
                </button>{' '}
                in Settings to enable the AI co-creator.
              </p>
            )}

            {spread.aiMessages.length === 0 && !probing && (
              <p className="font-sans text-xs text-ink-500/30 text-center py-6 leading-relaxed">
                {apiKey
                  ? 'Add manuscript text or art notes and I\'ll join in with a question.'
                  : 'Add your API key to get started.'}
              </p>
            )}

            {spread.aiMessages.map((msg) => (
              <div
                key={msg.id}
                className={[
                  'rounded-xl px-3 py-2.5 font-sans text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-ochre-500/10 text-ink-700 ml-8'
                    : 'bg-cream-100 border border-cream-300 text-ink-600 mr-8 whitespace-pre-wrap',
                ].join(' ')}
              >
                {msg.content}
              </div>
            ))}

            {(loading || probing) && (
              <div className="bg-cream-100 border border-cream-300 rounded-xl px-3 py-2.5 mr-8">
                <span className="inline-flex gap-1 items-center text-ink-500/50 text-xs font-sans">
                  <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
                  <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
                  <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            )}

            {error && (
              <p className="text-xs font-sans text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
            )}
          </div>

          {/* Quick actions */}
          <div className="shrink-0 border-t border-cream-300 px-4 pt-2.5 pb-2 flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => send(action.prompt)}
                disabled={loading || probing || !apiKey}
                className="text-xs font-sans px-2.5 py-1 rounded-full bg-cream-100 border border-cream-300 text-ink-500 hover:bg-ochre-500/10 hover:border-ochre-400 hover:text-ochre-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Input row */}
          <div className="shrink-0 px-4 pb-4 pt-2 flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(chatInput) } }}
              placeholder="Ask anything about this spread…"
              disabled={loading || probing || !apiKey}
              className="flex-1 font-sans text-sm bg-cream-50 border border-cream-300 rounded-xl px-3 py-2 text-ink-700 placeholder:text-ink-500/30 focus:outline-none focus:ring-2 focus:ring-ochre-400/50 focus:border-ochre-400 disabled:opacity-50 transition-colors"
            />
            <button
              onClick={() => send(chatInput)}
              disabled={!chatInput.trim() || loading || probing || !apiKey}
              className="px-4 py-2 bg-ochre-500 text-white text-sm font-sans rounded-xl hover:bg-ochre-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              →
            </button>
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
