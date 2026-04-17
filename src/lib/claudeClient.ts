import Anthropic from '@anthropic-ai/sdk'
import type { ClaudeFeedback } from '@/types'

const VALID_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
type ValidMediaType = (typeof VALID_MEDIA_TYPES)[number]

const FEEDBACK_PROMPT = `You are an expert picture book art director and illustrator. A picture book author-illustrator has shared a sketch or illustration for feedback.

Please analyze this image and respond with ONLY a valid JSON object (no markdown, no backticks) in this exact structure:

{
  "composition": "...",
  "color": "...",
  "style": "...",
  "overallImpression": "...",
  "suggestionsForRevision": ["...", "...", "..."]
}

Guidelines for each field:
- composition: Analyze the visual arrangement, focal point, use of white space, and how the eye moves through the image. Be specific and constructive (2-4 sentences).
- color: Discuss the color choices, palette harmony, mood created by color, and any suggestions for picture book printing considerations (2-3 sentences).
- style: Identify the illustration style and technique, how it suits children's book aesthetics, and how it might develop (2-3 sentences).
- overallImpression: A warm, encouraging overall assessment suitable for a developing illustrator (2-3 sentences).
- suggestionsForRevision: Exactly 3 specific, actionable suggestions for improving this piece.`

export interface DrawingFeedbackRequest {
  imageDataUrl: string
  apiKey: string
}

export async function getDrawingFeedback(req: DrawingFeedbackRequest): Promise<ClaudeFeedback> {
  const [header, base64Data] = req.imageDataUrl.split(',')
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
    apiKey: req.apiKey,
    dangerouslyAllowBrowser: true,
  })

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
            text: FEEDBACK_PROMPT,
          },
        ],
      },
    ],
  })

  const rawText = response.content[0]?.type === 'text' ? response.content[0].text : ''

  let parsed: Omit<ClaudeFeedback, 'receivedAt'>
  try {
    parsed = JSON.parse(rawText)
  } catch {
    throw new Error(
      'Claude returned an unexpected response format. Please try again.'
    )
  }

  return {
    ...parsed,
    receivedAt: new Date().toISOString(),
  }
}
