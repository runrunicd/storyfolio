import { useState } from 'react'
import { useInspectorStore, useActiveProject, useAppStore } from '@/store'
import { buildPrompt } from '@/lib/promptBuilder'
import { ILLUSTRATION_STYLE_LABELS } from '@/lib/constants'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Swatch } from '@/components/ui/Swatch'
import { Pill } from '@/components/ui/Pill'
import type { IllustrationStyle } from '@/types'

export function Inspector() {
  const { colorSwatches, moodKeywords, illustrationStyle, toggleSwatch, toggleMoodKeyword, setIllustrationStyle } =
    useInspectorStore()
  const project = useActiveProject()
  const activeView = useAppStore((s) => s.activeView)
  const [copied, setCopied] = useState(false)

  const selectedSwatches = colorSwatches.filter((s) => s.selected)
  const selectedMoods = moodKeywords.filter((k) => k.selected)

  const firstCharacter = activeView === 'draw' ? project?.characters[0] : undefined

  const prompt = buildPrompt({
    character: firstCharacter,
    selectedSwatches,
    selectedMoods,
    illustrationStyle,
  })

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <aside className="w-[280px] h-screen overflow-y-auto bg-cream-200 border-l border-cream-300 flex flex-col scrollbar-thin">
      <div className="px-5 py-5 flex flex-col gap-6">
        <div>
          <p className="font-serif text-sm text-ink-700 mb-0.5">Inspector</p>
          <p className="font-sans text-xs text-ink-500/50">Shapes your Midjourney prompt</p>
        </div>

        {/* Color Palette */}
        <section>
          <SectionHeader title="Color Palette" />
          <div className="flex flex-wrap gap-2">
            {colorSwatches.map((sw) => (
              <Swatch key={sw.id} color={sw} onToggle={() => toggleSwatch(sw.id)} />
            ))}
          </div>
          {selectedSwatches.length > 0 && (
            <p className="mt-2 text-[10px] font-sans text-ink-500/50">
              {selectedSwatches.map((s) => s.name).join(', ')}
            </p>
          )}
        </section>

        {/* Mood Keywords */}
        <section>
          <SectionHeader title="Mood" />
          <div className="flex flex-wrap gap-1.5">
            {moodKeywords.map((kw) => (
              <Pill
                key={kw.id}
                label={kw.label}
                selected={kw.selected}
                type="mood"
                onToggle={() => toggleMoodKeyword(kw.id)}
              />
            ))}
          </div>
        </section>

        {/* Illustration Style */}
        <section>
          <SectionHeader title="Illustration Style" />
          <div className="flex flex-col gap-1">
            {(Object.keys(ILLUSTRATION_STYLE_LABELS) as IllustrationStyle[]).map((style) => (
              <button
                key={style}
                onClick={() => setIllustrationStyle(style)}
                className={[
                  'text-left px-3 py-1.5 rounded-lg text-xs font-sans transition-colors',
                  illustrationStyle === style
                    ? 'bg-ochre-500 text-white'
                    : 'text-ink-500 hover:bg-cream-300',
                ].join(' ')}
              >
                {ILLUSTRATION_STYLE_LABELS[style]}
              </button>
            ))}
          </div>
        </section>

        {/* Prompt Preview */}
        <section>
          <SectionHeader title="Midjourney Prompt" />
          <div className="bg-cream-100 rounded-xl border border-cream-300 p-3">
            <p className="font-sans text-xs text-ink-500 leading-relaxed break-words">
              {prompt}
            </p>
          </div>
          <button
            onClick={copyPrompt}
            className={[
              'mt-2 w-full py-2 rounded-xl text-xs font-sans font-medium transition-colors',
              copied
                ? 'bg-moss-500 text-white'
                : 'bg-cream-100 border border-cream-300 text-ink-500 hover:bg-cream-300',
            ].join(' ')}
          >
            {copied ? '✓ Copied!' : 'Copy Prompt'}
          </button>
        </section>
      </div>
    </aside>
  )
}
