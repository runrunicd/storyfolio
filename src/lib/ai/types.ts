// Provider-agnostic AI types.
//
// All Storyfolio AI surfaces (Partner tab, Draw view per-spread loop, sketch
// interpreter, drawing feedback) speak this shape. Individual providers
// (Gemini, Anthropic, etc.) live in ./providers/ and translate to/from their
// vendor-specific formats.

export type ChatRole = 'user' | 'assistant'

export interface TextBlock {
  type: 'text'
  text: string
}

export interface ImageBlock {
  type: 'image'
  // One of: image/jpeg, image/png, image/gif, image/webp
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
  // Raw base64, no data: URL prefix
  data: string
}

export type ChatContentBlock = TextBlock | ImageBlock

export interface ChatMessage {
  role: ChatRole
  // Simple string content for text-only messages; array for multimodal.
  content: string | ChatContentBlock[]
}

export interface StreamChatParams {
  messages: ChatMessage[]
  systemPrompt?: string
  maxTokens?: number
  signal?: AbortSignal
}

export type StreamChunk =
  | { type: 'delta'; text: string }
  | { type: 'done' }
  | { type: 'error'; error: string }

export type ProviderId = 'gemini' | 'anthropic' | 'openai' | 'kimi'

export interface Provider {
  id: ProviderId
  name: string                 // display name for Settings dropdown
  supportsVision: boolean      // true if the provider can accept ImageBlocks

  /**
   * Stream a chat completion. Yields StreamChunks as text arrives.
   *
   * Implementations MUST:
   * - Yield `{ type: 'delta', text }` for each text fragment.
   * - Yield `{ type: 'done' }` once when the stream ends cleanly.
   * - Yield `{ type: 'error', error }` and stop if something goes wrong.
   * - Respect `params.signal` for cancellation.
   */
  streamChat(params: StreamChatParams): AsyncIterable<StreamChunk>
}

export class ProviderNotImplementedError extends Error {
  readonly providerId: ProviderId
  constructor(providerId: ProviderId) {
    super(`AI provider "${providerId}" is not implemented yet.`)
    this.name = 'ProviderNotImplementedError'
    this.providerId = providerId
  }
}

export class ProviderMissingKeyError extends Error {
  readonly providerId: ProviderId
  constructor(providerId: ProviderId) {
    super(`Missing API key for provider "${providerId}". Add it in Settings.`)
    this.name = 'ProviderMissingKeyError'
    this.providerId = providerId
  }
}
