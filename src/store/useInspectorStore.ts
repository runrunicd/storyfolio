import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import { DEFAULT_SWATCHES, DEFAULT_MOOD_KEYWORDS } from '@/lib/constants'
import type { ColorSwatch, IllustrationStyle, InspectorState } from '@/types'

interface InspectorStore extends InspectorState {
  toggleSwatch: (id: string) => void
  toggleMoodKeyword: (id: string) => void
  setIllustrationStyle: (style: IllustrationStyle) => void
  setSwatches: (colors: Array<{ name: string; hex: string }>) => void
  selectMoodsByLabel: (labels: string[]) => void
}

export const useInspectorStore = create<InspectorStore>()(
  persist(
    (set) => ({
      colorSwatches: DEFAULT_SWATCHES,
      moodKeywords: DEFAULT_MOOD_KEYWORDS,
      illustrationStyle: 'watercolor' as IllustrationStyle,

      toggleSwatch: (id) =>
        set((s) => ({
          colorSwatches: s.colorSwatches.map((sw) =>
            sw.id === id ? { ...sw, selected: !sw.selected } : sw
          ),
        })),

      toggleMoodKeyword: (id) =>
        set((s) => ({
          moodKeywords: s.moodKeywords.map((kw) =>
            kw.id === id ? { ...kw, selected: !kw.selected } : kw
          ),
        })),

      setIllustrationStyle: (style) => set({ illustrationStyle: style }),

      setSwatches: (colors) =>
        set({
          colorSwatches: colors.map((c): ColorSwatch => ({
            id: uuidv4(),
            name: c.name,
            hex: c.hex,
            selected: true,
          })),
        }),

      selectMoodsByLabel: (labels) =>
        set((s) => ({
          moodKeywords: s.moodKeywords.map((kw) => ({
            ...kw,
            selected: labels.includes(kw.label),
          })),
        })),
    }),
    {
      name: 'fable_inspector',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
