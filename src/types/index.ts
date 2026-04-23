export type ViewId = 'dream' | 'draw' | 'publish' | 'partner'

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

// ─── Creative Partner ────────────────────────────────────────────
//
// Project-level conversation between the user and their Creative Partner.
// Lives in usePartnerStore, keyed by projectId, persisted to IndexedDB.
// Travels with the project; exportable as Markdown.

export interface PartnerMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  /** True while the assistant message is mid-stream. */
  streaming?: boolean
  /** Set if the stream errored before finishing. */
  error?: string
  /**
   * Marks a user turn that includes the storyboard sketches as image context.
   * The images themselves are NOT persisted on the message — they're re-
   * attached from the project's storyFlow at send-time to keep IDB small.
   * The thread renders these messages as a distinct "shared storyboard" pill.
   */
  sharedStoryboard?: boolean
  /**
   * Snapshot of how many spreads were shared at the time of the click.
   * Shown in the thread pill; recorded so the UI stays accurate even if the
   * project's storyboard grows later.
   */
  sharedSpreadCount?: number
}

export interface PartnerThread {
  projectId: string
  messages: PartnerMessage[]
  createdAt: string
  updatedAt: string
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

export type AIProviderId = 'gemini' | 'anthropic' | 'openai' | 'kimi'

export interface AppSettings {
  /** Legacy Claude key kept for backward compatibility with v1 sketch/drawing flows. */
  claudeApiKey: string
  /** Gemini (Google AI Studio) key — used by the new default provider. */
  geminiApiKey: string
  /** OpenAI key — wired, provider stub not yet implemented. */
  openaiApiKey: string
  /** Kimi (Moonshot) key — wired, provider stub not yet implemented. */
  kimiApiKey: string
  /** Which provider the Creative Partner talks to. */
  aiProvider: AIProviderId
  /** Master switch for all AI surfaces. When false, the Partner tab is hidden. */
  aiEnabled: boolean
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
