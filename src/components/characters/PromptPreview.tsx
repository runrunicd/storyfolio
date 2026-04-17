import { useState } from 'react'
import { useActiveProject, useInspectorStore } from '@/store'
import { buildPrompt } from '@/lib/promptBuilder'

interface PromptPreviewProps {
  characterId: string
}

export function PromptPreview({ characterId }: PromptPreviewProps) {
  const project = useActiveProject()
  const character = project?.characters.find((c) => c.id === characterId)
  const { colorSwatches, moodKeywords, illustrationStyle } = useInspectorStore()
  const [copied, setCopied] = useState(false)

  const selectedSwatches = colorSwatches.filter((s) => s.selected)
  const selectedMoods = moodKeywords.filter((k) => k.selected)

  const prompt = buildPrompt({ character, selectedSwatches, selectedMoods, illustrationStyle })

  const copy = async () => {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mt-4 pt-4 border-t border-cream-300">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-sans font-medium text-ink-500/60 uppercase tracking-wide">
          Midjourney Prompt
        </p>
        <button
          onClick={copy}
          className={[
            'text-xs px-2.5 py-1 rounded-lg font-sans transition-colors',
            copied ? 'bg-moss-500 text-white' : 'bg-cream-300 text-ink-500 hover:bg-cream-400',
          ].join(' ')}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <div className="bg-cream-100 rounded-xl border border-cream-300 p-3">
        <p className="font-sans text-xs text-ink-500 leading-relaxed break-words">{prompt}</p>
      </div>
      <p className="mt-1.5 text-[10px] font-sans text-ink-500/40">
        Adjust palette, mood &amp; style in the Inspector →
      </p>
    </div>
  )
}
