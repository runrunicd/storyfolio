import type { Project, StorySpread } from '@/types'

/**
 * Builds the system prompt for the Creative Partner.
 *
 * Keep this focused on craft — not on AI-flavored helpfulness tropes.
 * The audience is picture book author-illustrators who want a blunt,
 * literate editor in the room, not a cheerleader.
 *
 * The prompt always includes a text-only digest of the project's
 * storyboard — title, logline, characters, rough ideas, and every
 * spread's beat + manuscript + art notes (truncated). That way the
 * Partner can talk about the arc, the pacing, a specific spread's
 * manuscript, etc., without the user having to paste anything in.
 *
 * Images (actual sketches) are *not* included here — that's an
 * opt-in "share storyboard" action that users invoke explicitly from
 * the composer, because it costs meaningfully more tokens.
 */
export function buildPartnerSystemPrompt(project: Project | undefined): string {
  const title       = project?.title || '(untitled)'
  const logline     = project?.statementLogline?.trim() || '(not set yet)'
  const roughIdeas  = project?.roughIdeas?.trim() || ''
  const spreads     = project?.storyFlow ?? []
  const spreadCount = spreads.length

  const characters = (project?.characters ?? [])
    .slice(0, 6)
    .map((c) => {
      const traits = [...c.personalityTags, ...c.visualTags]
        .slice(0, 4)
        .map((t) => t.label)
        .join(', ')
      const parts = [c.name]
      if (c.species) parts.push(`(${c.species})`)
      if (traits) parts.push(`— ${traits}`)
      return `• ${parts.join(' ')}`
    })
    .join('\n')

  const storyboard = buildStoryboardDigest(spreads)

  return [
    "You are the user's Creative Partner for a picture book they are writing and illustrating.",
    '',
    'Project context:',
    `• Title: ${title}`,
    `• Logline: ${logline}`,
    `• Spreads so far: ${spreadCount}`,
    characters ? `Characters:\n${characters}` : '',
    roughIdeas ? `Rough ideas / notes from the author:\n${roughIdeas.slice(0, 800)}` : '',
    storyboard ? `Storyboard so far (text only — you have not seen the sketches):\n${storyboard}` : '',
    '',
    'How to work with them:',
    '• Be concise. One strong specific note beats three vague ones.',
    '• Lead with craft: rhythm, specificity, emotion, image.',
    '• No pre-ambles ("Great question!", "Happy to help"). No meta-commentary.',
    "• Be honest. If something is weak, say so — then say why, then offer a direction.",
    '• When they paste manuscript text, edit for voice first, cleverness last.',
    '• Picture books live or die by the gap between the words and the picture. Respect that gap.',
    '• If they ask for options, give 2–3 labeled ones, not a paragraph.',
    '• You are working from a text digest of the storyboard — the sketches are not visible to you. If something hinges on the picture, say so and ask.',
    '',
    'You are a working collaborator, not an assistant. Act like one.',
  ]
    .filter(Boolean)
    .join('\n')
}

// ─── Storyboard digest ──────────────────────────────────────────────

const MANUSCRIPT_BUDGET = 300 // chars of manuscriptText per spread
const ART_BUDGET        = 200 // chars across all art-note fields per spread
const MAX_SPREADS       = 48  // hard cap on spreads included in the digest

function buildStoryboardDigest(spreads: StorySpread[]): string {
  if (spreads.length === 0) return ''

  const slice = spreads.slice(0, MAX_SPREADS)
  const lines: string[] = []

  for (const s of slice) {
    const head = `Spread ${s.spreadNumber} — ${s.pageLabel}${
      s.plotBeat?.trim() ? ` — "${truncate(s.plotBeat.trim(), 140)}"` : ''
    }${s.locked ? ' [locked]' : ''}${
      (s.sketches?.length ?? 0) > 0 ? ` [${s.sketches.length} sketch${s.sketches.length === 1 ? '' : 'es'}]` : ''
    }`
    lines.push(head)

    const manuscript = s.manuscriptText?.trim()
    if (manuscript) {
      lines.push(`  text: ${truncate(manuscript, MANUSCRIPT_BUDGET)}`)
    }

    const art = summarizeArtNotes(s.artNotes, ART_BUDGET)
    if (art) lines.push(`  art: ${art}`)
  }

  if (spreads.length > MAX_SPREADS) {
    lines.push(`… (+${spreads.length - MAX_SPREADS} more spreads omitted)`)
  }

  return lines.join('\n')
}

function summarizeArtNotes(
  notes: { characters: string; scene: string; designNotes: string; keyWords: string } | undefined,
  budget: number,
): string {
  if (!notes) return ''
  const parts: string[] = []
  if (notes.characters?.trim()) parts.push(`who: ${notes.characters.trim()}`)
  if (notes.scene?.trim())      parts.push(`scene: ${notes.scene.trim()}`)
  if (notes.designNotes?.trim()) parts.push(`design: ${notes.designNotes.trim()}`)
  if (notes.keyWords?.trim())   parts.push(`keywords: ${notes.keyWords.trim()}`)
  if (parts.length === 0) return ''
  return truncate(parts.join(' · '), budget)
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1).trimEnd() + '…'
}
