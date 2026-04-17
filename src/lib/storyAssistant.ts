import Anthropic from '@anthropic-ai/sdk'
import type { AIChatMessage, ArtNotes } from '@/types'
import type { SketchInterpretation } from '@/lib/sketchInterpreter'

export interface SpreadMessageParams {
  apiKey: string
  projectTitle: string
  roughIdeas: string
  storyArc?: string   // formatted summary of all filled plot beats
  spreadNumber: number
  pageLabel: string
  plotBeat?: string   // this spread's story beat
  manuscriptText: string
  artNotes: ArtNotes
  history: AIChatMessage[]
  userMessage: string
}

const SYSTEM_PROMPT = `You are a warm, experienced creative collaborator helping a picture book author-illustrator develop their story. You specialize in children's picture books — narrative arc across 32 pages, emotional pacing, character voice, the interplay between words and images, and what makes a spread sing on the page.

Your role is to help the author brainstorm ideas, write and refine manuscript text, develop art direction notes, give honest feedback, and bring the story to life spread by spread.

Be specific and concrete. When suggesting text, write actual prose the author can use or adapt. When giving feedback, name exactly what's working and what isn't. Keep your responses focused and not too long — the author is in the middle of creating.`

export async function sendSpreadMessage(params: SpreadMessageParams): Promise<string> {
  const client = new Anthropic({ apiKey: params.apiKey, dangerouslyAllowBrowser: true })

  const arcSection = params.storyArc
    ? `\n\nStory arc (plot beats across all spreads):\n${params.storyArc}`
    : ''

  const contextBlock = `
Project: "${params.projectTitle}"

Story synopsis / rough ideas:
${params.roughIdeas || '(no synopsis yet)'}${arcSection}

Current spread: Spread ${params.spreadNumber} (${params.pageLabel})${params.plotBeat ? `\nStory beat: ${params.plotBeat}` : ''}
Manuscript text: ${params.manuscriptText || '(empty)'}
Art notes:
  Characters: ${params.artNotes.characters || '(none)'}
  Scene: ${params.artNotes.scene || '(none)'}
  Design notes: ${params.artNotes.designNotes || '(none)'}
  Key words: ${params.artNotes.keyWords || '(none)'}
`.trim()

  // Build message history, prepending context to the first user message
  const messages: Anthropic.MessageParam[] = params.history.map((m, i) => ({
    role: m.role,
    content: i === 0 && m.role === 'user'
      ? `${contextBlock}\n\n---\n\n${m.content}`
      : m.content,
  }))

  // Add the new user message (include context if this is the first message)
  const newContent = messages.length === 0
    ? `${contextBlock}\n\n---\n\n${params.userMessage}`
    : params.userMessage

  messages.push({ role: 'user', content: newContent })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages,
  })

  const block = response.content[0]
  if (block?.type !== 'text') throw new Error('Unexpected response from Claude.')
  return block.text
}

// ─── Proactive probe question ─────────────────────────────────────

const PROBE_SYSTEM_PROMPT = `You are a warm, insightful creative collaborator helping a picture book author-illustrator develop their story.

Look at what the author has written for this spread and ask them ONE specific, thought-provoking question that will help them deepen their vision.

The question should:
- Be grounded in what they've already written (not generic)
- Open up creative possibility — about emotional truth, character motivation, or visual storytelling
- Be short: one sentence or two at most

Ask just the question. No preamble, no "Great start!" filler.`

export async function probeSpread(params: {
  apiKey: string
  projectTitle: string
  roughIdeas: string
  storyArc?: string
  spreadNumber: number
  pageLabel: string
  plotBeat?: string
  manuscriptText: string
  artNotes: ArtNotes
  hasSketches: boolean
}): Promise<string> {
  const client = new Anthropic({ apiKey: params.apiKey, dangerouslyAllowBrowser: true })

  const sketchLine = params.hasSketches
    ? '\nThe author has also uploaded a sketch for this spread.'
    : ''

  const arcSection = params.storyArc
    ? `\n\nStory arc (plot beats across all spreads):\n${params.storyArc}`
    : ''

  const contextBlock = `
Project: "${params.projectTitle}"

Story synopsis:
${params.roughIdeas || '(no synopsis yet)'}${arcSection}

Current spread: Spread ${params.spreadNumber} (${params.pageLabel})${params.plotBeat ? `\nStory beat: ${params.plotBeat}` : ''}
Manuscript text: ${params.manuscriptText || '(empty)'}
Art notes:
  Characters: ${params.artNotes.characters || '(none)'}
  Scene: ${params.artNotes.scene || '(none)'}
  Design notes: ${params.artNotes.designNotes || '(none)'}
  Key words: ${params.artNotes.keyWords || '(none)'}${sketchLine}
`.trim()

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    system: PROBE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: contextBlock }],
  })

  const block = response.content[0]
  if (block?.type !== 'text') throw new Error('Unexpected response from Claude.')
  return block.text
}

// ─── Text-based spread content suggestion ─────────────────────────

const SUGGEST_SYSTEM_PROMPT = `You are a picture book creative assistant helping an author develop their story spread by spread.

Given the current spread's context (manuscript text, art notes, story synopsis), suggest improvements or completions for all five fields.

Respond with ONLY a valid JSON object (no markdown, no backticks) in this exact structure:

{
  "manuscriptText": "...",
  "characters": "...",
  "scene": "...",
  "designNotes": "...",
  "keyWords": "..."
}

Guidelines:
- manuscriptText: Lyrical, concise story text for this spread (1–4 sentences). Build on any existing text if present; if empty, invent based on context.
- characters: Who is in this spread, what are they doing, what is their emotional state?
- scene: Setting, time of day, environment, atmosphere.
- designNotes: Visual mood, color palette direction, composition, lighting suggestions.
- keyWords: Any dialogue, captions, or key text visible on the page (empty string if none).

Be specific and grounded in the story context provided. Keep text picture-book appropriate — warm, vivid, evocative.`

export async function suggestSpreadContent(params: {
  apiKey: string
  projectTitle: string
  roughIdeas: string
  spreadNumber: number
  pageLabel: string
  manuscriptText: string
  artNotes: ArtNotes
}): Promise<SketchInterpretation> {
  const client = new Anthropic({ apiKey: params.apiKey, dangerouslyAllowBrowser: true })

  const contextBlock = `Project: "${params.projectTitle}"

Story synopsis:
${params.roughIdeas || '(no synopsis yet)'}

Current spread: Spread ${params.spreadNumber} (${params.pageLabel})
Manuscript text: ${params.manuscriptText || '(empty — please suggest text)'}
Art notes:
  Characters: ${params.artNotes.characters || '(none)'}
  Scene: ${params.artNotes.scene || '(none)'}
  Design notes: ${params.artNotes.designNotes || '(none)'}
  Key words: ${params.artNotes.keyWords || '(none)'}`.trim()

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SUGGEST_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: contextBlock }],
  })

  const rawText = response.content[0]?.type === 'text' ? response.content[0].text : ''
  try {
    return JSON.parse(rawText) as SketchInterpretation
  } catch {
    throw new Error('Claude returned an unexpected format. Please try again.')
  }
}
