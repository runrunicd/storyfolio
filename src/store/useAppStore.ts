import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AIProviderId, AppSettings, AppState, ViewId } from '@/types'

interface AppStore extends AppState {
  setActiveView: (view: ViewId) => void
  setActiveProjectId: (id: string | null) => void
  openSettings: () => void
  closeSettings: () => void
  setApiKey: (key: string) => void
  setProviderKey: (provider: AIProviderId, key: string) => void
  setAiProvider: (provider: AIProviderId) => void
  setAiEnabled: (enabled: boolean) => void
}

const DEFAULT_SETTINGS: AppSettings = {
  claudeApiKey: '',
  geminiApiKey: '',
  openaiApiKey: '',
  kimiApiKey: '',
  aiProvider: 'gemini',
  aiEnabled: false,
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      activeView: 'dream' as ViewId,
      activeProjectId: null,
      isSettingsOpen: false,
      settings: DEFAULT_SETTINGS,

      setActiveView: (view) => set({ activeView: view }),
      setActiveProjectId: (id) => set({ activeProjectId: id }),
      openSettings: () => set({ isSettingsOpen: true }),
      closeSettings: () => set({ isSettingsOpen: false }),

      // Legacy single-key setter — now maps to Claude key so existing Settings UI keeps working.
      setApiKey: (key) => set((s) => ({ settings: { ...s.settings, claudeApiKey: key } })),

      setProviderKey: (provider, key) =>
        set((s) => {
          const field = (
            provider === 'gemini'    ? 'geminiApiKey'  :
            provider === 'anthropic' ? 'claudeApiKey'  :
            provider === 'openai'    ? 'openaiApiKey'  :
            /* kimi */                 'kimiApiKey'
          ) as keyof AppSettings
          return { settings: { ...s.settings, [field]: key } }
        }),

      setAiProvider: (provider) =>
        set((s) => ({ settings: { ...s.settings, aiProvider: provider } })),

      setAiEnabled: (enabled) =>
        set((s) => ({ settings: { ...s.settings, aiEnabled: enabled } })),
    }),
    {
      name: 'fable_app',
      storage: createJSONStorage(() => localStorage),
      // Merge persisted settings with current defaults so new fields get default values
      // on existing installs instead of becoming `undefined`.
      merge: (persisted, current) => {
        const p = persisted as Partial<AppStore> | undefined
        return {
          ...current,
          ...p,
          settings: { ...current.settings, ...(p?.settings ?? {}) },
        }
      },
      partialize: (s) => ({ activeView: s.activeView, settings: s.settings }),
    }
  )
)
