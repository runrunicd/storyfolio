import { Modal } from '@/components/ui/Modal'
import type { SpreadSuggestion } from '@/lib/manuscriptAnalyzer'

interface ManuscriptReviewModalProps {
  isOpen: boolean
  onClose: () => void
  suggestions: SpreadSuggestion[]
  existingSpreadCount: number
  onAccept: () => void
}

export function ManuscriptReviewModal({
  isOpen,
  onClose,
  suggestions,
  existingSpreadCount,
  onAccept,
}: ManuscriptReviewModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manuscript Analysis" width="max-w-3xl">
      <div className="flex flex-col">
        {/* Warning banner */}
        {existingSpreadCount > 0 && (
          <div className="mx-6 mt-5 mb-1 flex items-start gap-2 bg-ochre-500/10 border border-ochre-400/30 rounded-xl px-4 py-3">
            <span className="text-ochre-500 text-sm shrink-0 mt-0.5">⚠</span>
            <p className="font-sans text-xs text-ink-500 leading-relaxed">
              <strong className="text-ink-700">{existingSpreadCount} spread{existingSpreadCount !== 1 ? 's' : ''}</strong>
              {' '}already have content and will be replaced. This cannot be undone.
            </p>
          </div>
        )}

        {/* Spread suggestions */}
        <div className="px-6 py-5 flex flex-col gap-3">
          {suggestions.map((s) => (
            <div
              key={s.spreadNumber}
              className="bg-cream-200/60 border border-cream-300 rounded-xl px-4 py-3 flex flex-col gap-2"
            >
              {/* Header */}
              <div className="flex items-center gap-2">
                <span className="font-sans text-[10px] font-semibold text-ochre-600 bg-ochre-500/10 px-1.5 py-0.5 rounded-full">
                  Spread {s.spreadNumber}
                </span>
                {s.spreadNumber === 1 && (
                  <span className="font-sans text-[10px] text-ink-500/40">Cover</span>
                )}
                {s.spreadNumber === suggestions.length && (
                  <span className="font-sans text-[10px] text-ink-500/40">End</span>
                )}
              </div>

              {/* Story text */}
              {s.manuscriptText && (
                <p className="font-serif text-sm text-ink-700 leading-relaxed">
                  {s.manuscriptText}
                </p>
              )}

              {/* Art notes */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                {s.characters && (
                  <ArtNoteRow label="Characters" value={s.characters} />
                )}
                {s.scene && (
                  <ArtNoteRow label="Scene" value={s.scene} />
                )}
                {s.designNotes && (
                  <ArtNoteRow label="Design" value={s.designNotes} />
                )}
                {s.keyWords && (
                  <ArtNoteRow label="Key words" value={s.keyWords} />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-cream-100 border-t border-cream-300 px-6 py-4 flex items-center justify-between gap-3">
          <p className="font-sans text-xs text-ink-500/40">
            {suggestions.length} spread{suggestions.length !== 1 ? 's' : ''} suggested
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="font-sans text-sm px-4 py-2 rounded-xl border border-cream-300 text-ink-500 hover:bg-cream-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onAccept}
              className="font-sans text-sm px-4 py-2 rounded-xl bg-ochre-500 text-white hover:bg-ochre-600 transition-colors"
            >
              Replace all spreads →
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

function ArtNoteRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-sans text-[9px] text-ink-500/40 uppercase tracking-wide">{label}</span>
      <span className="font-sans text-xs text-ink-500/70 leading-snug">{value}</span>
    </div>
  )
}
