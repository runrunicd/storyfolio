import { BaseProvider } from './base'
import type { ProviderId, StreamChatParams, StreamChunk } from '../types'

const DEFAULT_MODEL = 'gemini-2.0-flash'
const DEFAULT_MAX_TOKENS = 2048

// Google AI Studio's REST endpoint. Streams SSE when alt=sse is set.
const endpoint = (model: string, apiKey: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`

interface GeminiPart {
  text?: string
  inlineData?: { mimeType: string; data: string }
}

interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

/**
 * Gemini (Google AI Studio) provider.
 *
 * Docs: https://ai.google.dev/gemini-api/docs/text-generation
 *
 * Uses the REST streaming endpoint so we stay dependency-free — no new SDK
 * in package.json. The response is SSE; each event's `data:` line is a JSON
 * chunk with candidates[].content.parts[].text deltas.
 *
 * Authenticates via the `key` query parameter. CORS is allowed from browsers
 * for this endpoint.
 */
export class GeminiProvider extends BaseProvider {
  id: ProviderId = 'gemini'
  name = 'Gemini Flash (Google)'
  supportsVision = true

  private apiKey: string
  private model: string

  constructor(apiKey: string, model: string = DEFAULT_MODEL) {
    super()
    this.apiKey = apiKey
    this.model = model
  }

  async *streamChat(params: StreamChatParams): AsyncIterable<StreamChunk> {
    // Gemini expects: { contents: [...], systemInstruction?: { parts: [{text}] } }
    const contents: GeminiContent[] = params.messages.map((m) => {
      const { role, blocks } = this.normalizeMessage(m)
      const parts: GeminiPart[] = blocks.map((b) => {
        if (b.type === 'text') return { text: b.text }
        return { inlineData: { mimeType: b.mediaType, data: b.data } }
      })
      return { role: role === 'assistant' ? 'model' : 'user', parts }
    })

    const body = {
      contents,
      systemInstruction: params.systemPrompt
        ? { parts: [{ text: params.systemPrompt }] }
        : undefined,
      generationConfig: {
        maxOutputTokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
      },
    }

    let response: Response
    try {
      response = await fetch(endpoint(this.model, this.apiKey), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: params.signal,
      })
    } catch (err) {
      yield { type: 'error', error: err instanceof Error ? err.message : 'Network error' }
      return
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      yield { type: 'error', error: `Gemini API error (${response.status}): ${text.slice(0, 300)}` }
      return
    }

    if (!response.body) {
      yield { type: 'error', error: 'Gemini returned no response body.' }
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // SSE events are delimited by blank lines. Each event has one or more
        // lines like "data: {...}". We extract and parse each complete event.
        let boundary: number
        while ((boundary = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.slice(0, boundary)
          buffer = buffer.slice(boundary + 2)

          for (const line of rawEvent.split('\n')) {
            if (!line.startsWith('data:')) continue
            const payload = line.slice(5).trim()
            if (!payload || payload === '[DONE]') continue

            try {
              const chunk = JSON.parse(payload)
              const text = chunk?.candidates?.[0]?.content?.parts
                ?.map((p: GeminiPart) => p.text ?? '')
                .join('') ?? ''
              if (text) yield { type: 'delta', text }
            } catch {
              // Skip malformed JSON chunks — Gemini occasionally splits mid-chunk.
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        yield { type: 'done' }
        return
      }
      yield { type: 'error', error: err instanceof Error ? err.message : 'Stream error' }
      return
    }

    yield { type: 'done' }
  }
}
