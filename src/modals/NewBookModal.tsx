import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { BOOK_TEMPLATES, DEFAULT_TEMPLATE_ID, type BookTemplate } from '@/lib/constants'

interface NewBookModalProps {
  isOpen: boolean
  onClose: () => void
  /** Called with the chosen template when the user confirms. */
  onConfirm: (template: BookTemplate, title: string) => void
}

/**
 * Picks a picture-book template (24 / 32 / 40 / 48-page) and a working
 * title. Shown when the user starts a new book from the bookshelf.
 * The user can change either later — title is editable in the Story
 * view; spreads can be added/removed with the ＋ and ✕ buttons.
 */
export function NewBookModal({ isOpen, onClose, onConfirm }: NewBookModalProps) {
  const [title, setTitle] = useState('')
  const [templateId, setTemplateId] = useState<string>(DEFAULT_TEMPLATE_ID)

  const handleConfirm = () => {
    const template = BOOK_TEMPLATES.find((t) => t.id === templateId) ?? BOOK_TEMPLATES[1]
    onConfirm(template, title.trim() || 'Untitled Story')
    // Reset draft state so the next open starts fresh.
    setTitle('')
    setTemplateId(DEFAULT_TEMPLATE_ID)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Start a new book" width="max-w-lg">
      <div className="p-6 flex flex-col gap-5">
        {/* Title */}
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-ink-500/70 font-sans font-medium mb-2">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirm()
            }}
            placeholder="Untitled Story"
            autoFocus
            className="w-full px-3 py-2.5 font-serif text-base text-ink-700 bg-cream-50 border border-cream-300 rounded-xl focus:outline-none focus:border-ochre-400 focus:bg-white placeholder:text-ink-500/30"
          />
          <p className="mt-1.5 font-sans text-[11px] text-ink-500/45">
            You can rename it any time.
          </p>
        </div>

        {/* Template picker */}
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-ink-500/70 font-sans font-medium mb-2">
            Length
          </label>
          <div className="flex flex-col gap-2">
            {BOOK_TEMPLATES.map((template) => {
              const selected = template.id === templateId
              return (
                <button
                  key={template.id}
                  onClick={() => setTemplateId(template.id)}
                  className={[
                    'w-full text-left px-4 py-3 rounded-xl border transition-all',
                    selected
                      ? 'border-ochre-400 bg-ochre-500/8 ring-1 ring-ochre-400'
                      : 'border-cream-300 bg-cream-50 hover:border-ochre-300 hover:bg-cream-200/50',
                  ].join(' ')}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className={['font-serif text-base', selected ? 'text-ochre-700' : 'text-ink-700'].join(' ')}>
                      {template.name}
                    </span>
                    <span className="font-sans text-[11px] text-ink-500/50 shrink-0">
                      {template.spreadCount} spreads
                    </span>
                  </div>
                  <p className="mt-0.5 font-sans text-xs text-ink-500/65 leading-snug">
                    {template.description}
                  </p>
                </button>
              )
            })}
          </div>
          <p className="mt-2 font-sans text-[11px] text-ink-500/45 leading-relaxed">
            Picture books are printed in signatures of 8 pages, so standard counts are multiples of 8. You can still add or remove spreads later.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-cream-300">
          <button
            onClick={onClose}
            className="px-4 py-2 font-sans text-sm text-ink-500 hover:text-ink-700 rounded-lg hover:bg-cream-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2 font-sans text-sm font-medium bg-ochre-500 text-white rounded-xl hover:bg-ochre-600 transition-colors shadow-soft"
          >
            Begin book
          </button>
        </div>
      </div>
    </Modal>
  )
}
