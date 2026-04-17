export type ViewId = 'dream' | 'draw' | 'publish'

export type SpreadTemplate = 'full-bleed' | 'half-half' | 'inset-panel'

export type IllustrationStyle =
  | 'watercolor'
  | 'pencil-sketch'
  | 'gouache'
  | 'ink-wash'
  | 'mixed-media'
  | 'digital-painterly'

// ─── Dream (Story Creation) ──────────────────────────────────────

export interface ArtNotes {
  characters: string
  scene: string
  designNotes: string
  keyWords: string
}

export interface AIChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface SpreadSketch {
  id: string
  imageDataUrl: string
  label?: string       // optional version label, e.g. "rough", "refined", "final"
  createdAt: string
}

export interface StorySpread {
  id: string
  spreadNumber: number
  pageLabel: string
  plotBeat: string                   // one-sentence story beat: "what happens here"
  manuscriptText: string
  artNotes: ArtNotes
  sceneImageDataUrl: string | null   // reference image for Draw / scene builder
  sketches: SpreadSketch[]           // versioned hand-drawn sketches, newest last
  aiMessages: AIChatMessage[]
  locked: boolean                    // true = finalized; included in PDF exports
  createdAt: string
}

// ─── Characters ──────────────────────────────────────────────────

export interface CharacterTag {
  id: string
  type: 'personality' | 'visual'
  label: string
}

export interface Character {
  id: string
  name: string
  species: string
  role: 'main' | 'supporting' | 'background'
  personalityTags: CharacterTag[]
  visualTags: CharacterTag[]
  referenceImageDataUrl: string | null
  notes: string
  createdAt: string
}

// ─── Character References (Draw view) ───────────────────────────

export interface CharacterRef {
  id: string
  name: string
  imageDataUrl: string | null
  mjParams: string   // full MJ param string, e.g. "--cref URL --cw 100 --sref URL --ar 2:1 --v 6.0"
  createdAt: string
}

// ─── Drawings ────────────────────────────────────────────────────

export interface ClaudeFeedback {
  composition: string
  color: string
  style: string
  overallImpression: string
  suggestionsForRevision: string[]
  receivedAt: string
}

export interface Drawing {
  id: string
  title: string
  imageDataUrl: string
  claudeFeedback: ClaudeFeedback | null
  feedbackRequestedAt: string | null
  createdAt: string
}

// ─── Project ─────────────────────────────────────────────────────

export interface Project {
  id: string
  title: string
  roughIdeas: string
  storyFlow: StorySpread[]
  characters: Character[]
  characterRefs: CharacterRef[]
  drawings: Drawing[]
  statementLogline: string
  statementPov: string
  statementComparables: string
  statementMisc: string
  createdAt: string
  updatedAt: string
}

// ─── Layout spreads (Draw view) ──────────────────────────────────

export interface SpreadPage {
  id: string
  spreadId: string
  side: 'left' | 'right' | 'full'
  manuscriptText: string
  imageDataUrl: string | null
  caption: string
}

export interface Spread {
  id: string
  spreadNumber: number
  title: string
  template: SpreadTemplate
  pages: SpreadPage[]
  notes: string
  createdAt: string
}

// ─── Inspector ───────────────────────────────────────────────────

export interface ColorSwatch {
  id: string
  name: string
  hex: string
  selected: boolean
}

export interface MoodKeyword {
  id: string
  label: string
  selected: boolean
}

// ─── Settings ────────────────────────────────────────────────────

export interface AppSettings {
  claudeApiKey: string
}

// ─── Store shapes ────────────────────────────────────────────────

export interface InspectorState {
  colorSwatches: ColorSwatch[]
  moodKeywords: MoodKeyword[]
  illustrationStyle: IllustrationStyle
}

export interface AppState {
  activeView: ViewId
  activeProjectId: string | null
  isSettingsOpen: boolean
  settings: AppSettings
}
