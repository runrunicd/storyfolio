import { useEffect, useState } from 'react'
import { useAppStore, useProjectStore } from '@/store'
import { Sidebar } from './Sidebar'
import { ProjectsView } from '@/components/projects/ProjectsView'
import { StoryView } from '@/components/story/StoryView'
import { DrawView } from '@/components/draw/DrawView'
import { PublishView } from '@/components/publish/PublishView'
import { SettingsModal } from '@/modals/SettingsModal'
import type { ViewId } from '@/types'
import type { ComponentType } from 'react'

const viewMap: Record<ViewId, ComponentType> = {
  dream:   StoryView,
  draw:    DrawView,
  publish: PublishView,
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

  const activeView = useAppStore((s) => s.activeView)
  const isSettingsOpen = useAppStore((s) => s.isSettingsOpen)
  const closeSettings = useAppStore((s) => s.closeSettings)
  const activeProjectId = useProjectStore((s) => s.activeProjectId)

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-cream-100">
        <p className="font-sans text-sm text-ink-500/30">Loading…</p>
      </div>
    )
  }

  const ActiveView = viewMap[activeView]

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
