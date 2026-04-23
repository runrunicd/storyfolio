import { BaseProvider } from './base'
import { ProviderNotImplementedError } from '../types'
import type { ProviderId, StreamChatParams, StreamChunk } from '../types'

/**
 * Kimi (Moonshot AI) provider — stub. Wiring lives in the dropdown so users
 * see the option; selecting it + sending a message surfaces the not-implemented
 * error. International availability and API-access path vary by region, so a
 * future implementation may need a custom endpoint field.
 */
export class KimiProvider extends BaseProvider {
  id: ProviderId = 'kimi'
  name = 'Kimi (Moonshot) — coming soon'
  supportsVision = true

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async *streamChat(_params: StreamChatParams): AsyncIterable<StreamChunk> {
    throw new ProviderNotImplementedError(this.id)
  }
}
