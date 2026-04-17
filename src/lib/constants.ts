import { v4 as uuidv4 } from 'uuid'
import type {
  Character,
  ColorSwatch,
  IllustrationStyle,
  MoodKeyword,
  Project,
  SpreadTemplate,
  StorySpread,
} from '@/types'

// ─── Story Flow helpers ──────────────────────────────────────────

function makePageLabel(spreadNumber: number, total: number = 17): string {
  if (spreadNumber === 1) return 'Cover'
  if (spreadNumber === total) return 'End'
  if (spreadNumber === 2) return 'pp. 1–3'       // front matter (blank)
  const left = (spreadNumber - 1) * 2            // spread 3 → pp. 4–5, spread 4 → pp. 6–7, …
  return `pp. ${left}–${left + 1}`
}

export function makeEmptySpread(spreadNumber: number): StorySpread {
  return {
    id: uuidv4(),
    spreadNumber,
    pageLabel: makePageLabel(spreadNumber),
    plotBeat: '',
    manuscriptText: '',
    artNotes: { characters: '', scene: '', designNotes: '', keyWords: '' },
    sceneImageDataUrl: null,
    sketches: [],
    aiMessages: [],
    locked: false,
    createdAt: new Date().toISOString(),
  }
}

export function makeEmptyStoryFlow(): StorySpread[] {
  return Array.from({ length: 17 }, (_, i) => makeEmptySpread(i + 1))
}

// ─── New project factory ─────────────────────────────────────────

export function createNewProject(title: string = 'Untitled Story'): Project {
  const flow = makeEmptyStoryFlow()
  // Cover spread gets the project title
  flow[0] = { ...flow[0], manuscriptText: title }
  return {
    id: uuidv4(),
    title,
    roughIdeas: '',
    storyFlow: flow,
    characters: [],
    characterRefs: [],
    drawings: [],
    statementLogline: '',
    statementPov: '',
    statementComparables: '',
    statementMisc: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// ─── Sample project ──────────────────────────────────────────────

const WREN_FLOW: StorySpread[] = [
  {
    ...makeEmptySpread(1),
    pageLabel: 'Cover',
    plotBeat: 'Title page — Wren and the Owl in the old oak.',
    manuscriptText: 'Wren and the Owl',
    sceneImageDataUrl: null,
    artNotes: {
      characters: 'Wren (small, speckled), The Owl (large, pale)',
      scene: 'The old oak tree at the edge of the meadow. Autumn. Golden light.',
      designNotes: 'Warm ochre and amber tones. Wren small in foreground, Owl silhouetted in hollow above.',
      keyWords: 'Title: Wren and the Owl',
    },
  },
  {
    ...makeEmptySpread(2),
    pageLabel: 'pp. 1–3',
    plotBeat: 'We meet Wren — small, bright-eyed, living in the old oak.',
    manuscriptText:
      'In the old oak tree at the edge of the meadow, there lived a little bird named Wren. She had speckled brown wings and the brightest eyes in the whole forest.',
    artNotes: {
      characters: 'Wren alone',
      scene: 'Old oak, meadow stretching below, morning mist. Golden hour.',
      designNotes: 'Warm light filtering through leaves. Sense of height and open space.',
      keyWords: '',
    },
  },
  {
    ...makeEmptySpread(3),
    pageLabel: 'pp. 4–5',
    plotBeat: 'Wren hears a mysterious hoot from the oldest hollow tree — the inciting moment.',
    manuscriptText:
      'One autumn evening, as the stars appeared one by one, Wren heard a sound she had never heard before — a low, soft hoot from the hollow of the oldest tree.',
    artNotes: {
      characters: 'Wren (small, nervous)',
      scene: "Twilight. The ancient hollow oak. Stars beginning to appear.",
      designNotes: 'Shift to blue-violet palette. Dramatic scale contrast. Warm glow from hollow.',
      keyWords: '',
    },
  },
  {
    ...makeEmptySpread(4),
    pageLabel: 'pp. 6–7',
    plotBeat: 'The Owl reveals he has been waiting for someone small enough to carry an important message.',
    manuscriptText:
      "Inside sat the Owl, with feathers like moonlight and eyes the colour of amber. 'I have been waiting,' said the Owl, 'for someone small enough to carry a very important message.'",
    artNotes: {
      characters: 'Owl (regal, still), Wren (looking up in awe)',
      scene: 'Interior of hollow tree. Amber candlelight feel.',
      designNotes: 'Warm glow inside vs cool dark outside. Owl fills the space. Wren tiny in doorway.',
      keyWords: '"I have been waiting."',
    },
  },
  ...Array.from({ length: 13 }, (_, i) => makeEmptySpread(i + 5)),
]

const WREN_CHARACTERS: Character[] = [
  {
    id: uuidv4(),
    name: 'Wren',
    species: 'wren bird',
    role: 'main',
    personalityTags: [
      { id: uuidv4(), type: 'personality', label: 'curious' },
      { id: uuidv4(), type: 'personality', label: 'brave' },
      { id: uuidv4(), type: 'personality', label: 'impulsive' },
      { id: uuidv4(), type: 'personality', label: 'warm-hearted' },
    ],
    visualTags: [
      { id: uuidv4(), type: 'visual', label: 'small' },
      { id: uuidv4(), type: 'visual', label: 'speckled brown wings' },
      { id: uuidv4(), type: 'visual', label: 'bright dark eyes' },
    ],
    referenceImageDataUrl: null,
    notes: 'Protagonist. Lives in the old oak at the meadow edge.',
    createdAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: 'The Owl',
    species: 'barn owl',
    role: 'supporting',
    personalityTags: [
      { id: uuidv4(), type: 'personality', label: 'wise' },
      { id: uuidv4(), type: 'personality', label: 'patient' },
      { id: uuidv4(), type: 'personality', label: 'gentle' },
    ],
    visualTags: [
      { id: uuidv4(), type: 'visual', label: 'pale feathers' },
      { id: uuidv4(), type: 'visual', label: 'amber eyes' },
      { id: uuidv4(), type: 'visual', label: 'large wingspan' },
    ],
    referenceImageDataUrl: null,
    notes: 'Wise mentor figure. Ancient. Speaks in riddles.',
    createdAt: new Date().toISOString(),
  },
]

export const SAMPLE_PROJECT: Project = {
  id: uuidv4(),
  title: 'Wren and the Owl',
  roughIdeas:
    'A small wren bird receives a mysterious message from the oldest owl in the forest. She must carry it across the meadow before the first snow falls — but the journey is farther than she imagined, and she has never flown alone.',
  storyFlow: WREN_FLOW,
  characters: WREN_CHARACTERS,
  characterRefs: [],
  drawings: [],
  statementLogline: '',
  statementPov: '',
  statementComparables: '',
  statementMisc: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// ─── Default Color Swatches ──────────────────────────────────────

export const DEFAULT_SWATCHES: ColorSwatch[] = [
  { id: 'swatch-1', name: 'Warm Cream',    hex: '#FAF7F2', selected: true  },
  { id: 'swatch-2', name: 'Ochre',         hex: '#C8913A', selected: true  },
  { id: 'swatch-3', name: 'Dusty Rose',    hex: '#D4A096', selected: false },
  { id: 'swatch-4', name: 'Moss Green',    hex: '#7A8C6E', selected: true  },
  { id: 'swatch-5', name: 'Midnight Blue', hex: '#2C3A5C', selected: false },
  { id: 'swatch-6', name: 'Soft Charcoal', hex: '#4A4540', selected: false },
  { id: 'swatch-7', name: 'Birch White',   hex: '#F0EBE1', selected: false },
]

export const DEFAULT_MOOD_KEYWORDS: MoodKeyword[] = [
  { id: 'mood-1',  label: 'cozy',        selected: true  },
  { id: 'mood-2',  label: 'wonder',      selected: true  },
  { id: 'mood-3',  label: 'melancholic', selected: false },
  { id: 'mood-4',  label: 'mysterious',  selected: false },
  { id: 'mood-5',  label: 'joyful',      selected: false },
  { id: 'mood-6',  label: 'quiet',       selected: true  },
  { id: 'mood-7',  label: 'whimsical',   selected: false },
  { id: 'mood-8',  label: 'tender',      selected: false },
  { id: 'mood-9',  label: 'eerie',       selected: false },
  { id: 'mood-10', label: 'hopeful',     selected: false },
]

export const ILLUSTRATION_STYLE_LABELS: Record<IllustrationStyle, string> = {
  'watercolor':        'Watercolor',
  'pencil-sketch':     'Pencil Sketch',
  'gouache':           'Gouache',
  'ink-wash':          'Ink Wash',
  'mixed-media':       'Mixed Media',
  'digital-painterly': 'Digital Painterly',
}

export const SPREAD_TEMPLATE_LABELS: Record<SpreadTemplate, string> = {
  'full-bleed':  'Full Bleed',
  'half-half':   'Half & Half',
  'inset-panel': 'Inset Panel',
}
