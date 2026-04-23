import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { idbStorage } from '@/lib/idbStorage'
import { v4 as uuidv4 } from 'uuid'
import { createNewProject, makeEmptySpread } from '@/lib/constants'
import type { SpreadSuggestion } from '@/lib/manuscriptAnalyzer'
import type {
  AIChatMessage,
  ArtNotes,
  Character,
  CharacterRef,
  CharacterTag,
  ClaudeFeedback,
  Drawing,
  Project,
  SpreadSketch,
  StorySpread,
} from '@/types'

// Renumber spreads after add/remove so spreadNumber and pageLabel stay consistent
function relabelFlow(spreads: StorySpread[]): StorySpread[] {
  const n = spreads.length
  return spreads.map((sp, idx) => {
    const num = idx + 1
    let label: string
    if (num === 1) label = 'Cover'
    else if (num === n) label = 'End'
    else if (num === 2) label = 'pp. 1–3'
    else { const left = (num - 1) * 2; label = `pp. ${left}–${left + 1}` }
    return { ...sp, spreadNumber: num, pageLabel: label }
  })
}

interface ProjectStore {
  projects: Project[]
  activeProjectId: string | null
  /**
   * One-shot flag so we only run the "remove the old bundled sample
   * project" cleanup once per install. Set to true after the first run.
   */
  sampleProjectRemoved?: boolean

  // Project management
  addProject: (title?: string) => string         // returns new project id
  duplicateProject: (id: string) => void
  deleteProject: (id: string) => void
  setActiveProject: (id: string | null) => void
  /**
   * Remove the seeded "Wren and the Owl" sample project that shipped
   * before we decided first-time users should land on an empty shelf.
   * Identified by title + the seed's roughIdeas prefix so we don't
   * nuke a legitimate project that happens to share the title.
   * Idempotent — only runs once per install.
   */
  removeBundledSample: () => void

  // Active project — title (cascades to cover spread)
  updateTitle: (title: string) => void
  updateRoughIdeas: (text: string) => void

  // Story flow (operates on active project)
  updateSpread: (spreadId: string, patch: Partial<StorySpread>) => void
  updateArtNotes: (spreadId: string, patch: Partial<ArtNotes>) => void
  addAiMessage: (spreadId: string, message: Omit<AIChatMessage, 'id' | 'createdAt'>) => void
  clearAiMessages: (spreadId: string) => void
  addSpread: () => void
  insertSpread: (atIndex: number) => void
  removeSpread: (spreadId: string) => void
  populateSpreads: (suggestions: SpreadSuggestion[]) => void
  toggleSpreadLock: (spreadId: string) => void
  restoreSpread: (spread: StorySpread, atIndex: number) => void

  // Characters
  addCharacter: () => void
  updateCharacter: (id: string, patch: Partial<Character>) => void
  deleteCharacter: (id: string) => void
  addTag: (characterId: string, type: 'personality' | 'visual', label: string) => void
  removeTag: (characterId: string, tagId: string) => void
  setCharacterImage: (characterId: string, dataUrl: string | null) => void

  // Character references
  addCharacterRef: (name: string, mjParams: string, imageDataUrl: string | null) => void
  updateCharacterRef: (id: string, patch: Partial<Pick<CharacterRef, 'name' | 'mjParams' | 'imageDataUrl'>>) => void
  deleteCharacterRef: (id: string) => void

  // Sketches (versioned per spread)
  addSketch: (spreadId: string, imageDataUrl: string) => void
  removeSketch: (spreadId: string, sketchId: string) => void
  renameSketch: (spreadId: string, sketchId: string, label: string) => void

  // Drawings
  addDrawing: (imageDataUrl: string, title: string) => void
  updateDrawing: (id: string, patch: Partial<Drawing>) => void
  deleteDrawing: (id: string) => void
  setDrawingFeedback: (drawingId: string, feedback: ClaudeFeedback) => void

  // Statement (Publish)
  updateStatement: (patch: Partial<Pick<Project, 'statementLogline' | 'statementPov' | 'statementComparables' | 'statementMisc'>>) => void
}

// Helper: patch the active project
function patchActive(
  projects: Project[],
  activeId: string | null,
  patcher: (p: Project) => Project
): Project[] {
  if (!activeId) return projects
  return projects.map((p) => (p.id === activeId ? { ...patcher(p), updatedAt: new Date().toISOString() } : p))
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],
      activeProjectId: null,
      sampleProjectRemoved: false,

      // ── Project management ────────────────────────────────────
      addProject: (title = 'Untitled Story') => {
        const project = createNewProject(title)
        set((s) => ({ projects: [...s.projects, project] }))
        return project.id
      },

      removeBundledSample: () => {
        const s = get()
        if (s.sampleProjectRemoved) return
        const WREN_PREFIX = 'A small wren bird receives'
        set({
          projects: s.projects.filter(
            (p) => !(p.title === 'Wren and the Owl' && p.roughIdeas.startsWith(WREN_PREFIX)),
          ),
          sampleProjectRemoved: true,
        })
      },

      duplicateProject: (id) => {
        const src = get().projects.find((p) => p.id === id)
        if (!src) return
        const copy: Project = {
          ...JSON.parse(JSON.stringify(src)),
          id: uuidv4(),
          title: `${src.title} (copy)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        // Regenerate all ids in the copy
        copy.storyFlow = copy.storyFlow.map((s) => ({ ...s, id: uuidv4(), aiMessages: [] }))
        copy.characters = copy.characters.map((c) => ({ ...c, id: uuidv4() }))
        set((s) => ({ projects: [...s.projects, copy] }))
      },

      deleteProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          activeProjectId: s.activeProjectId === id ? null : s.activeProjectId,
        })),

      setActiveProject: (id) => set({ activeProjectId: id }),

      // ── Active project ────────────────────────────────────────

      // Title change cascades to the cover spread's manuscript text
      // if the cover spread text still matches the old title
      updateTitle: (title) =>
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => {
            const oldTitle = p.title
            const newFlow = p.storyFlow.map((sp) =>
              sp.spreadNumber === 1 && sp.manuscriptText === oldTitle
                ? { ...sp, manuscriptText: title }
                : sp
            )
            return { ...p, title, storyFlow: newFlow }
          }),
        })),

      updateRoughIdeas: (text) =>
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => ({ ...p, roughIdeas: text })),
        })),

      // ── Story flow ────────────────────────────────────────────
      updateSpread: (spreadId, patch) =>
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => ({
            ...p,
            storyFlow: p.storyFlow.map((sp) => (sp.id === spreadId ? { ...sp, ...patch } : sp)),
          })),
        })),

      updateArtNotes: (spreadId, patch) =>
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => ({
            ...p,
            storyFlow: p.storyFlow.map((sp) =>
              sp.id === spreadId ? { ...sp, artNotes: { ...sp.artNotes, ...patch } } : sp
            ),
          })),
        })),

      addAiMessage: (spreadId, message) => {
        const newMessage: AIChatMessage = {
          id: uuidv4(),
          ...message,
          createdAt: new Date().toISOString(),
        }
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => ({
            ...p,
            storyFlow: p.storyFlow.map((sp) =>
              sp.id === spreadId ? { ...sp, aiMessages: [...sp.aiMessages, newMessage] } : sp
            ),
          })),
        }))
      },

      clearAiMessages: (spreadId) =>
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => ({
            ...p,
            storyFlow: p.storyFlow.map((sp) =>
              sp.id === spreadId ? { ...sp, aiMessages: [] } : sp
            ),
          })),
        })),

      addSpread: () =>
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => {
            const newSpread = makeEmptySpread(p.storyFlow.length + 1)
            return { ...p, storyFlow: relabelFlow([...p.storyFlow, newSpread]) }
          }),
        })),

      insertSpread: (atIndex) =>
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => {
            const newSpread = makeEmptySpread(atIndex + 1)
            const next = [...p.storyFlow]
            next.splice(atIndex, 0, newSpread)
            return { ...p, storyFlow: relabelFlow(next) }
          }),
        })),

      removeSpread: (spreadId) =>
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => {
            if (p.storyFlow.length <= 1) return p
            return { ...p, storyFlow: relabelFlow(p.storyFlow.filter((sp) => sp.id !== spreadId)) }
          }),
        })),

      populateSpreads: (suggestions) =>
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => ({
            ...p,
            storyFlow: p.storyFlow.map((sp) => {
              const match = suggestions.find((sg) => sg.spreadNumber === sp.spreadNumber)
              if (!match) return sp
              return {
                ...sp,
                manuscriptText: match.manuscriptText,
                artNotes: {
                  characters: match.characters,
                  scene: match.scene,
                  designNotes: match.designNotes,
                  keyWords: match.keyWords,
                },
              }
            }),
          })),
        })),

      restoreSpread: (spread, atIndex) =>
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => {
            const next = [...p.storyFlow]
            next.splice(atIndex, 0, spread)
            return { ...p, storyFlow: relabelFlow(next) }
          }),
        })),

      toggleSpreadLock: (spreadId) =>
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => ({
            ...p,
            storyFlow: p.storyFlow.map((sp) =>
              sp.id === spreadId ? { ...sp, locked: !sp.locked } : sp
            ),
          })),
        })),

      // ── Sketches ──────────────────────────────────────────────
      addSketch: (spreadId, imageDataUrl) =>
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => ({
            ...p,
            storyFlow: p.storyFlow.map((sp) =>
              sp.id === spreadId
                ? {
                    ...sp,
                    sketches: [
                      ...(sp.sketches ?? []),
                      {
                        id: uuidv4(),
                        imageDataUrl,
                        createdAt: new Date().toISOString(),
                      } satisfies SpreadSketch,
                    ],
                  }
                : sp
            ),
          })),
        })),

      removeSketch: (spreadId, sketchId) =>
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => ({
            ...p,
            storyFlow: p.storyFlow.map((sp) =>
              sp.id === spreadId
                ? { ...sp, sketches: (sp.sketches ?? []).filter((sk) => sk.id !== sketchId) }
                : sp
            ),
          })),
        })),

      renameSketch: (spreadId, sketchId, label) =>
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => ({
            ...p,
            storyFlow: p.storyFlow.map((sp) =>
              sp.id === spreadId
                ? {
                    ...sp,
                    sketches: (sp.sketches ?? []).map((sk) =>
                      sk.id === sketchId ? { ...sk, label } : sk
                    ),
                  }
                : sp
            ),
          })),
        })),

      // ── Characters ────────────────────────────────────────────
      addCharacter: () =>
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => ({
            ...p,
            characters: [
              ...p.characters,
              {
                id: uuidv4(),
                name: 'New Character',
                species: '',
                role: 'supporting' as const,
                personalityTags: [],
                visualTags: [],
                referenceImageDataUrl: null,
                notes: '',
                createdAt: new Date().toISOString(),
              },
            ],
          })),
        })),

      updateCharacter: (id, patch) =>
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => ({
            ...p,
            characters: p.characters.map((c) => (c.id === id ? { ...c, ...patch } : c)),
          })),
        })),

      deleteCharacter: (id) =>
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => ({
            ...p,
            characters: p.characters.filter((c) => c.id !== id),
          })),
        })),

      addTag: (characterId, type, label) => {
        const trimmed = label.trim()
        if (!trimmed) return
        const newTag: CharacterTag = { id: uuidv4(), type, label: trimmed }
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => ({
            ...p,
            characters: p.characters.map((c) => {
              if (c.id !== characterId) return c
              if (type === 'personality') return { ...c, personalityTags: [...c.personalityTags, newTag] }
              return { ...c, visualTags: [...c.visualTags, newTag] }
            }),
          })),
        }))
      },

      removeTag: (characterId, tagId) =>
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => ({
            ...p,
            characters: p.characters.map((c) => {
              if (c.id !== characterId) return c
              return {
                ...c,
                personalityTags: c.personalityTags.filter((t) => t.id !== tagId),
                visualTags: c.visualTags.filter((t) => t.id !== tagId),
              }
            }),
          })),
        })),

      setCharacterImage: (characterId, dataUrl) =>
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => ({
            ...p,
            characters: p.characters.map((c) =>
              c.id === characterId ? { ...c, referenceImageDataUrl: dataUrl } : c
            ),
          })),
        })),

      // ── Character references ──────────────────────────────────
      addCharacterRef: (name, mjParams, imageDataUrl) =>
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => ({
            ...p,
            characterRefs: [
              ...(p.characterRefs ?? []),
              {
                id: uuidv4(),
                name,
                mjParams,
                imageDataUrl,
                createdAt: new Date().toISOString(),
              } satisfies CharacterRef,
            ],
          })),
        })),

      updateCharacterRef: (id, patch) =>
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => ({
            ...p,
            characterRefs: (p.characterRefs ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
          })),
        })),

      deleteCharacterRef: (id) =>
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => ({
            ...p,
            characterRefs: (p.characterRefs ?? []).filter((r) => r.id !== id),
          })),
        })),

      // ── Drawings ─────────────────────────────────────────────
      addDrawing: (imageDataUrl, title) =>
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => ({
            ...p,
            drawings: [
              ...p.drawings,
              {
                id: uuidv4(),
                title,
                imageDataUrl,
                claudeFeedback: null,
                feedbackRequestedAt: null,
                createdAt: new Date().toISOString(),
              },
            ],
          })),
        })),

      updateDrawing: (id, patch) =>
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => ({
            ...p,
            drawings: p.drawings.map((d) => (d.id === id ? { ...d, ...patch } : d)),
          })),
        })),

      deleteDrawing: (id) =>
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => ({
            ...p,
            drawings: p.drawings.filter((d) => d.id !== id),
          })),
        })),

      setDrawingFeedback: (drawingId, feedback) =>
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => ({
            ...p,
            drawings: p.drawings.map((d) =>
              d.id === drawingId
                ? { ...d, claudeFeedback: feedback, feedbackRequestedAt: new Date().toISOString() }
                : d
            ),
          })),
        })),

      // ── Statement (Publish) ───────────────────────────────────
      updateStatement: (patch) =>
        set((s) => ({
          projects: patchActive(s.projects, s.activeProjectId, (p) => ({ ...p, ...patch })),
        })),
    }),
    {
      name: 'fable_projects',
      storage: idbStorage,
    }
  )
)

// ─── Selector helpers ─────────────────────────────────────────────

export function useActiveProject(): Project | undefined {
  return useProjectStore((s) =>
    s.projects.find((p) => p.id === s.activeProjectId)
  )
}
