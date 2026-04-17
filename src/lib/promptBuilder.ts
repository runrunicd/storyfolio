import type { Character, ColorSwatch, IllustrationStyle, MoodKeyword } from '@/types'

const STYLE_PHRASES: Record<IllustrationStyle, string> = {
  'watercolor':        'soft watercolor illustration',
  'pencil-sketch':     'delicate pencil sketch',
  'gouache':           'opaque gouache painting',
  'ink-wash':          'expressive ink wash',
  'mixed-media':       'mixed media collage',
  'digital-painterly': 'digital painterly artwork',
}

// ─── Character-focused prompt ────────────────────────────────────

export interface PromptContext {
  character?: Character
  selectedSwatches: ColorSwatch[]
  selectedMoods: MoodKeyword[]
  illustrationStyle: IllustrationStyle
  extraContext?: string
}

export function buildPrompt(ctx: PromptContext): string {
  const parts: string[] = []

  if (ctx.character) {
    const visualLabels = ctx.character.visualTags.map((t) => t.label).join(', ')
    const charDesc = visualLabels
      ? `${ctx.character.name}, a ${ctx.character.species} with ${visualLabels}`
      : `${ctx.character.name}, a ${ctx.character.species}`
    parts.push(charDesc)
  }

  parts.push("illustrated children's book scene")
  parts.push(STYLE_PHRASES[ctx.illustrationStyle])

  const swatchNames = ctx.selectedSwatches.map((s) => s.name)
  if (swatchNames.length > 0) {
    parts.push(`color palette: ${swatchNames.join(', ')}`)
  }

  const moodLabels = ctx.selectedMoods.map((m) => m.label)
  if (moodLabels.length > 0) {
    parts.push(`${moodLabels.join(', ')} atmosphere`)
  }

  if (ctx.extraContext) {
    parts.push(ctx.extraContext)
  }

  return parts.join(', ') + ' --ar 4:3 --style raw --v 6.1'
}

// ─── Scene-focused prompt ─────────────────────────────────────────

export interface ScenePromptContext {
  sceneDescription: string    // artNotes.scene
  charactersInScene: string   // artNotes.characters
  designNotes: string         // artNotes.designNotes
  selectedSwatches: ColorSwatch[]
  selectedMoods: MoodKeyword[]
  illustrationStyle: IllustrationStyle
}

export function buildScenePrompt(
  ctx: ScenePromptContext,
  opts: { omitDefaultFlags?: boolean } = {}
): string {
  const parts: string[] = []

  if (ctx.charactersInScene.trim()) {
    parts.push(ctx.charactersInScene.trim())
  }

  if (ctx.sceneDescription.trim()) {
    parts.push(ctx.sceneDescription.trim())
  }

  parts.push("illustrated children's book spread")
  parts.push(STYLE_PHRASES[ctx.illustrationStyle])

  if (ctx.designNotes.trim()) {
    parts.push(ctx.designNotes.trim())
  }

  const swatchNames = ctx.selectedSwatches.map((s) => s.name)
  if (swatchNames.length > 0) {
    parts.push(`color palette: ${swatchNames.join(', ')}`)
  }

  const moodLabels = ctx.selectedMoods.map((m) => m.label)
  if (moodLabels.length > 0) {
    parts.push(`${moodLabels.join(', ')} atmosphere`)
  }

  const content = parts.join(', ')
  return opts.omitDefaultFlags ? content : content + ' --ar 16:9 --style raw --v 6.1'
}
