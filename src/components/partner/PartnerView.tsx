import { useMemo, useRef, useState } from 'react'
import { useActiveProject, useAppStore, usePartnerStore, usePartnerThread, useProjectStore } from '@/store'
import { streamChat, ProviderMissingKeyError, ProviderNotImplementedError } from '@/lib/ai'
import type { ChatContentBlock, ChatMessage, ProviderId } from '@/lib/ai'
import { buildPartnerSystemPrompt } from '@/lib/ai/partnerPrompt'
import type { PartnerMessage, Project } from '@/types'
import { PartnerThread } from './PartnerThread'
import { PartnerComposer } from './PartnerComposer'

/**
 * Creative Partner view. Project-scoped thread with streaming chat against
 * the configured AI provider.
 *
 * Day 3 additions:
 *   • "Share storyboard" — one-click, confirm-once-per-project button that
 *     attaches the latest sketch per spread to the outgoing message as image
 *     blocks. Costs meaningfully more tokens, so the UX deliberately friction-
 *     gates it.
 *   • Markdown export of the thread.
 */
export function PartnerView() {
  const project = useActiveProject()
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const settings = useAppStore((s) => s.settings)
  const openSettings = useAppStore((s) => s.openSettings)
  const thread = usePartnerThread(activeProjectId)
  const {
    appendUserMessage,
    appendStoryboardShare,
    startAssistantMessage,
    appendToAssistantMessage,
    finishAssistantMessage,
    clearThread,
  } = usePartnerStore.getState()

  const [streaming, setStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // Figure out whether sending is possible given current settings.
  const disabledReason = useMemo(() => {
    if (!activeProjectId) return 'Open a project to start a conversation.'
    if (!settings.aiEnabled) {
      return 'AI is turned off. Enable it in Settings to chat with your Creative Partner.'
    }
    const provider = (settings.aiProvider ?? 'gemini') as ProviderId
    const keyMap: Record<ProviderId, string> = {
      gemini:    settings.geminiApiKey ?? '',
      anthropic: settings.claudeApiKey ?? '',
      openai:    settings.openaiApiKey ?? '',
      kimi:      settings.kimiApiKey ?? '',
    }
    if (!keyMap[provider]) {
      return `No API key set for ${providerLabel(provider)}. Add one in Settings.`
    }
    return null
  }, [activeProjectId, settings])

  // Storyboard share preconditions (independent of the chat-disabled gate).
  const { shareSpreadCount, shareDisabledReason } = useMemo(() => {
    const withSketches = (project?.storyFlow ?? []).filter((s) => (s.sketches?.length ?? 0) > 0)
    if (withSketches.length === 0) {
      return {
        shareSpreadCount: 0,
        shareDisabledReason: 'Upload sketches in the Story view first.',
      }
    }
    return { shareSpreadCount: withSketches.length, shareDisabledReason: undefined as string | undefined }
  }, [project])

  /**
   * Start a stream using whatever messages are currently in the thread for
   * this project. Handles the sharedStoryboard expansion at request-time.
   */
  const streamFromCurrentThread = async () => {
    if (!activeProjectId) return

    const freshThread = usePartnerStore.getState().getThread(activeProjectId)
    const providerMessages = buildProviderMessages(freshThread?.messages ?? [], project)

    const asstId = startAssistantMessage(activeProjectId)
    const controller = new AbortController()
    abortRef.current = controller
    setStreaming(true)

    try {
      const stream = streamChat(settings, {
        messages: providerMessages,
        systemPrompt: buildPartnerSystemPrompt(project),
        signal: controller.signal,
      })
      for await (const chunk of stream) {
        if (chunk.type === 'delta') {
          appendToAssistantMessage(activeProjectId, asstId, chunk.text)
        } else if (chunk.type === 'error') {
          finishAssistantMessage(activeProjectId, asstId, chunk.error)
          break
        } else if (chunk.type === 'done') {
          finishAssistantMessage(activeProjectId, asstId)
          break
        }
      }
    } catch (err) {
      const message =
        err instanceof ProviderMissingKeyError
          ? `No API key set for ${providerLabel(err.providerId)}.`
          : err instanceof ProviderNotImplementedError
          ? `${providerLabel(err.providerId)} isn't available yet.`
          : err instanceof Error
          ? err.message
          : 'Stream failed.'
      finishAssistantMessage(activeProjectId, asstId, message)
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  const handleSend = async (text: string) => {
    if (!activeProjectId || streaming) return
    appendUserMessage(activeProjectId, text)
    await streamFromCurrentThread()
  }

  const handleShareStoryboard = async () => {
    if (!activeProjectId || !project || streaming) return
    if (shareDisabledReason) return

    // Confirm once per project.
    const partnerState = usePartnerStore.getState()
    if (!partnerState.hasStoryboardAck(activeProjectId)) {
      const provider = providerLabel((settings.aiProvider ?? 'gemini') as ProviderId)
      const n = shareSpreadCount
      const ok = window.confirm(
        `Share your storyboard with ${provider}?\n\n` +
        `This attaches the latest sketch from each of your ${n} spread${n === 1 ? '' : 's'} ` +
        `as image context. It uses significantly more tokens than a text message — ` +
        `only do this when you want visual feedback.\n\n` +
        `You won't see this confirmation again for this project.`
      )
      if (!ok) return
      partnerState.setStoryboardAck(activeProjectId)
    }

    const prompt =
      `I'm sharing my storyboard for "${project.title || 'this book'}" — the latest sketch from each spread is attached. ` +
      `Give me a real first read. What's the arc actually doing? Where does the picture-text gap sing, and where does it collapse? ` +
      `Call out the spread that feels strongest and the spread that's the weakest link.`

    appendStoryboardShare(activeProjectId, prompt, shareSpreadCount)
    await streamFromCurrentThread()
  }

  const handleStop = () => {
    abortRef.current?.abort()
  }

  const handleClear = () => {
    if (!activeProjectId) return
    if (!thread || thread.messages.length === 0) return
    const ok = window.confirm(
      'Clear this conversation? This cannot be undone — consider exporting first.'
    )
    if (!ok) return
    clearThread(activeProjectId)
  }

  const handleExport = () => {
    if (!project || !thread || thread.messages.length === 0) return
    downloadMarkdown(project, thread.messages)
  }

  // When AI is off or there's no key, offer a direct shortcut to Settings.
  const offerSettings =
    disabledReason &&
    (disabledReason.includes('Settings') || disabledReason.includes('API key') || disabledReason.includes('turned off'))

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="border-b border-cream-300 bg-cream-100 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-ochre-500 text-lg">✧</span>
          <div>
            <h1 className="font-serif text-lg text-ink-700 leading-tight">Creative Partner</h1>
            <p className="font-sans text-[11px] text-ink-500/50 leading-tight">
              {project?.title || '—'} · private to this project
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {thread && thread.messages.length > 0 && (
            <>
              <button
                onClick={handleExport}
                className="font-sans text-xs text-ink-500/60 hover:text-ink-700 px-2 py-1"
                title="Download this conversation as Markdown"
              >
                Export
              </button>
              <button
                onClick={handleClear}
                className="font-sans text-xs text-ink-500/60 hover:text-ink-700 px-2 py-1"
              >
                Clear
              </button>
            </>
          )}
        </div>
      </header>

      {/* Thread */}
      <PartnerThread
        messages={thread?.messages ?? []}
        projectTitle={project?.title ?? ''}
      />

      {/* Disabled notice with Settings shortcut */}
      {disabledReason && offerSettings && (
        <div className="px-8 pb-2">
          <div className="max-w-2xl mx-auto flex items-center justify-center gap-3 py-2">
            <p className="font-sans text-xs text-ink-500/60">{disabledReason}</p>
            <button
              onClick={openSettings}
              className="font-sans text-xs text-ochre-500 hover:underline"
            >
              Open Settings
            </button>
          </div>
        </div>
      )}

      {/* Composer */}
      <PartnerComposer
        onSend={handleSend}
        onStop={handleStop}
        streaming={streaming}
        disabled={!!disabledReason}
        disabledReason={!offerSettings ? disabledReason ?? undefined : undefined}
        onShareStoryboard={handleShareStoryboard}
        shareDisabledReason={shareDisabledReason}
        shareSpreadCount={shareSpreadCount}
      />
    </div>
  )
}

// ─── Provider-message builder (with storyboard expansion) ──────────

/**
 * Map PartnerMessages → ChatMessages for the provider.
 * For any `sharedStoryboard` user message, replace its string content with
 * a multimodal array: the original prompt text + one image block per spread
 * that has at least one sketch (latest version, labeled "Spread N — pageLabel").
 * Skips errored messages.
 */
function buildProviderMessages(
  messages: PartnerMessage[],
  project: Project | undefined,
): ChatMessage[] {
  const out: ChatMessage[] = []
  for (const m of messages) {
    if (m.error) continue

    if (m.role === 'user' && m.sharedStoryboard && project) {
      const blocks = buildStoryboardBlocks(project, m.content)
      out.push({ role: 'user', content: blocks })
    } else {
      out.push({ role: m.role, content: m.content })
    }
  }
  return out
}

function buildStoryboardBlocks(project: Project, leadText: string): ChatContentBlock[] {
  const blocks: ChatContentBlock[] = [{ type: 'text', text: leadText }]

  for (const spread of project.storyFlow ?? []) {
    const sketches = spread.sketches ?? []
    const latest = sketches[sketches.length - 1]
    if (!latest) continue
    const parsed = parseDataUrl(latest.imageDataUrl)
    if (!parsed) continue

    const captionParts = [`Spread ${spread.spreadNumber}`, spread.pageLabel]
    if (spread.plotBeat?.trim()) captionParts.push(`"${spread.plotBeat.trim()}"`)
    blocks.push({ type: 'text', text: captionParts.join(' — ') })
    blocks.push(parsed)
  }

  return blocks
}

/** Extract mediaType + raw base64 from a data: URL. Returns null on miss. */
function parseDataUrl(dataUrl: string): { type: 'image'; mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'; data: string } | null {
  const m = /^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/.exec(dataUrl.trim())
  if (!m) return null
  return {
    type: 'image',
    mediaType: m[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
    data: m[2],
  }
}

// ─── Markdown export ────────────────────────────────────────────────

function downloadMarkdown(project: Project, messages: PartnerMessage[]) {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10)

  const header = [
    `# Creative Partner — ${project.title || 'Untitled'}`,
    '',
    `_Exported ${dateStr} · ${messages.length} message${messages.length === 1 ? '' : 's'}_`,
    '',
    '---',
    '',
  ].join('\n')

  const body = messages
    .map((m) => {
      const who = m.role === 'user' ? 'You' : 'Partner'
      const timestamp = formatStamp(m.createdAt)
      const marker = m.sharedStoryboard
        ? ` · shared storyboard (${m.sharedSpreadCount ?? '?'} spread${m.sharedSpreadCount === 1 ? '' : 's'})`
        : ''
      const errorLine = m.error ? `\n\n> **stream error:** ${m.error}` : ''
      return `### ${who} · ${timestamp}${marker}\n\n${m.content.trim()}${errorLine}`
    })
    .join('\n\n')

  const markdown = header + body + '\n'

  const slug = slugify(project.title || 'untitled')
  const filename = `${slug}-partner-${dateStr}.md`

  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function formatStamp(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      year:   'numeric',
      month:  'short',
      day:    'numeric',
      hour:   '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'untitled'
}

// ─── Misc ──────────────────────────────────────────────────────────

function providerLabel(id: ProviderId): string {
  switch (id) {
    case 'gemini':    return 'Gemini'
    case 'anthropic': return 'Claude'
    case 'openai':    return 'OpenAI'
    case 'kimi':      return 'Kimi'
  }
}
