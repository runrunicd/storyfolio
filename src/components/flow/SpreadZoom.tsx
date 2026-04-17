import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { StorySpread } from '@/types'

interface SpreadZoomProps {
  spread: StorySpread
  spreads: StorySpread[]
  onClose: () => void
  onNavigate: (id: string) => void
}

export function SpreadZoom({ spread, spreads, onClose, onNavigate }: SpreadZoomProps) {
  const idx = spreads.findIndex((s) => s.id === spread.id)
  const prev = idx > 0 ? spreads[idx - 1] : null
  const next = idx < spreads.length - 1 ? spreads[idx + 1] : null

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && prev) onNavigate(prev.id)
      if (e.key === 'ArrowRight' && next) onNavigate(next.id)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, prev, next, onNavigate])

  const isCover = spread.spreadNumber === 1
  const isEnd = spread.spreadNumber === 16

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 backdrop-blur-sm p-8">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-xl bg-cream-100 text-ink-700 hover:bg-cream-200 transition-colors font-sans text-sm shadow-medium"
      >
        ✕
      </button>

      {/* Prev */}
      {prev && (
        <button
          onClick={() => onNavigate(prev.id)}
          className="absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl bg-cream-100 text-ink-700 hover:bg-cream-200 transition-colors shadow-medium"
          title="Previous spread (←)"
        >
          ←
        </button>
      )}

      {/* Next */}
      {next && (
        <button
          onClick={() => onNavigate(next.id)}
          className="absolute right-5 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl bg-cream-100 text-ink-700 hover:bg-cream-200 transition-colors shadow-medium"
          title="Next spread (→)"
        >
          →
        </button>
      )}

      {/* Spread */}
      <div className="flex flex-col items-center gap-4 max-w-4xl w-full">
        {/* Double-page spread */}
        <div className="w-full bg-cream-100 rounded-2xl border border-cream-300 shadow-lifted overflow-hidden flex">
          {/* Left page */}
          <div className="flex-1 min-h-[400px] border-r border-cream-300 flex flex-col">
            {spread.sceneImageDataUrl ? (
              <img
                src={spread.sceneImageDataUrl}
                alt="Scene reference"
                className="w-full h-full object-cover flex-1"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
                {isCover || isEnd ? (
                  <svg viewBox="0 0 120 84" className="w-32 h-24 text-cream-300">
                    <rect x="1" y="1" width="118" height="82" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <line x1="1" y1="1" x2="119" y2="83" stroke="currentColor" strokeWidth="1.5" />
                    <line x1="119" y1="1" x2="1" y2="83" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                ) : (
                  <div className="text-center">
                    <p className="font-sans text-xs text-ink-500/30 mb-2">No scene image</p>
                    <p className="font-sans text-[10px] text-ink-500/20">Upload in Draw → Scenes</p>
                  </div>
                )}
                {spread.manuscriptText && (
                  <p className="font-serif text-base text-ink-700 leading-relaxed text-center max-w-xs">
                    {spread.manuscriptText}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right page */}
          <div className="flex-1 flex flex-col p-8 gap-4 min-h-[400px] justify-center">
            {spread.manuscriptText && !spread.sceneImageDataUrl && (
              <p className="font-serif text-sm text-ink-500/40 text-center">↖ story text left</p>
            )}
            {spread.manuscriptText && spread.sceneImageDataUrl && (
              <p className="font-serif text-lg text-ink-700 leading-relaxed">
                {spread.manuscriptText}
              </p>
            )}
            {spread.artNotes.scene && (
              <div className="mt-auto pt-4 border-t border-cream-300">
                <p className="font-sans text-[10px] text-ink-500/40 uppercase tracking-wide mb-1">Scene</p>
                <p className="font-sans text-xs text-ink-500/60 leading-relaxed">{spread.artNotes.scene}</p>
              </div>
            )}
            {spread.artNotes.characters && (
              <div>
                <p className="font-sans text-[10px] text-ink-500/40 uppercase tracking-wide mb-1">Characters</p>
                <p className="font-sans text-xs text-ink-500/60">{spread.artNotes.characters}</p>
              </div>
            )}
            {!spread.manuscriptText && !spread.artNotes.scene && (
              <p className="font-sans text-xs text-ink-500/20 text-center">Empty spread — add content in Dream</p>
            )}
          </div>
        </div>

        {/* Label and nav indicator */}
        <div className="flex items-center gap-6">
          {prev && (
            <p className="font-sans text-xs text-cream-200/60 truncate max-w-[140px]">
              ← {prev.spreadNumber === 1 ? 'Cover' : `Spread ${prev.spreadNumber}`}
            </p>
          )}
          <p className="font-sans text-sm text-cream-200 font-medium">
            {isCover ? 'Cover' : isEnd ? 'End' : `Spread ${spread.spreadNumber}`}
            <span className="text-cream-200/50 font-normal ml-2">{spread.pageLabel}</span>
          </p>
          {next && (
            <p className="font-sans text-xs text-cream-200/60 truncate max-w-[140px]">
              {next.spreadNumber === 16 ? 'End' : `Spread ${next.spreadNumber}`} →
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
