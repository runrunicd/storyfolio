import Anthropic from '@anthropic-ai/sdk'
import type { AIChatMessage } from '@/types'

const VALID_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
type ValidMediaType = (typeof VALID_MEDIA_TYPES)[number]

const SYSTEM_PROMPT = `You are a color consultant specializing in children's picture book illustration. You help authors choose color palettes that serve the emotional and narrative goals of their story.

When suggesting colors, always format hex codes as #RRGGBB directly after the color name in parentheses, like: Warm Ochre (#C8913A) or Soft Sage (#8A9E7A).

For each palette suggestion, list 4–6 colors with their names and hex codes, then describe how the palette would feel in the scene — the emotional temperature, how it supports the story's mood, and how it might evolve across the spread.

Pay close attention to any character emotions, facial expressions, or scene mood described in the spread context. Let these guide your color temperature (warm/cool), saturation (muted/vibrant), and contrast choices.

Keep responses concise and practical. You are talking to a picture book author who may not have a formal art background.`

const ANALYSIS_SYSTEM_PROMPT = `You are a children's illustration art director with expertise in color, light, and composition. You help picture book authors refine their visual ideas.

When you suggest colors, always format hex codes directly after the color name in parentheses, like: Warm Amber (#D4783A).

Analyze the sketch and the scene context to provide:
1. A color palette (4–6 colors with hex codes) suited to the scene mood and character emotions described
2. Light & shadow — where the main light source should be, how shadows fall, and what that communicates emotionally
3. Spatial composition — foreground, midground, and background elements with notes on scale and focal point

Be specific and reference the character expressions and scene mood from the context. Keep it practical and encouraging.`

// ─── Color chat ───────────────────────────────────────────────────

export async function sendColorMessage(params: {
  apiKey: string
  projectTitle: string
  spreadContext: string
  history: AIChatMessage[]
  userMessage: string
}): Promise<string> {
  const client = new Anthropic({
    apiKey: params.apiKey,
    dangerouslyAllowBrowser: true,
  })

  const contextNote = params.spreadContext
    ? `\n\nSpread context:\n${params.spreadContext}`
    : ''

  const messages = [
    ...params.history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    {
      role: 'user' as const,
      content: params.userMessage,
    },
  ]

  // Inject context into the first user message
  if (contextNote && messages.length === 1) {
    messages[0] = {
      role: 'user',
      content: `Project: "${params.projectTitle}"${contextNote}\n\n${params.userMessage}`,
    }
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages,
  })

  return response.content[0]?.type === 'text' ? response.content[0].text : ''
}

// ─── Vision chat ─────────────────────────────────────────────────

export interface InspirationAnalysis {
  colors: Array<{ name: string; hex: string }>
  moods: string[]
  style: string
  description: string
}

export interface VisionResponse {
  text: string
  suggestions: InspirationAnalysis | null
}

const VISION_SYSTEM_PROMPT = `You are a warm, encouraging picture book art director in a creative conversation with an author. They will describe their visual ideas, share inspiration images, and explore colors, mood, and style for their book. Your job is to help them find their visual direction.

Respond conversationally and specifically — name actual colors, suggest exact hues, describe textures and light quality. Reference anything they've shared (written descriptions or images).

After your conversational response, always append a JSON block with your current best suggestions (even on the first exchange — make your best guess from whatever they've shared). Use this exact format:

\`\`\`json
{"colors": [{"name": "...", "hex": "#RRGGBB"}, ...], "moods": [...], "style": "...", "description": "..."}
\`\`\`

Rules for the JSON:
- colors: 4–6 colors with descriptive names and exact hex codes
- moods: 2–4 from this list only: cozy, wonder, melancholic, mysterious, joyful, quiet, whimsical, tender, eerie, hopeful
- style: one of: watercolor, pencil-sketch, gouache, ink-wash, mixed-media, digital-painterly
- description: 1 sentence capturing the visual direction`

function buildImageBlock(dataUrl: string): Anthropic.ImageBlockParam | null {
  const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/)
  const mimeType = mimeMatch?.[1] ?? ''
  if (!(VALID_MEDIA_TYPES as readonly string[]).includes(mimeType)) return null
  const base64Data = dataUrl.split(',')[1]
  return {
    type: 'image',
    source: { type: 'base64', media_type: mimeType as ValidMediaType, data: base64Data },
  }
}

function parseVisionResponse(raw: string): VisionResponse {
  const match = raw.match(/```json\n([\s\S]*?)```/)
  if (!match) return { text: raw.trim(), suggestions: null }
  const text = raw.slice(0, raw.indexOf('```json')).trim()
  try {
    const suggestions = JSON.parse(match[1]) as InspirationAnalysis
    return { text, suggestions }
  } catch {
    return { text: raw.trim(), suggestions: null }
  }
}

export async function sendVisionMessage(params: {
  apiKey: string
  history: Array<{ role: 'user' | 'assistant'; text: string; imageDataUrl?: string }>
  userText: string
  userImageDataUrl?: string
  spreadContext?: string
}): Promise<VisionResponse> {
  const client = new Anthropic({ apiKey: params.apiKey, dangerouslyAllowBrowser: true })

  const systemPrompt = params.spreadContext
    ? `${VISION_SYSTEM_PROMPT}\n\nCurrent spread context:\n${params.spreadContext}`
    : VISION_SYSTEM_PROMPT

  const messages: Anthropic.MessageParam[] = params.history.map((m) => {
    if (m.role === 'assistant') {
      return { role: 'assistant', content: m.text }
    }
    const content: Anthropic.ContentBlockParam[] = []
    if (m.imageDataUrl) {
      const img = buildImageBlock(m.imageDataUrl)
      if (img) content.push(img)
    }
    content.push({ type: 'text', text: m.text })
    return { role: 'user', content }
  })

  const userContent: Anthropic.ContentBlockParam[] = []
  if (params.userImageDataUrl) {
    const img = buildImageBlock(params.userImageDataUrl)
    if (img) userContent.push(img)
  }
  userContent.push({ type: 'text', text: params.userText })
  messages.push({ role: 'user', content: userContent })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1536,
    system: systemPrompt,
    messages,
  })

  const raw = response.content[0]?.type === 'text' ? response.content[0].text : ''
  return parseVisionResponse(raw)
}

// ─── Sketch analysis for Draw view ───────────────────────────────

export async function analyzeSketchForDraw(params: {
  apiKey: string
  sketchDataUrl: string
  spreadContext: string
  projectTitle: string
}): Promise<string> {
  const client = new Anthropic({
    apiKey: params.apiKey,
    dangerouslyAllowBrowser: true,
  })

  // Detect media type from data URL prefix
  const mimeMatch = params.sketchDataUrl.match(/^data:([^;]+);base64,/)
  const mimeType = mimeMatch?.[1] ?? 'image/jpeg'
  if (!(VALID_MEDIA_TYPES as readonly string[]).includes(mimeType)) {
    throw new Error(`Unsupported image type: ${mimeType}`)
  }
  const base64Data = params.sketchDataUrl.split(',')[1]

  const userContent = `Project: "${params.projectTitle}"

Spread context:
${params.spreadContext || '(no context yet — base your analysis on what you see in the sketch)'}

Please analyze this sketch and provide color, light/shadow, and composition guidance for this spread.`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: ANALYSIS_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as ValidMediaType,
              data: base64Data,
            },
          },
          {
            type: 'text',
            text: userContent,
          },
        ],
      },
    ],
  })

  return response.content[0]?.type === 'text' ? response.content[0].text : ''
}
