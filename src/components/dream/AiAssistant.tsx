import { useState, useRef, useEffect } from 'react'
import { useProjectStore, useAppStore, useActiveProject } from '@/store'
import { sendSpreadMessage } from '@/lib/storyAssistant'
import type { StorySpread } from '@/types'

interface AiAssistantProps {
  spread: StorySpread
  mjPrompt: string
}

const QUICK_ACTIONS = [
  { label: 'Brainstorm', prompt: 'Help me brainstorm ideas for this spread. What could happen here to serve the story?' },
  { label: 'Write text', prompt: 'Write manuscript text for this spread based on the art notes and story context.' },
  { label: 'Art notes',  prompt: 'Suggest detailed art direction notes for this spread — characters, scene, mood, composition.' },
  { label: 'Feedback',   prompt: 'Give me honest feedback on this spread. What\'s working? What could be stronger?' },
  { label: 'Story arc',  prompt: 'How does this spread fit the overall story arc? Is the pacing right at this point in the book?' },
]

export function AiAssistant({ spread, mjPrompt }: AiAssistantProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const messagesRef = useRef<HTMLDivElement>(null)

  const { addAiMessage, clearAiMessages } = useProjectStore()
  const project = useActiveProject()
  const roughIdeas = project?.roughIdeas ?? ''
  const projectTitle = project?.title ?? ''
  const apiKey = useAppStore((s) => s.settings.claudeApiKey)
  const openSettings = useAppStore((s) => s.openSettings)

  useEffect(() => {
    if (open) {
      const el = messagesRef.current
      if (el) el.scrollTop = el.scrollHeight
    }
  }, [spread.aiMessages.length, open, error])

  const copyMjPrompt = () => {
    navigator.clipboard.writeText(mjPrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const send = async (message: string) => {
    if (!message.trim() || loading) return
    if (!apiKey) { openSettings(); return }

    // Snapshot history BEFORE adding the user message to the store,
    // so we never accidentally pass the new message as both history and userMessage.
    const historySnapshot = [...spread.aiMessages]

    setInput('')
    setError(null)
    addAiMessage(spread.id, { role: 'user', content: message })
    setLoading(true)

    try {
      const reply = await sendSpreadMessage({
        apiKey,
        projectTitle,
        roughIdeas,
        spreadNumber: spread.spreadNumber,
        pageLabel: spread.pageLabel,
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
    <div className="border-t border-cream-300">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-cream-300/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-moss-500">✦</span>
          <span className="font-sans text-xs font-medium text-ink-500">AI Assistant</span>
          {spread.aiMessages.length > 0 && (
            <span className="text-[10px] font-sans bg-moss-500/15 text-moss-600 px-1.5 py-0.5 rounded-full">
              {spread.aiMessages.length}
            </span>
          )}
        </div>
        <span className={`text-ink-500/40 text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {open && (
        /* Fixed-height container: MJ prompt top, messages middle, input bottom */
        <div className="flex flex-col border-t border-cream-300" style={{ height: '32rem' }}>

          {/* Midjourney prompt — always visible at top */}
          <div className="shrink-0 px-4 py-3 border-b border-cream-300 bg-cream-50">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-sans text-[10px] font-medium text-ink-500/50 uppercase tracking-wide">
                Inspiration (Midjourney)
              </span>
              <button
                onClick={copyMjPrompt}
                className={[
                  'font-sans text-[10px] px-2.5 py-1 rounded-full border transition-colors',
                  copied
                    ? 'bg-moss-500 text-white border-moss-500'
                    : 'bg-cream-100 text-ink-500/60 border-cream-300 hover:bg-ochre-500/10 hover:border-ochre-400 hover:text-ochre-600',
                ].join(' ')}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <p className="font-mono text-[10px] text-ink-500/70 leading-relaxed line-clamp-3 select-all">
              {mjPrompt || <span className="text-ink-500/30 not-italic">Fill in art notes to generate a prompt…</span>}
            </p>
          </div>

          {/* Messages — scrollable */}
          <div ref={messagesRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 flex flex-col gap-3">

            {!apiKey && (
              <p className="text-xs font-sans text-ink-500/60 bg-cream-300/50 rounded-xl px-3 py-2">
                <button onClick={openSettings} className="text-ochre-500 underline hover:text-ochre-600">
                  Add your Claude API key
                </button>{' '}
                in Settings to enable the AI assistant.
              </p>
            )}

            {spread.aiMessages.length === 0 && (
              <p className="font-sans text-xs text-ink-500/30 text-center py-4">
                Ask anything about this spread…
              </p>
            )}

            {spread.aiMessages.map((msg) => (
              <div
                key={msg.id}
                className={[
                  'rounded-xl px-3 py-2.5 font-sans text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-ochre-500/10 text-ink-700 ml-6'
                    : 'bg-cream-100 border border-cream-300 text-ink-500 mr-6 whitespace-pre-wrap',
                ].join(' ')}
              >
                {msg.content}
              </div>
            ))}

            {loading && (
              <div className="bg-cream-100 border border-cream-300 rounded-xl px-3 py-2.5 mr-6">
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

          {/* Quick actions + input — pinned at bottom */}
          <div className="shrink-0 border-t border-cream-300 px-4 py-3 flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => send(action.prompt)}
                  disabled={loading || !apiKey}
                  className="text-xs font-sans px-2.5 py-1 rounded-full bg-cream-100 border border-cream-300 text-ink-500 hover:bg-ochre-500/10 hover:border-ochre-400 hover:text-ochre-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {action.label}
                </button>
              ))}
              {spread.aiMessages.length > 0 && (
                <button
                  onClick={() => clearAiMessages(spread.id)}
                  className="text-xs font-sans px-2.5 py-1 rounded-full text-ink-500/40 hover:text-red-500 transition-colors ml-auto"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
                placeholder="Ask anything about this spread…"
                disabled={loading || !apiKey}
                className="flex-1 font-sans text-sm bg-cream-100 border border-cream-300 rounded-xl px-3 py-2 text-ink-500 placeholder:text-ink-500/30 focus:outline-none focus:ring-2 focus:ring-ochre-400/50 focus:border-ochre-400 disabled:opacity-50 transition-colors"
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || loading || !apiKey}
                className="px-4 py-2 bg-ochre-500 text-white text-sm font-sans rounded-xl hover:bg-ochre-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                Send
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
