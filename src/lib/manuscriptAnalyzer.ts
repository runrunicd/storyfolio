import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `You are a picture book layout assistant. Given a manuscript for a children's picture book, your job is to divide it into double-page spreads and suggest art direction for each.

Respond with ONLY a valid JSON array (no markdown, no backticks, no explanation). Each element represents one spread.`

export interface SpreadSuggestion {
  spreadNumber: number
  manuscriptText: string
  characters: string
  scene: string
  designNotes: string
  keyWords: string
}

export async function analyzeManuscript(params: {
  manuscriptText: string
  projectTitle: string
  spreadCount: number
  apiKey: string
}): Promise<SpreadSuggestion[]> {
  const client = new Anthropic({
    apiKey: params.apiKey,
    dangerouslyAllowBrowser: true,
  })

  const userMessage = `Title: "${params.projectTitle}"

Manuscript:
${params.manuscriptText}

Divide this manuscript into exactly ${params.spreadCount} double-page spreads for a picture book. Spread 1 is always the Cover, spread ${params.spreadCount} is always the End page.

For each spread return a JSON object with these fields:
- spreadNumber: integer 1 to ${params.spreadCount}
- manuscriptText: the story text that appears on this spread (lyrical, 1–4 sentences; empty string for cover/end if no text)
- characters: who appears and what they are doing
- scene: setting, time of day, environment, atmosphere
- designNotes: visual composition, suggested colors, mood, lighting
- keyWords: any dialogue, captions, or key text on the page (empty string if none)

Return a JSON array of exactly ${params.spreadCount} objects, ordered by spreadNumber.`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const rawText = response.content[0]?.type === 'text' ? response.content[0].text : ''

  // Strip markdown code fences if Claude wrapped the JSON despite instructions
  const stripped = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()

  let parsed: SpreadSuggestion[]
  try {
    parsed = JSON.parse(stripped)
  } catch {
    // Last resort: find the JSON array within the text
    const match = stripped.match(/\[[\s\S]*\]/)
    if (match) {
      try {
        parsed = JSON.parse(match[0])
      } catch {
        throw new Error('Could not parse the AI response. Please try again.')
      }
    } else {
      throw new Error('Could not parse the AI response. Please try again.')
    }
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Could not parse the AI response. Please try again.')
  }

  return parsed
}
