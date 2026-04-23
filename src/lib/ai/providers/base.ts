import type {
  ChatContentBlock,
  ChatMessage,
  Provider,
  ProviderId,
  StreamChatParams,
  StreamChunk,
} from '../types'

/**
 * Base class for providers. Each provider extends this and implements
 * streamChat. Keeps shared validation + normalization in one place.
 */
export abstract class BaseProvider implements Provider {
  abstract id: ProviderId
  abstract name: string
  abstract supportsVision: boolean

  abstract streamChat(params: StreamChatParams): AsyncIterable<StreamChunk>

  /** Normalize a message to always use the array form. */
  protected normalizeMessage(msg: ChatMessage): { role: ChatMessage['role']; blocks: ChatContentBlock[] } {
    if (typeof msg.content === 'string') {
      return { role: msg.role, blocks: [{ type: 'text', text: msg.content }] }
    }
    return { role: msg.role, blocks: msg.content }
  }

  /** Check whether any message contains an image block. */
  protected hasImages(messages: ChatMessage[]): boolean {
    return messages.some((m) =>
      Array.isArray(m.content) && m.content.some((b) => b.type === 'image')
    )
  }
}
