import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import { idbStorage } from '@/lib/idbStorage'
import type { PartnerMessage, PartnerThread, Project } from '@/types'

/**
 * Creative Partner conversation store.
 *
 * One thread per project. Threads are durable — they persist across refreshes,
 * travel with the project, and are never auto-cleared. Users must explicitly
 * clear (with confirmation) via the Partner UI.
 *
 * Streaming flow:
 *   1. appendUserMessage(projectId, content)
 *   2. startAssistantMessage(projectId) → returns messageId, flagged streaming:true
 *   3. appendToAssistantMessage(..., delta) on every chunk
 *   4. finishAssistantMessage(..., error?) clears streaming flag
 */

interface PartnerStore {
  threadsByProject: Record<string, PartnerThread>
  /**
   * Project ids whose legacy per-spread `aiMessages[]` have already been
   * folded into the Partner thread. Guards against re-migrating — migration
   * is idempotent and destructive-free, but we don't want to prepend the
   * same folded block on every mount.
   */
  migratedProjects: string[]
  /**
   * Project ids where the user has confirmed that "Share storyboard" will
   * attach sketches as image context (and cost more tokens). One-time ack
   * per project: subsequent clicks skip the confirm dialog.
   */
  storyboardSharedAck: string[]

  /** Returns the new user message's id. */
  appendUserMessage: (projectId: string, content: string) => string
  /**
   * Append a user message that represents a "Share storyboard" click.
   * The images themselves are not stored — the send path re-attaches them
   * from the project at request time. Returns the new message's id.
   */
  appendStoryboardShare: (projectId: string, content: string, sharedSpreadCount: number) => string
  /** Creates an empty assistant message flagged streaming. Returns its id. */
  startAssistantMessage: (projectId: string) => string
  /** Appends to the specified assistant message's content. */
  appendToAssistantMessage: (projectId: string, messageId: string, delta: string) => void
  /** Marks the assistant message as done (optionally with an error). */
  finishAssistantMessage: (projectId: string, messageId: string, error?: string) => void
  /** Wipes the thread for a project — should be confirmed before calling. */
  clearThread: (projectId: string) => void
  /** Synchronous thread getter (useful outside components). */
  getThread: (projectId: string) => PartnerThread | undefined
  /**
   * One-time migration: fold any legacy per-spread `aiMessages` on the
   * project into the Partner thread, prefixing user turns with `[Spread N]`.
   * Idempotent — returns 0 if already migrated or nothing to fold.
   */
  migrateSpreadChatsFor: (project: Project) => number
  /** Whether the user has acked "Share storyboard" for this project. */
  hasStoryboardAck: (projectId: string) => boolean
  /** Mark this project as acked so future shares skip the confirm dialog. */
  setStoryboardAck: (projectId: string) => void
}

function ensureThread(
  threads: Record<string, PartnerThread>,
  projectId: string
): PartnerThread {
  const existing = threads[projectId]
  if (existing) return existing
  const now = new Date().toISOString()
  return { projectId, messages: [], createdAt: now, updatedAt: now }
}

export const usePartnerStore = create<PartnerStore>()(
  persist(
    (set, get) => ({
      threadsByProject: {},
      migratedProjects: [],
      storyboardSharedAck: [],

      appendUserMessage: (projectId, content) => {
        const id = uuidv4()
        const now = new Date().toISOString()
        const message: PartnerMessage = { id, role: 'user', content, createdAt: now }
        set((s) => {
          const thread = ensureThread(s.threadsByProject, projectId)
          return {
            threadsByProject: {
              ...s.threadsByProject,
              [projectId]: {
                ...thread,
                messages: [...thread.messages, message],
                updatedAt: now,
              },
            },
          }
        })
        return id
      },

      appendStoryboardShare: (projectId, content, sharedSpreadCount) => {
        const id = uuidv4()
        const now = new Date().toISOString()
        const message: PartnerMessage = {
          id,
          role: 'user',
          content,
          createdAt: now,
          sharedStoryboard: true,
          sharedSpreadCount,
        }
        set((s) => {
          const thread = ensureThread(s.threadsByProject, projectId)
          return {
            threadsByProject: {
              ...s.threadsByProject,
              [projectId]: {
                ...thread,
                messages: [...thread.messages, message],
                updatedAt: now,
              },
            },
          }
        })
        return id
      },

      startAssistantMessage: (projectId) => {
        const id = uuidv4()
        const now = new Date().toISOString()
        const message: PartnerMessage = {
          id,
          role: 'assistant',
          content: '',
          createdAt: now,
          streaming: true,
        }
        set((s) => {
          const thread = ensureThread(s.threadsByProject, projectId)
          return {
            threadsByProject: {
              ...s.threadsByProject,
              [projectId]: {
                ...thread,
                messages: [...thread.messages, message],
                updatedAt: now,
              },
            },
          }
        })
        return id
      },

      appendToAssistantMessage: (projectId, messageId, delta) => {
        set((s) => {
          const thread = s.threadsByProject[projectId]
          if (!thread) return s
          return {
            threadsByProject: {
              ...s.threadsByProject,
              [projectId]: {
                ...thread,
                messages: thread.messages.map((m) =>
                  m.id === messageId ? { ...m, content: m.content + delta } : m
                ),
              },
            },
          }
        })
      },

      finishAssistantMessage: (projectId, messageId, error) => {
        const now = new Date().toISOString()
        set((s) => {
          const thread = s.threadsByProject[projectId]
          if (!thread) return s
          return {
            threadsByProject: {
              ...s.threadsByProject,
              [projectId]: {
                ...thread,
                messages: thread.messages.map((m) =>
                  m.id === messageId ? { ...m, streaming: false, error } : m
                ),
                updatedAt: now,
              },
            },
          }
        })
      },

      clearThread: (projectId) => {
        set((s) => {
          const next = { ...s.threadsByProject }
          delete next[projectId]
          return { threadsByProject: next }
        })
      },

      getThread: (projectId) => get().threadsByProject[projectId],

      hasStoryboardAck: (projectId) => get().storyboardSharedAck.includes(projectId),

      setStoryboardAck: (projectId) => {
        set((s) =>
          s.storyboardSharedAck.includes(projectId)
            ? s
            : { storyboardSharedAck: [...s.storyboardSharedAck, projectId] }
        )
      },

      migrateSpreadChatsFor: (project) => {
        const state = get()
        if (state.migratedProjects.includes(project.id)) return 0

        // Collect every legacy per-spread message, tagged with its spread.
        type Tagged = {
          role: 'user' | 'assistant'
          content: string
          createdAt: string
          spreadNumber: number
          pageLabel: string
        }
        const tagged: Tagged[] = []
        for (const spread of project.storyFlow ?? []) {
          for (const m of spread.aiMessages ?? []) {
            tagged.push({
              role: m.role,
              content: m.content,
              createdAt: m.createdAt,
              spreadNumber: spread.spreadNumber,
              pageLabel: spread.pageLabel,
            })
          }
        }

        // Nothing to migrate — still mark as done so we skip next mount.
        if (tagged.length === 0) {
          set((s) => ({
            migratedProjects: s.migratedProjects.includes(project.id)
              ? s.migratedProjects
              : [...s.migratedProjects, project.id],
          }))
          return 0
        }

        // Chronological order — legacy chats happened before Partner existed.
        tagged.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

        const folded: PartnerMessage[] = tagged.map((t) => {
          const prefix = `[Spread ${t.spreadNumber} — ${t.pageLabel}] `
          // Only tag user turns; assistant replies are easier to read raw,
          // and the preceding user turn gives them context.
          const content = t.role === 'user' ? `${prefix}${t.content}` : t.content
          return {
            id: uuidv4(),
            role: t.role,
            content,
            createdAt: t.createdAt,
          }
        })

        // Bookend so the user can tell where the fold happened.
        const now = new Date().toISOString()
        const header: PartnerMessage = {
          id: uuidv4(),
          role: 'assistant',
          content:
            `— Folded in ${folded.length} message${folded.length === 1 ? '' : 's'} ` +
            `from the old per-spread co-creator. User turns are tagged with their spread. —`,
          createdAt: tagged[0].createdAt,
        }

        set((s) => {
          const existing = ensureThread(s.threadsByProject, project.id)
          return {
            threadsByProject: {
              ...s.threadsByProject,
              [project.id]: {
                ...existing,
                // Prepend the folded block so current Partner conversation
                // (if any) stays at the bottom where the user left it.
                messages: [header, ...folded, ...existing.messages],
                updatedAt: now,
              },
            },
            migratedProjects: s.migratedProjects.includes(project.id)
              ? s.migratedProjects
              : [...s.migratedProjects, project.id],
          }
        })

        return folded.length
      },
    }),
    {
      name: 'storyfolio_partner_threads',
      storage: idbStorage,
    }
  )
)

/** Selector helper: returns the thread for a given projectId, or undefined. */
export function usePartnerThread(projectId: string | null): PartnerThread | undefined {
  return usePartnerStore((s) =>
    projectId ? s.threadsByProject[projectId] : undefined
  )
}
