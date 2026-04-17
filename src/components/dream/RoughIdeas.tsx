import { useState } from 'react'
import { useProjectStore } from '@/store'
import { ManuscriptUpload } from '@/components/story/ManuscriptUpload'
import { ManuscriptReviewModal } from '@/components/story/ManuscriptReviewModal'
import type { SpreadSuggestion } from '@/lib/manuscriptAnalyzer'
import type { Project } from '@/types'

interface RoughIdeasProps {
  project: Project
}

export function RoughIdeas({ project }: RoughIdeasProps) {
  const { updateTitle, updateRoughIdeas, populateSpreads } = useProjectStore()
  const [open, setOpen] = useState(true)
  const [pendingSuggestions, setPendingSuggestions] = useState<SpreadSuggestion[] | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)

  const existingSpreadCount = project.storyFlow.filter((s) => s.manuscriptText).length

  return (
    <div className="bg-cream-200 rounded-2xl border border-cream-300 shadow-soft overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-cream-300/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-ochre-500 text-sm">✦</span>
          <span className="font-serif text-sm text-ink-700">Project Synopsis</span>
          {!open && project.roughIdeas && (
            <span className="font-sans text-xs text-ink-500/50 truncate max-w-xs">
              {project.roughIdeas.slice(0, 60)}…
            </span>
          )}
        </div>
        <span className={`text-ink-500/40 text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {open && (
        <div className="px-5 pb-5 flex flex-col gap-3 border-t border-cream-300">
          <input
            value={project.title}
            onChange={(e) => updateTitle(e.target.value)}
            className="mt-4 font-serif text-2xl text-ink-700 bg-transparent focus:outline-none border-b border-dashed border-cream-400 focus:border-ochre-400 pb-1 w-full"
            placeholder="Story title"
          />
          <textarea
            value={project.roughIdeas}
            onChange={(e) => updateRoughIdeas(e.target.value)}
            placeholder="Your rough ideas, premise, themes, the emotional heart of the story…"
            rows={4}
            className="w-full resize-none font-sans text-sm text-ink-500 bg-cream-100 border border-cream-300 rounded-xl px-3 py-2.5 placeholder:text-ink-500/30 focus:outline-none focus:ring-2 focus:ring-ochre-400/50 focus:border-ochre-400 transition-colors"
          />

          <ManuscriptUpload
            spreadCount={project.storyFlow.length}
            onSuggestionsReady={(suggestions) => {
              setPendingSuggestions(suggestions)
              setReviewOpen(true)
            }}
          />
        </div>
      )}

      {pendingSuggestions && (
        <ManuscriptReviewModal
          isOpen={reviewOpen}
          onClose={() => setReviewOpen(false)}
          suggestions={pendingSuggestions}
          existingSpreadCount={existingSpreadCount}
          onAccept={() => {
            populateSpreads(pendingSuggestions)
            setReviewOpen(false)
            setPendingSuggestions(null)
          }}
        />
      )}
    </div>
  )
}
