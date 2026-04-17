import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AppState, ViewId } from '@/types'

interface AppStore extends AppState {
  setActiveView: (view: ViewId) => void
  setActiveProjectId: (id: string | null) => void
  openSettings: () => void
  closeSettings: () => void
  setApiKey: (key: string) => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      activeView: 'dream' as ViewId,
      activeProjectId: null,
      isSettingsOpen: false,
      settings: { claudeApiKey: '' },

      setActiveView: (view) => set({ activeView: view }),
      setActiveProjectId: (id) => set({ activeProjectId: id }),
      openSettings: () => set({ isSettingsOpen: true }),
      closeSettings: () => set({ isSettingsOpen: false }),
      setApiKey: (key) => set((s) => ({ settings: { ...s.settings, claudeApiKey: key } })),
    }),
    {
      name: 'fable_app',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ activeView: s.activeView, settings: s.settings }),
    }
  )
)
