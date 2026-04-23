import { useEffect, useRef } from 'react'
import type { PartnerMessage } from '@/types'

interface PartnerThreadProps {
  messages: PartnerMessage[]
  projectTitle: string
}

/**
 * Scrollable message list. Auto-scrolls to bottom on new message or delta.
 *
 * User messages are right-aligned cream pills; assistant messages are
 * left-aligned, full-width prose blocks — meant to read like feedback from
 * an editor, not a chat bubble from a bot.
 */
export function PartnerThread({ messages, projectTitle }: PartnerThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Pin to bottom whenever messages change (including mid-stream deltas).
  // We watch a derived signature so updates to the last assistant content re-trigger.
  const tailSignature = messages.length > 0
    ? `${messages[messages.length - 1].id}:${messages[messages.length - 1].content.length}`
    : ''

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [tailSignature])

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-8 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-2xl text-ink-700 mb-3">
            Creative Partner
          </h2>
          <p className="font-sans text-sm text-ink-500/70 leading-relaxed max-w-md mx-auto">
            Think out loud about <em className="italic">{projectTitle || 'your book'}</em>.
            Paste a draft for edits, ask for honest feedback, or work through a beat you&apos;re stuck on.
          </p>
          <p className="font-sans text-xs text-ink-500/40 mt-6">
            Anything you write here stays with this project.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {messages.map((m) => (
          <MessageRow key={m.id} message={m} />
        ))}
      </div>
    </div>
  )
}

function MessageRow({ message }: { message: PartnerMessage }) {
  if (message.role === 'user') {
    // Storyboard-share user turns render with a distinct pill so the reader
    // can tell at a glance that sketches were attached for this turn.
    if (message.sharedStoryboard) {
      const n = message.sharedSpreadCount ?? 0
      const label =
        n > 0
          ? `Shared storyboard · ${n} sketch${n === 1 ? '' : 'es'}`
          : 'Shared storyboard'
      return (
        <div className="flex justify-end">
          <div className="max-w-[85%] space-y-1.5">
            <div className="flex justify-end">
              <span className="inline-flex items-center gap-1.5 font-sans text-[11px] px-2.5 py-1 rounded-full bg-ochre-500/10 border border-ochre-400/40 text-ochre-600">
                <span aria-hidden className="text-[10px]">◐</span>
                {label}
              </span>
            </div>
            <div className="bg-cream-200 text-ink-700 rounded-2xl rounded-tr-md px-4 py-2.5 font-sans text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </div>
          </div>
        </div>
      )
    }
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-cream-200 text-ink-700 rounded-2xl rounded-tr-md px-4 py-2.5 font-sans text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    )
  }

  // Assistant message
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-ochre-500 text-sm">✧</span>
        <span className="font-sans text-[11px] uppercase tracking-wider text-ink-500/50">
          Partner
        </span>
        {message.streaming && (
          <span className="font-sans text-[11px] text-ink-500/40 italic">
            thinking…
          </span>
        )}
      </div>
      <div className="font-serif text-[15px] text-ink-700 leading-[1.7] whitespace-pre-wrap">
        {message.content}
        {message.streaming && message.content.length === 0 && (
          <span className="text-ink-500/30">…</span>
        )}
      </div>
      {message.error && (
        <div className="font-sans text-xs text-red-700/80 bg-red-50 border border-red-200 rounded-md px-3 py-2 mt-2">
          Stream error: {message.error}
        </div>
      )}
    </div>
  )
}
