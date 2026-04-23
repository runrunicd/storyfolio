import { useEffect, useRef, useState } from 'react'

interface PartnerComposerProps {
  /** Called when the user sends a message. */
  onSend: (text: string) => void
  /** Called to stop an in-flight stream. Hidden when streaming is false. */
  onStop?: () => void
  /** True while a response is streaming. Disables send, shows Stop. */
  streaming: boolean
  /** Disabled fully (e.g. no project, no API key). Shows an inline reason. */
  disabled?: boolean
  /** If provided and disabled, renders this text instead of the input. */
  disabledReason?: string

  /**
   * Invoked when the user clicks "Share storyboard". Parent handles the
   * confirm dialog + send path. Omit to hide the button.
   */
  onShareStoryboard?: () => void
  /**
   * Reason the Share-storyboard button is disabled (e.g. provider can't
   * accept images, no sketches yet). Shown as a tooltip; when present the
   * button renders disabled.
   */
  shareDisabledReason?: string
  /** Number of spreads that would be shared. Used in the button label. */
  shareSpreadCount?: number
}

// Project-level shortcuts. These paste a starter prompt into the composer
// so the user can edit before sending — shortcuts, not replacements.
const QUICK_ACTIONS: { label: string; prompt: string }[] = [
  {
    label: 'Brainstorm',
    prompt:
      'Help me brainstorm this story. What would make it more surprising, more specific, or more emotional? Pitch me 2–3 directions.',
  },
  {
    label: 'Story arc',
    prompt:
      'Walk me through the emotional arc of my story based on what you know. Where are the beats strong? Where does it feel thin?',
  },
  {
    label: 'Tighten text',
    prompt:
      "I'm about to paste manuscript text. Give me craft-level edits for rhythm, specificity, and emotional impact. Keep my voice.\n\n---\n\n",
  },
  {
    label: 'Honest read',
    prompt:
      "Pretend you're an editor reading this for the first time. Give me your honest first reaction — what draws you in, what confuses you, what you'd push back on.",
  },
]

export function PartnerComposer({
  onSend,
  onStop,
  streaming,
  disabled,
  disabledReason,
  onShareStoryboard,
  shareDisabledReason,
  shareSpreadCount,
}: PartnerComposerProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-grow textarea up to ~8 lines.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [text])

  const canSend = !disabled && !streaming && text.trim().length > 0

  const handleSend = () => {
    if (!canSend) return
    onSend(text.trim())
    setText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter = send, Shift+Enter = newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleQuickAction = (prompt: string) => {
    // Paste the prompt into the composer so the user can edit before sending.
    setText(prompt)
    // Focus and scroll to end
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(prompt.length, prompt.length)
    })
  }

  if (disabled && disabledReason) {
    return (
      <div className="border-t border-cream-300 bg-cream-200/40 px-8 py-5">
        <div className="max-w-2xl mx-auto">
          <p className="font-sans text-sm text-ink-500/60 text-center">
            {disabledReason}
          </p>
        </div>
      </div>
    )
  }

  const shareDisabled = streaming || disabled || !!shareDisabledReason
  const shareLabel =
    typeof shareSpreadCount === 'number' && shareSpreadCount > 0
      ? `Share storyboard · ${shareSpreadCount} spread${shareSpreadCount === 1 ? '' : 's'}`
      : 'Share storyboard'

  return (
    <div className="border-t border-cream-300 bg-cream-100 px-8 py-4">
      <div className="max-w-2xl mx-auto space-y-3">
        {/* Share storyboard (optional, opt-in — sends sketch images) */}
        {onShareStoryboard && (
          <div className="flex items-center gap-2">
            <button
              onClick={onShareStoryboard}
              disabled={shareDisabled}
              title={shareDisabledReason || 'Sends your latest sketch for every spread — uses significantly more tokens.'}
              className={[
                'font-sans text-[11px] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 transition-colors',
                shareDisabled
                  ? 'border border-cream-300 text-ink-500/35 cursor-not-allowed'
                  : 'border border-ochre-400/40 text-ochre-600 hover:bg-ochre-500/10 hover:border-ochre-500',
              ].join(' ')}
            >
              <span aria-hidden className="text-[10px]">◐</span>
              {shareLabel}
            </button>
            <span className="font-sans text-[10px] text-ink-500/40 italic">
              {shareDisabledReason || 'uses extra tokens'}
            </span>
          </div>
        )}

        {/* Quick actions */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.label}
              onClick={() => handleQuickAction(qa.prompt)}
              disabled={streaming}
              className="font-sans text-[11px] px-2.5 py-1 rounded-full border border-cream-300 text-ink-500/70 hover:bg-cream-200 hover:text-ink-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {qa.label}
            </button>
          ))}
        </div>

        {/* Input row */}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write to your Creative Partner…"
            rows={1}
            className="flex-1 resize-none bg-cream-200/50 border border-cream-300 rounded-xl px-4 py-2.5 font-sans text-sm text-ink-700 placeholder:text-ink-500/40 focus:outline-none focus:border-ochre-500/50 focus:bg-cream-100"
            style={{ maxHeight: 200 }}
          />
          {streaming ? (
            <button
              onClick={onStop}
              className="font-sans text-sm px-3.5 py-2.5 rounded-xl bg-ink-700 text-cream-100 hover:bg-ink-500 transition-colors"
              title="Stop"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="font-sans text-sm px-3.5 py-2.5 rounded-xl bg-ochre-500 text-cream-100 hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
              title="Send (Enter)"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
