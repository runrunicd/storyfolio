import Anthropic from '@anthropic-ai/sdk'

const VALID_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
type ValidMediaType = (typeof VALID_MEDIA_TYPES)[number]

const INTERPRET_PROMPT = `You are a picture book creative assistant. A picture book author has shared a rough sketch for one spread (double page) of their story.

Given the sketch and the project context, interpret the visual story and suggest content for this spread.

Respond with ONLY a valid JSON object (no markdown, no backticks) in this exact structure:

{
  "manuscriptText": "...",
  "characters": "...",
  "scene": "...",
  "designNotes": "...",
  "keyWords": "..."
}

Guidelines:
- manuscriptText: The story text that would appear on this spread — lyrical, concise, written for a picture book audience (1–4 sentences).
- characters: Who appears in the sketch? Describe what they are doing and their emotional state.
- scene: Where are we? Describe the setting, time of day, environment, and atmosphere you see in the sketch.
- designNotes: Visual observations — colors suggested, composition, mood, lighting, spatial relationships.
- keyWords: Any dialogue, captions, or key text that should appear on the page (or leave empty string if none).`

export interface SketchInterpretation {
  manuscriptText: string
  characters: string
  scene: string
  designNotes: string
  keyWords: string
}

export async function interpretSketch(params: {
  sketchDataUrl: string
  projectTitle: string
  roughIdeas: string
  spreadNumber: number
  apiKey: string
}): Promise<SketchInterpretation> {
  const [header, base64Data] = params.sketchDataUrl.split(',')
  if (!header || !base64Data) {
    throw new Error('Invalid image data URL format.')
  }

  const mediaTypeMatch = header.match(/data:(.*);base64/)
  const rawMediaType = mediaTypeMatch?.[1] ?? ''

  if (!VALID_MEDIA_TYPES.includes(rawMediaType as ValidMediaType)) {
    throw new Error(
      `Unsupported image type "${rawMediaType}". Please upload a JPEG, PNG, GIF, or WebP image.`
    )
  }

  const mediaType = rawMediaType as ValidMediaType

  const client = new Anthropic({
    apiKey: params.apiKey,
    dangerouslyAllowBrowser: true,
  })

  const contextNote = [
    `Story title: "${params.projectTitle}"`,
    params.roughIdeas ? `Story premise: ${params.roughIdeas}` : '',
    `This is spread ${params.spreadNumber} of the book.`,
  ]
    .filter(Boolean)
    .join('\n')

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Data,
            },
          },
          {
            type: 'text',
            text: `${contextNote}\n\n${INTERPRET_PROMPT}`,
          },
        ],
      },
    ],
  })

  const rawText = response.content[0]?.type === 'text' ? response.content[0].text : ''

  let parsed: SketchInterpretation
  try {
    parsed = JSON.parse(rawText)
  } catch {
    throw new Error('Claude returned an unexpected response format. Please try again.')
  }

  return parsed
}
