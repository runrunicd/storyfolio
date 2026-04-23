import Anthropic from '@anthropic-ai/sdk'
import { BaseProvider } from './base'
import type {
  ChatContentBlock,
  ProviderId,
  StreamChatParams,
  StreamChunk,
} from '../types'

const DEFAULT_MODEL = 'claude-sonnet-4-6'
const DEFAULT_MAX_TOKENS = 2048

/**
 * Anthropic provider. Wraps @anthropic-ai/sdk (already a dependency).
 *
 * Docs: https://docs.anthropic.com/en/api/messages-streaming
 */
export class AnthropicProvider extends BaseProvider {
  id: ProviderId = 'anthropic'
  name = 'Claude (Anthropic)'
  supportsVision = true

  private apiKey: string
  private model: string

  constructor(apiKey: string, model: string = DEFAULT_MODEL) {
    super()
    this.apiKey = apiKey
    this.model = model
  }

  async *streamChat(params: StreamChatParams): AsyncIterable<StreamChunk> {
    const client = new Anthropic({ apiKey: this.apiKey, dangerouslyAllowBrowser: true })

    // Structure matches Anthropic's Messages API shape. We rely on structural
    // typing via messages.stream()'s MessageCreateParams — safer than naming
    // the ContentBlockParam namespace type, which isn't universally exposed.
    const messages = params.messages.map((m) => {
      const { role, blocks } = this.normalizeMessage(m)
      return { role, content: toAnthropicBlocks(blocks) }
    })

    try {
      const stream = client.messages.stream({
        model: this.model,
        max_tokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
        system: params.systemPrompt,
        messages,
      })

      // Bridge the SDK's event stream into our own delta yields.
      const queue: StreamChunk[] = []
      let resolveNext: (() => void) | null = null
      let done = false
      let errored: string | null = null

      stream.on('text', (text) => {
        queue.push({ type: 'delta', text })
        resolveNext?.()
      })
      stream.on('error', (err) => {
        errored = err.message
        resolveNext?.()
      })
      stream.on('end', () => {
        done = true
        resolveNext?.()
      })

      // Abort support.
      if (params.signal) {
        params.signal.addEventListener('abort', () => {
          stream.abort()
        })
      }

      while (!done && !errored) {
        if (queue.length === 0) {
          await new Promise<void>((r) => { resolveNext = r })
          resolveNext = null
        }
        while (queue.length > 0) {
          yield queue.shift()!
        }
        if (errored) break
      }

      if (errored) {
        yield { type: 'error', error: errored }
        return
      }
      yield { type: 'done' }
    } catch (err) {
      yield { type: 'error', error: err instanceof Error ? err.message : 'Anthropic stream error' }
    }
  }
}

// ─── helpers ────────────────────────────────────────────────────────────────

function toAnthropicBlocks(blocks: ChatContentBlock[]) {
  return blocks.map((b) => {
    if (b.type === 'text') {
      return { type: 'text' as const, text: b.text }
    }
    return {
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: b.mediaType,
        data: b.data,
      },
    }
  })
}
