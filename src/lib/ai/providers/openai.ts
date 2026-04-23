import { BaseProvider } from './base'
import { ProviderNotImplementedError } from '../types'
import type { ProviderId, StreamChatParams, StreamChunk } from '../types'

/**
 * OpenAI provider — stub. Wiring lives in the dropdown so users see the option;
 * selecting it + sending a message surfaces the not-implemented error.
 */
export class OpenAIProvider extends BaseProvider {
  id: ProviderId = 'openai'
  name = 'GPT-4o (OpenAI) — coming soon'
  supportsVision = true

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async *streamChat(_params: StreamChatParams): AsyncIterable<StreamChunk> {
    throw new ProviderNotImplementedError(this.id)
  }
}
