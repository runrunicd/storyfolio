import { useEffect, useRef, useState } from 'react'
import { useActiveProject, useAppStore, useInspectorStore, useProjectStore } from '@/store'
import { buildScenePrompt } from '@/lib/promptBuilder'
import { sendVisionMessage } from '@/lib/colorAssistant'
import type { InspirationAnalysis } from '@/lib/colorAssistant'
import { useImageUpload } from '@/hooks/useImageUpload'
import { ILLUSTRATION_STYLE_LABELS } from '@/lib/constants'
import type { IllustrationStyle, StorySpread } from '@/types'
import { v4 as uuidv4 } from 'uuid'

// ─── Color chip renderer ─────────────────────────────────────────

/** Renders a message string with inline color chips for any #RRGGBB patterns found. */
function ColorMessage({ text }: { text: string }) {
  const parts = text.split(/(#[0-9A-Fa-f]{6})/g)
  return (
    <span>
      {parts.map((part, i) =>
        /^#[0-9A-Fa-f]{6}$/.test(part) ? (
          <span key={i} className="inline-flex items-center gap-0.5 mx-0.5 align-middle">
            <span
              className="inline-block w-3 h-3 rounded-sm border border-black/10 shrink-0"
              style={{ backgroundColor: part }}
            />
            <span className="font-mono text-[10px]">{part}</span>
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  )
}

// ─── Saved design card ───────────────────────────────────────────

interface DesignCardProps {
  id: string
  title: string
  imageDataUrl: string
  onDelete: () => void
  onRename: (title: string) => void
}

function DesignCard({ title, imageDataUrl, onDelete, onRename }: DesignCardProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)

  const commit = () => {
    onRename(draft.trim() || title)
    setEditing(false)
  }

  return (
    <div className="group relative rounded-xl overflow-hidden border border-cream-300 bg-cream-50">
      <img src={imageDataUrl} alt={title} className="w-full aspect-[4/3] object-cover" />
      <div className="px-2 py-1.5 flex items-center gap-1">
        {editing ? (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') commit() }}
            autoFocus
            className="flex-1 font-sans text-[10px] text-ink-700 bg-transparent border-b border-ochre-400 focus:outline-none"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex-1 text-left font-sans text-[10px] text-ink-500/70 hover:text-ink-700 truncate transition-colors"
          >
            {title}
          </button>
        )}
      </div>
      <button
        onClick={onDelete}
        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-ink-900/50 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
      >
        ×
      </button>
    </div>
  )
}

// ─── Inline name editor for character refs ───────────────────────

function RefNameEditor({ name, onRename }: { name: string; onRename: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const commit = () => { onRename(draft.trim() || name); setEditing(false) }
  if (editing) {
    return (
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit() }}
        onClick={(e) => e.stopPropagation()}
        autoFocus
        className="w-full font-sans text-[10px] font-medium text-ink-700 bg-transparent border-b border-ochre-400 focus:outline-none"
      />
    )
  }
  return (
    <button
      onClick={(e) => { e.stopPropagation(); setEditing(true) }}
      className="text-left font-sans text-[10px] font-medium text-ink-700 hover:text-ochre-600 truncate w-full transition-colors leading-tight"
    >
      {name}
    </button>
  )
}

// ─── Main DrawView ────────────────────────────────────────────────

const VISION_QUICK_ACTIONS = [
  "What palette fits this scene's mood?",
  'How should light and shadow fall here?',
  "Suggest colors for the characters' emotional state",
  'Something warm and golden',
  'Something cool and misty',
  'Muted and earthy',
]

export function DrawView() {
  const project = useActiveProject()
  const { addDrawing, updateDrawing, deleteDrawing, addCharacterRef, updateCharacterRef, deleteCharacterRef } = useProjectStore()
  const apiKey = useAppStore((s) => s.settings.claudeApiKey)
  const openSettings = useAppStore((s) => s.openSettings)
  const {
    colorSwatches, moodKeywords, illustrationStyle,
    toggleSwatch, toggleMoodKeyword, setIllustrationStyle,
    setSwatches, selectMoodsByLabel,
  } = useInspectorStore()

  const [activeSpreadId, setActiveSpreadId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [promptDraft, setPromptDraft] = useState<string | null>(null)
  const [selectedRefIds, setSelectedRefIds] = useState<Set<string>>(new Set())
  const [addingRef, setAddingRef] = useState(false)
  const [refDraft, setRefDraft] = useState({ name: '', mjParams: '', imageDataUrl: null as string | null })
  const [visionMessages, setVisionMessages] = useState<Array<{
    id: string; role: 'user' | 'assistant'; text: string
    imageDataUrl?: string; suggestions?: InspirationAnalysis | null
  }>>([])
  const [visionInput, setVisionInput] = useState('')
  const [visionAttachment, setVisionAttachment] = useState<string | null>(null)
  const [visionLoading, setVisionLoading] = useState(false)
  const [visionError, setVisionError] = useState<string | null>(null)
  const [latestSuggestions, setLatestSuggestions] = useState<InspirationAnalysis | null>(null)
  const visionBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setPromptDraft(null)
    setSelectedRefIds(new Set())
    setVisionMessages([])
    setLatestSuggestions(null)
    setVisionInput('')
    setVisionAttachment(null)
  }, [activeSpreadId])

  if (!project) return null

  const spreads = project.storyFlow
  const activeSpread: StorySpread =
    spreads.find((s) => s.id === activeSpreadId) ?? spreads[0]

  // ── Prompt ──────────────────────────────────────────────────────
  const selectedSwatches = colorSwatches.filter((sw) => sw.selected)
  const selectedMoods = moodKeywords.filter((kw) => kw.selected)

  const selectedRefs = (project.characterRefs ?? []).filter((r) => selectedRefIds.has(r.id))
  const hasRefs = selectedRefs.length > 0

  const mjPrompt = buildScenePrompt(
    {
      sceneDescription: activeSpread?.artNotes.scene ?? '',
      charactersInScene: activeSpread?.artNotes.characters ?? '',
      designNotes: activeSpread?.artNotes.designNotes ?? '',
      selectedSwatches,
      selectedMoods,
      illustrationStyle,
    },
    { omitDefaultFlags: hasRefs }
  ) + (hasRefs ? ' ' + selectedRefs.map((r) => r.mjParams).join(' ') : '')

  const displayedPrompt = promptDraft ?? mjPrompt

  const copyPrompt = () => {
    navigator.clipboard.writeText(displayedPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Spread context (passed to Vision) ──────────────────────────
  const spreadContext = activeSpread
    ? [
        activeSpread.pageLabel && `Spread: ${activeSpread.pageLabel}`,
        activeSpread.manuscriptText && `Text: ${activeSpread.manuscriptText}`,
        activeSpread.artNotes.characters && `Characters: ${activeSpread.artNotes.characters}`,
        activeSpread.artNotes.scene && `Scene: ${activeSpread.artNotes.scene}`,
        activeSpread.artNotes.designNotes && `Design notes: ${activeSpread.artNotes.designNotes}`,
      ]
        .filter(Boolean)
        .join('\n')
    : ''

  // ── Vision chat ──────────────────────────────────────────────
  const sendVision = async (overrideText?: string, overrideImage?: string) => {
    const textToSend = overrideText ?? visionInput.trim()
    const imageToSend = overrideImage ?? visionAttachment ?? undefined
    if (!textToSend && !imageToSend) return
    if (!apiKey) { openSettings(); return }

    const userMsg = {
      id: uuidv4(), role: 'user' as const,
      text: textToSend || '(image attached)',
      imageDataUrl: imageToSend,
    }
    setVisionMessages((prev) => [...prev, userMsg])
    setVisionInput('')
    setVisionAttachment(null)
    setVisionLoading(true)
    setVisionError(null)
    setTimeout(() => visionBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

    try {
      const history = visionMessages.map((m) => ({
        role: m.role, text: m.text, imageDataUrl: m.imageDataUrl,
      }))
      const response = await sendVisionMessage({
        apiKey,
        history,
        userText: userMsg.text,
        userImageDataUrl: userMsg.imageDataUrl,
        spreadContext,
      })
      const assistantMsg = {
        id: uuidv4(), role: 'assistant' as const,
        text: response.text,
        suggestions: response.suggestions,
      }
      setVisionMessages((prev) => [...prev, assistantMsg])
      if (response.suggestions) setLatestSuggestions(response.suggestions)
    } catch (err) {
      setVisionError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setVisionLoading(false)
      setTimeout(() => visionBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  // ── Color region mapping from sketch ───────────────────────────
  const sendSketchColorMapping = () => {
    if (!visionAttachment) return
    const paletteList = selectedSwatches.length > 0
      ? selectedSwatches.map((sw) => `${sw.name} (${sw.hex})`).join(', ')
      : 'no palette selected yet'
    const text = `Here's my sketch of this spread. Based on the current palette — ${paletteList} — please suggest which color goes where. Name specific regions: sky, ground, foreground, character clothing, background elements, etc.`
    sendVision(text, visionAttachment)
  }

  // ── Apply from Vision ───────────────────────────────────────────
  const applyVisionColors = () => {
    if (!latestSuggestions) return
    setSwatches(latestSuggestions.colors)
    setPromptDraft(null)
  }
  const applyVisionMoods = () => {
    if (!latestSuggestions) return
    selectMoodsByLabel(latestSuggestions.moods)
    setPromptDraft(null)
  }
  const applyVisionStyle = () => {
    if (!latestSuggestions) return
    setIllustrationStyle(latestSuggestions.style as Parameters<typeof setIllustrationStyle>[0])
    setPromptDraft(null)
  }

  // ── Image uploads ──────────────────────────────────────────────
  const { triggerUpload, inputProps } = useImageUpload((dataUrl) => {
    addDrawing(dataUrl, `Design ${project.drawings.length + 1}`)
  })
  const { triggerUpload: triggerRefImage, inputProps: refImageInputProps } =
    useImageUpload((dataUrl) => setRefDraft((d) => ({ ...d, imageDataUrl: dataUrl })))
  const { triggerUpload: triggerVisionAttach, inputProps: visionAttachInputProps } =
    useImageUpload((dataUrl) => setVisionAttachment(dataUrl))

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden bg-cream-100">

      {/* Spread picker */}
      <div className="shrink-0 px-4 py-2 border-b border-cream-300 bg-cream-200/40 flex items-center gap-2 overflow-x-auto scrollbar-thin">
        <span className="font-sans text-[10px] text-ink-500/40 uppercase tracking-wide shrink-0 pr-2 border-r border-cream-300">
          Spread
        </span>
        {spreads.map((spread) => {
          const isActive = spread.id === (activeSpread?.id ?? null)
          return (
            <button
              key={spread.id}
              onClick={() => setActiveSpreadId(spread.id)}
              className={[
                'shrink-0 font-sans text-xs px-3 py-1 rounded-full transition-colors',
                isActive
                  ? 'bg-ochre-500 text-white'
                  : 'bg-cream-100 border border-cream-300 text-ink-500/70 hover:border-ochre-400 hover:text-ochre-600',
              ].join(' ')}
            >
              {spread.pageLabel}
            </button>
          )
        })}
      </div>

      {/* ── 2-column body ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── LEFT: Vision Chat (hero) ── */}
        <div className="flex-1 min-w-0 flex flex-col h-full border-r border-cream-300">

          {/* Context strip */}
          <div className="shrink-0 px-5 pt-3 pb-2.5 border-b border-cream-300 bg-cream-200/20">
            <p className="font-sans text-[9px] font-medium text-ink-500/40 uppercase tracking-wide mb-1">Vision Chat</p>
            <div className="flex items-baseline gap-1.5">
              <span className="font-sans text-[10px] font-medium text-ochre-600 shrink-0">
                {activeSpread?.pageLabel ?? '—'}
              </span>
              {activeSpread?.manuscriptText && (
                <span className="font-serif text-[10px] text-ink-500/60 italic truncate">
                  {activeSpread.manuscriptText.slice(0, 100)}{activeSpread.manuscriptText.length > 100 ? '…' : ''}
                </span>
              )}
            </div>
            {activeSpread?.artNotes.characters && (
              <p className="font-sans text-[10px] text-ink-500/50 truncate">
                {activeSpread.artNotes.characters}
              </p>
            )}
            {!activeSpread?.manuscriptText && !activeSpread?.artNotes.characters && (
              <p className="font-sans text-[10px] text-ink-500/30">
                Add content to this spread in Story first.
              </p>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5 flex flex-col gap-4">

            {visionMessages.length === 0 && (
              <div className="flex flex-col gap-5 items-center justify-center py-10 max-w-lg mx-auto w-full">
                <p className="font-sans text-sm text-ink-500/50 leading-relaxed text-center">
                  Describe your visual ideas, share a Midjourney screenshot, or ask about colour and mood for this spread.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {VISION_QUICK_ACTIONS.map((action) => (
                    <button
                      key={action}
                      onClick={() => sendVision(action)}
                      disabled={visionLoading || !apiKey}
                      className="font-sans text-sm px-4 py-2 rounded-full bg-cream-50 border border-cream-300 text-ink-500/70 hover:bg-ochre-500/10 hover:border-ochre-400 hover:text-ochre-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {action}
                    </button>
                  ))}
                </div>
                {!apiKey && (
                  <p className="font-sans text-sm text-ink-500/50">
                    <button onClick={openSettings} className="text-ochre-500 underline hover:text-ochre-600">Add your Claude API key</button> to start.
                  </p>
                )}
              </div>
            )}

            {visionMessages.map((msg) => (
              <div key={msg.id} className="flex flex-col gap-1 max-w-2xl w-full mx-auto">
                {msg.role === 'user' && (
                  <div className="ml-12 flex flex-col gap-1.5">
                    {msg.imageDataUrl && (
                      <img
                        src={msg.imageDataUrl}
                        alt=""
                        className="w-full max-h-56 object-contain rounded-2xl border border-cream-300 bg-cream-50"
                      />
                    )}
                    {msg.text !== '(image attached)' && (
                      <div className="bg-ochre-500/10 rounded-2xl px-4 py-2.5 font-sans text-sm text-ink-700 leading-relaxed">
                        {msg.text}
                      </div>
                    )}
                  </div>
                )}
                {msg.role === 'assistant' && (
                  <div className="mr-12 flex flex-col gap-2">
                    <div className="bg-white border border-cream-300 rounded-2xl px-4 py-3 font-sans text-sm text-ink-600 leading-relaxed whitespace-pre-wrap">
                      <ColorMessage text={msg.text} />
                    </div>
                    {msg.suggestions && (
                      <div className="bg-cream-50 border border-cream-300 rounded-xl p-2.5 flex flex-wrap gap-2 items-center">
                        {msg.suggestions.colors.map((c) => (
                          <div key={c.hex} className="flex items-center gap-0.5" title={`${c.name} ${c.hex}`}>
                            <span className="w-3.5 h-3.5 rounded border border-black/10 shrink-0" style={{ backgroundColor: c.hex }} />
                            <span className="font-mono text-[9px] text-ink-500/60">{c.hex}</span>
                          </div>
                        ))}
                        <span className="text-ink-500/30 text-[10px]">·</span>
                        {msg.suggestions.moods.map((m) => (
                          <span key={m} className="font-sans text-[9px] px-1.5 py-0.5 rounded-full bg-cream-200 text-ink-500/60">{m}</span>
                        ))}
                        <span className="font-sans text-[9px] px-1.5 py-0.5 rounded-full bg-cream-200 text-ink-500/60 capitalize">{msg.suggestions.style.replace(/-/g, ' ')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {visionLoading && (
              <div className="mr-12 max-w-2xl w-full mx-auto bg-white border border-cream-300 rounded-2xl px-4 py-3">
                <span className="inline-flex gap-1 items-center text-ink-500/50 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            )}

            {visionError && (
              <p className="font-sans text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5 max-w-2xl w-full mx-auto">{visionError}</p>
            )}

            {visionMessages.length > 0 && !visionLoading && (
              <div className="flex flex-wrap gap-2 pt-1 max-w-2xl w-full mx-auto">
                {VISION_QUICK_ACTIONS.map((action) => (
                  <button
                    key={action}
                    onClick={() => sendVision(action)}
                    disabled={visionLoading || !apiKey}
                    className="font-sans text-xs px-3 py-1.5 rounded-full bg-cream-50 border border-cream-300 text-ink-500/60 hover:bg-ochre-500/10 hover:border-ochre-400 hover:text-ochre-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {action}
                  </button>
                ))}
                <button
                  onClick={() => { setVisionMessages([]); setLatestSuggestions(null) }}
                  className="font-sans text-xs px-3 py-1.5 rounded-full text-ink-500/30 hover:text-red-500 transition-colors ml-auto"
                >
                  Clear
                </button>
              </div>
            )}

            <div ref={visionBottomRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-cream-300 px-5 py-3.5 flex flex-col gap-2.5">
            {visionAttachment && (
              <div className="flex items-start gap-2">
                <div className="relative">
                  <img src={visionAttachment} alt="" className="h-14 w-20 object-cover rounded-xl border border-cream-300 bg-cream-50" />
                  <button
                    onClick={() => setVisionAttachment(null)}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-ink-900/60 text-white text-[9px] flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
                {selectedSwatches.length > 0 && (
                  <button
                    onClick={sendSketchColorMapping}
                    disabled={visionLoading || !apiKey}
                    className="self-end font-sans text-xs px-3 py-1.5 rounded-xl bg-moss-500 text-white hover:bg-moss-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ✦ Map colors
                  </button>
                )}
              </div>
            )}
            <input {...visionAttachInputProps} />
            <div className="flex gap-2 items-end">
              <button
                onClick={triggerVisionAttach}
                title="Attach a sketch or Midjourney screenshot"
                className="shrink-0 w-9 h-9 rounded-xl border border-cream-300 bg-cream-50 text-ink-500/50 hover:text-ochre-600 hover:border-ochre-400 transition-colors flex items-center justify-center text-base"
              >
                ↑
              </button>
              <textarea
                value={visionInput}
                onChange={(e) => setVisionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendVision()
                  }
                }}
                placeholder={visionMessages.length === 0 ? 'Describe your vision or attach a screenshot…' : 'Continue the conversation…'}
                disabled={visionLoading || !apiKey}
                rows={2}
                className="flex-1 font-sans text-sm bg-cream-50 border border-cream-300 rounded-xl px-3.5 py-2.5 text-ink-500 placeholder:text-ink-500/30 focus:outline-none focus:ring-2 focus:ring-ochre-400/50 focus:border-ochre-400 disabled:opacity-50 transition-colors resize-none leading-relaxed"
              />
              <button
                onClick={() => sendVision()}
                disabled={(!visionInput.trim() && !visionAttachment) || visionLoading || !apiKey}
                className="shrink-0 px-4 py-2.5 bg-ochre-500 text-white text-sm font-sans rounded-xl hover:bg-ochre-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                →
              </button>
            </div>
          </div>

        </div>

        {/* ── RIGHT: Outputs + Controls (scrollable) ── */}
        <div className="w-80 shrink-0 flex flex-col h-full overflow-y-auto scrollbar-thin border-l border-cream-300 bg-cream-200/30 divide-y divide-cream-300">

          {/* 1. Midjourney Prompt */}
          <div className="px-5 py-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="font-sans text-[10px] font-medium text-ink-500/50 uppercase tracking-wide">
                Midjourney Prompt
              </p>
              <div className="flex items-center gap-2">
                {promptDraft !== null && (
                  <button
                    onClick={() => setPromptDraft(null)}
                    className="font-sans text-[10px] text-ink-500/50 hover:text-ochre-600 transition-colors"
                    title="Reset to auto-generated"
                  >
                    ↺
                  </button>
                )}
                <button
                  onClick={copyPrompt}
                  className={[
                    'font-sans text-xs font-medium px-3 py-1 rounded-lg transition-colors',
                    copied
                      ? 'bg-moss-500 text-white'
                      : 'bg-ochre-500 text-white hover:bg-ochre-600',
                  ].join(' ')}
                >
                  {copied ? '✓ Copied' : '↗ Copy'}
                </button>
              </div>
            </div>
            <textarea
              value={displayedPrompt}
              onChange={(e) => setPromptDraft(e.target.value)}
              rows={7}
              className="w-full font-mono text-[10px] text-ink-700 leading-relaxed bg-white border border-cream-300 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-ochre-400/50 focus:border-ochre-400 transition-colors"
            />
            <p className="font-sans text-[9px] text-ink-500/40 leading-relaxed">
              Built from art notes, palette, mood and style. Edit freely — paste into Midjourney, then attach the screenshot to chat.
            </p>
          </div>

          {/* 2. Character Refs */}
          <div className="px-5 py-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <p className="font-sans text-[10px] font-medium text-ink-500/50 uppercase tracking-wide">
                Character Refs
              </p>
              {selectedRefIds.size > 0 && (
                <span className="font-sans text-[10px] text-ochre-500">{selectedRefIds.size} selected</span>
              )}
            </div>

            <div className="flex gap-2.5 overflow-x-auto scrollbar-thin pb-1">
              <input {...refImageInputProps} />

              {(project.characterRefs ?? []).map((ref) => {
                const isSelected = selectedRefIds.has(ref.id)
                return (
                  <div
                    key={ref.id}
                    onClick={() =>
                      setSelectedRefIds((prev) => {
                        const next = new Set(prev)
                        if (next.has(ref.id)) next.delete(ref.id)
                        else next.add(ref.id)
                        setPromptDraft(null)
                        return next
                      })
                    }
                    className={[
                      'group relative flex-none w-20 flex flex-col rounded-xl border cursor-pointer transition-all overflow-hidden',
                      isSelected
                        ? 'border-ochre-400 ring-2 ring-ochre-400 bg-ochre-500/5'
                        : 'border-cream-300 bg-cream-100 hover:border-cream-400',
                    ].join(' ')}
                  >
                    {ref.imageDataUrl ? (
                      <img
                        src={ref.imageDataUrl}
                        alt={ref.name}
                        className="w-full h-16 object-cover"
                      />
                    ) : (
                      <div className="w-full h-16 bg-cream-200 flex items-center justify-center text-ink-500/30 text-sm font-sans font-medium">
                        {ref.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="px-1.5 py-1.5">
                      <RefNameEditor
                        name={ref.name}
                        onRename={(name) => updateCharacterRef(ref.id, { name })}
                      />
                      <p className="font-mono text-[7px] text-ink-500/30 truncate leading-tight mt-0.5" title={ref.mjParams}>
                        {ref.mjParams}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteCharacterRef(ref.id) }}
                      className="absolute top-1 right-1 w-4 h-4 rounded-full bg-ink-900/40 text-white text-[9px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                )
              })}

              {addingRef ? (
                <div className="flex-none w-56 flex flex-col gap-2 border border-cream-300 rounded-xl p-3 bg-cream-100 self-start">
                  <input
                    value={refDraft.name}
                    onChange={(e) => setRefDraft((d) => ({ ...d, name: e.target.value }))}
                    placeholder="Name (e.g. Wren)"
                    className="font-sans text-xs bg-white border border-cream-300 rounded-lg px-2.5 py-1.5 text-ink-700 placeholder:text-ink-500/30 focus:outline-none focus:ring-2 focus:ring-ochre-400/50 focus:border-ochre-400 transition-colors"
                  />
                  <textarea
                    value={refDraft.mjParams}
                    onChange={(e) => setRefDraft((d) => ({ ...d, mjParams: e.target.value }))}
                    placeholder="--cref https://… --cw 100"
                    rows={2}
                    className="font-mono text-[10px] bg-white border border-cream-300 rounded-lg px-2.5 py-1.5 text-ink-700 placeholder:text-ink-500/30 resize-none focus:outline-none focus:ring-2 focus:ring-ochre-400/50 focus:border-ochre-400 transition-colors leading-relaxed"
                  />
                  <div className="flex items-center gap-2">
                    {refDraft.imageDataUrl ? (
                      <div className="relative">
                        <img src={refDraft.imageDataUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-cream-300" />
                        <button
                          onClick={() => setRefDraft((d) => ({ ...d, imageDataUrl: null }))}
                          className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-ink-900/60 text-white text-[8px] flex items-center justify-center hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={triggerRefImage}
                        className="font-sans text-[10px] text-ink-500/50 hover:text-ochre-600 border border-dashed border-cream-300 hover:border-ochre-400 px-2 py-1 rounded-lg transition-colors"
                      >
                        ↑ Image
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (!refDraft.name.trim() || !refDraft.mjParams.trim()) return
                        addCharacterRef(refDraft.name.trim(), refDraft.mjParams.trim(), refDraft.imageDataUrl)
                        setRefDraft({ name: '', mjParams: '', imageDataUrl: null })
                        setAddingRef(false)
                      }}
                      disabled={!refDraft.name.trim() || !refDraft.mjParams.trim()}
                      className="ml-auto font-sans text-xs px-3 py-1.5 rounded-lg bg-ochre-500 text-white hover:bg-ochre-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setAddingRef(false); setRefDraft({ name: '', mjParams: '', imageDataUrl: null }) }}
                      className="font-sans text-xs text-ink-500/40 hover:text-ink-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingRef(true)}
                  className="flex-none w-20 rounded-xl border-2 border-dashed border-cream-300 hover:border-ochre-400 text-ink-500/40 hover:text-ochre-500 transition-colors flex flex-col items-center justify-center gap-1 self-stretch min-h-[4rem]"
                >
                  <span className="text-base leading-none">+</span>
                  <span className="font-sans text-[9px] text-center px-1 leading-snug">Add ref</span>
                </button>
              )}
            </div>
          </div>

          {/* 3. Design Controls */}
          <div className="px-5 py-4 flex flex-col gap-5">

            {/* Color Palette */}
            <section className="flex flex-col gap-3">
              <p className="font-sans text-[10px] font-medium text-ink-500/50 uppercase tracking-wide">Color Palette</p>
              <div className="flex flex-wrap gap-2">
                {colorSwatches.map((sw) => (
                  <button
                    key={sw.id}
                    onClick={() => toggleSwatch(sw.id)}
                    title={`${sw.name} ${sw.hex}`}
                    className={[
                      'flex flex-col items-center gap-1 rounded-xl p-1.5 transition-all border',
                      sw.selected
                        ? 'border-ochre-400 bg-ochre-500/10 ring-1 ring-ochre-400'
                        : 'border-cream-300 bg-cream-100 hover:border-cream-400',
                    ].join(' ')}
                  >
                    <span className="w-7 h-7 rounded-lg border border-black/10" style={{ backgroundColor: sw.hex }} />
                    <span className="font-sans text-[8px] text-ink-500/60 leading-none">{sw.name}</span>
                    <span className="font-mono text-[7px] text-ink-500/40 leading-none">{sw.hex}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Mood */}
            <section className="flex flex-col gap-2">
              <p className="font-sans text-[10px] font-medium text-ink-500/50 uppercase tracking-wide">Mood</p>
              <div className="flex flex-wrap gap-1.5">
                {moodKeywords.map((kw) => (
                  <button
                    key={kw.id}
                    onClick={() => toggleMoodKeyword(kw.id)}
                    className={[
                      'font-sans text-xs px-2.5 py-1 rounded-full border transition-colors',
                      kw.selected
                        ? 'bg-ochre-500 text-white border-ochre-500'
                        : 'bg-cream-100 text-ink-500/70 border-cream-300 hover:border-ochre-300',
                    ].join(' ')}
                  >
                    {kw.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Illustration Style */}
            <section className="flex flex-col gap-2">
              <p className="font-sans text-[10px] font-medium text-ink-500/50 uppercase tracking-wide">Style</p>
              <div className="flex flex-col gap-1">
                {(Object.keys(ILLUSTRATION_STYLE_LABELS) as IllustrationStyle[]).map((style) => (
                  <button
                    key={style}
                    onClick={() => setIllustrationStyle(style)}
                    className={[
                      'text-left px-3 py-1.5 rounded-lg font-sans text-xs transition-colors',
                      illustrationStyle === style
                        ? 'bg-ochre-500 text-white'
                        : 'text-ink-500 hover:bg-cream-300',
                    ].join(' ')}
                  >
                    {ILLUSTRATION_STYLE_LABELS[style]}
                  </button>
                ))}
              </div>
            </section>

            {/* Apply from Vision */}
            {latestSuggestions && (
              <section className="flex flex-col gap-2.5 bg-moss-500/5 border border-moss-500/20 rounded-xl p-3">
                <p className="font-sans text-[10px] uppercase tracking-wide text-moss-600 font-medium">✦ From Vision</p>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    {latestSuggestions.colors.map((c) => (
                      <span
                        key={c.hex}
                        className="w-4 h-4 rounded border border-black/10"
                        style={{ backgroundColor: c.hex }}
                        title={`${c.name} ${c.hex}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={applyVisionColors}
                    className="font-sans text-[10px] text-ochre-600 hover:text-ochre-700 transition-colors shrink-0"
                  >
                    Apply colors
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    {latestSuggestions.moods.map((m) => (
                      <span key={m} className="font-sans text-[9px] px-1.5 py-0.5 rounded-full bg-cream-200 text-ink-500/70">{m}</span>
                    ))}
                  </div>
                  <button
                    onClick={applyVisionMoods}
                    className="font-sans text-[10px] text-ochre-600 hover:text-ochre-700 transition-colors shrink-0"
                  >
                    Apply mood
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="font-sans text-[10px] text-ink-500/60 capitalize">
                    {latestSuggestions.style.replace(/-/g, ' ')}
                  </span>
                  <button
                    onClick={applyVisionStyle}
                    className="font-sans text-[10px] text-ochre-600 hover:text-ochre-700 transition-colors shrink-0"
                  >
                    Apply style
                  </button>
                </div>

                <button
                  onClick={() => { applyVisionColors(); applyVisionMoods(); applyVisionStyle() }}
                  className="w-full font-sans text-xs py-1.5 rounded-lg bg-moss-500 text-white hover:bg-moss-600 transition-colors"
                >
                  Apply all
                </button>
              </section>
            )}

          </div>

          {/* 4. Saved Designs */}
          <div className="flex flex-col">
            <div className="px-5 py-3.5 flex items-center justify-between">
              <p className="font-sans text-[10px] font-medium text-ink-500/50 uppercase tracking-wide">Saved Designs</p>
              <button
                onClick={triggerUpload}
                className="font-sans text-[10px] px-2.5 py-1 rounded-full bg-ochre-500 text-white hover:bg-ochre-600 transition-colors flex items-center gap-1"
              >
                ↑ Upload
              </button>
            </div>

            <div className="px-4 pb-5">
              <input {...inputProps} />
              {project.drawings.length === 0 ? (
                <button
                  onClick={triggerUpload}
                  className="w-full aspect-[4/3] rounded-xl border-2 border-dashed border-cream-300 hover:border-ochre-400 hover:bg-cream-200/50 transition-colors flex flex-col items-center justify-center gap-2 text-ink-500/40 hover:text-ochre-500"
                >
                  <span className="text-2xl leading-none">↑</span>
                  <span className="font-sans text-[10px] text-center leading-snug px-4">
                    Upload Midjourney outputs here
                  </span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {project.drawings.map((d) => (
                    <DesignCard
                      key={d.id}
                      id={d.id}
                      title={d.title}
                      imageDataUrl={d.imageDataUrl}
                      onDelete={() => deleteDrawing(d.id)}
                      onRename={(title) => updateDrawing(d.id, { title })}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
