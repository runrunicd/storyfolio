import { useEffect, useState } from 'react'
import { useAppStore, useProjectStore, usePartnerStore } from '@/store'
import { Sidebar } from './Sidebar'
import { ProjectsView } from '@/components/projects/ProjectsView'
import { StoryView } from '@/components/story/StoryView'
import { DrawView } from '@/components/draw/DrawView'
import { PublishView } from '@/components/publish/PublishView'
import { PartnerView } from '@/components/partner/PartnerView'
import { SettingsModal } from '@/modals/SettingsModal'
import type { ViewId } from '@/types'
import type { ComponentType } from 'react'

const viewMap: Record<ViewId, ComponentType> = {
  dream:   StoryView,
  draw:    DrawView,
  publish: PublishView,
  partner: PartnerView,
}

export function AppShell() {
  const [hydrated, setHydrated] = useState(
    () => useProjectStore.persist.hasHydrated()
  )

  useEffect(() => {
    if (!hydrated) {
      return useProjectStore.persist.onFinishHydration(() => setHydrated(true))
    }
  }, [hydrated])

  // One-time migration: fold legacy per-spread `aiMessages[]` into the
  // Partner thread now that the Story view no longer has an inline chat.
  // `migrateSpreadChatsFor` is idempotent — it no-ops on projects it's
  // already processed — so running this on every hydration is safe.
  useEffect(() => {
    if (!hydrated) return
    const projects = useProjectStore.getState().projects
    const migrate  = usePartnerStore.getState().migrateSpreadChatsFor
    for (const project of projects) {
      migrate(project)
    }
  }, [hydrated])

  const activeView = useAppStore((s) => s.activeView)
  const aiEnabled = useAppStore((s) => s.settings.aiEnabled)
  const isSettingsOpen = useAppStore((s) => s.isSettingsOpen)
  const closeSettings = useAppStore((s) => s.closeSettings)
  const activeProjectId = useProjectStore((s) => s.activeProjectId)

  // Guard: if the user had Partner selected and then disabled AI, fall back to Story.
  const effectiveView: ViewId =
    activeView === 'partner' && !aiEnabled ? 'dream' : activeView

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-cream-100">
        <p className="font-sans text-sm text-ink-500/30">Loading…</p>
      </div>
    )
  }

  const ActiveView = viewMap[effectiveView]

  return (
    <div className="flex h-screen overflow-hidden bg-cream-100">
      {activeProjectId ? (
        <>
          <Sidebar />
          <main className="flex-1 overflow-hidden">
            <ActiveView />
          </main>
        </>
      ) : (
        <main className="flex-1 overflow-y-auto">
          <ProjectsView />
        </main>
      )}
      <SettingsModal isOpen={isSettingsOpen} onClose={closeSettings} />
    </div>
  )
}
