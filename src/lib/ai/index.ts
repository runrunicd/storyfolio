// Facade for the AI provider layer.
//
// Every caller in the app imports from here, never directly from ./providers/.
// That lets us swap providers behind a single indirection and keeps vendor
// SDKs out of the rest of the codebase.

import { AnthropicProvider } from './providers/anthropic'
import { GeminiProvider } from './providers/gemini'
import { KimiProvider } from './providers/kimi'
import { OpenAIProvider } from './providers/openai'
import {
  ProviderMissingKeyError,
  type Provider,
  type ProviderId,
  type StreamChatParams,
  type StreamChunk,
} from './types'
import type { AppSettings } from '@/types'

export type { ChatMessage, ChatContentBlock, Provider, ProviderId, StreamChunk, StreamChatParams } from './types'
export { ProviderNotImplementedError, ProviderMissingKeyError } from './types'

export interface ProviderOption {
  id: ProviderId
  name: string
  requiresKey: true
  implemented: boolean
}

export const PROVIDER_OPTIONS: ProviderOption[] = [
  { id: 'gemini',    name: 'Gemini Flash (Google) · free tier', requiresKey: true, implemented: true },
  { id: 'anthropic', name: 'Claude (Anthropic)',                requiresKey: true, implemented: true },
  { id: 'openai',    name: 'GPT-4o (OpenAI) — coming soon',     requiresKey: true, implemented: false },
  { id: 'kimi',      name: 'Kimi (Moonshot) — coming soon',     requiresKey: true, implemented: false },
]

/** Read the API key for a given provider out of settings. */
export function keyFor(providerId: ProviderId, settings: AppSettings): string {
  switch (providerId) {
    case 'gemini':    return settings.geminiApiKey ?? ''
    case 'anthropic': return settings.claudeApiKey ?? ''
    case 'openai':    return settings.openaiApiKey ?? ''
    case 'kimi':      return settings.kimiApiKey ?? ''
  }
}

/**
 * Resolve the active provider from app settings. Throws ProviderMissingKeyError
 * if the selected provider has no key set.
 */
export function getActiveProvider(settings: AppSettings): Provider {
  const providerId: ProviderId = settings.aiProvider ?? 'gemini'
  const key = keyFor(providerId, settings)
  if (!key) throw new ProviderMissingKeyError(providerId)

  switch (providerId) {
    case 'gemini':    return new GeminiProvider(key)
    case 'anthropic': return new AnthropicProvider(key)
    case 'openai':    return new OpenAIProvider()
    case 'kimi':      return new KimiProvider()
  }
}

/** Single entry point for streaming a chat. Delegates to the active provider. */
export function streamChat(
  settings: AppSettings,
  params: StreamChatParams
): AsyncIterable<StreamChunk> {
  return getActiveProvider(settings).streamChat(params)
}

// ─── Dev smoke test (temporary, Day 1) ──────────────────────────────────────
//
// Exposes window.__storyfolio_ai_smoketest(prompt?) in the browser console so
// you can verify key + stream wiring without any UI. Remove in Day 2 once the
// Partner tab is calling streamChat for real.

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  type DevWindow = {
    __storyfolio_ai_smoketest?: (prompt?: string) => Promise<void>
    __storyfolio_set_ai?: (provider: ProviderId, key: string) => Promise<void>
    __storyfolio_ai_status?: () => Promise<void>
  }

  // Set provider + key from the console. Persists via zustand → localStorage.
  ;(window as unknown as DevWindow).__storyfolio_set_ai = async (provider, key) => {
    const { useAppStore } = await import('@/store/useAppStore')
    useAppStore.getState().setAiProvider(provider)
    useAppStore.getState().setProviderKey(provider, key)
    // eslint-disable-next-line no-console
    console.log(`[storyfolio] provider=${provider}, key=${key ? '(set)' : '(empty)'}`)
  }

  // Inspect current AI settings without exposing key values.
  ;(window as unknown as DevWindow).__storyfolio_ai_status = async () => {
    const { useAppStore } = await import('@/store/useAppStore')
    const s = useAppStore.getState().settings
    // eslint-disable-next-line no-console
    console.table({
      provider: s.aiProvider ?? 'gemini',
      aiEnabled: s.aiEnabled,
      gemini: s.geminiApiKey ? 'set' : '-',
      anthropic: s.claudeApiKey ? 'set' : '-',
      openai: s.openaiApiKey ? 'set' : '-',
      kimi: s.kimiApiKey ? 'set' : '-',
    })
  }

  ;(window as unknown as DevWindow).__storyfolio_ai_smoketest = async (prompt = 'Say hi in one sentence.') => {
    const { useAppStore } = await import('@/store/useAppStore')
    const settings = useAppStore.getState().settings

    // eslint-disable-next-line no-console
    console.group(`[storyfolio smoke] provider=${settings.aiProvider ?? 'gemini'} prompt=${JSON.stringify(prompt)}`)
    try {
      const stream = streamChat(settings, {
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 128,
      })
      let out = ''
      for await (const chunk of stream) {
        if (chunk.type === 'delta') {
          out += chunk.text
          // eslint-disable-next-line no-console
          console.log('[delta]', chunk.text)
        } else if (chunk.type === 'error') {
          // eslint-disable-next-line no-console
          console.error('[error]', chunk.error)
          break
        } else if (chunk.type === 'done') {
          break
        }
      }
      // eslint-disable-next-line no-console
      console.log('[full]', out)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[smoke test failed]', err)
    } finally {
      // eslint-disable-next-line no-console
      console.groupEnd()
    }
  }
}
