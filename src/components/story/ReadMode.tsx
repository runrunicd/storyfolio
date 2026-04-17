import { useEffect, useState } from 'react'
import type { StorySpread } from '@/types'

interface ReadModeProps {
  spreads: StorySpread[]
  startIndex: number
  onClose: () => void
}

export function ReadMode({ spreads, startIndex, onClose }: ReadModeProps) {
  const [idx, setIdx] = useState(startIndex)

  const spread = spreads[idx]
  const isFirst = idx === 0
  const isLast = idx === spreads.length - 1
  const latestSketch = spread.sketches.at(-1) ?? null
  const displayImage = latestSketch?.imageDataUrl ?? spread.sceneImageDataUrl ?? null

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     onClose()
      if (e.key === 'ArrowLeft')  setIdx(i => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setIdx(i => Math.min(spreads.length - 1, i + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, spreads.length])

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/95 flex flex-col items-center justify-center select-none">

      {/* Page label */}
      <p className="absolute top-5 left-1/2 -translate-x-1/2 font-sans text-xs text-white/30 tracking-widest uppercase">
        {spread.pageLabel}
      </p>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-5 z-10 font-sans text-xl text-white/30 hover:text-white/70 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
      >
        ×
      </button>

      {/* Main content */}
      <div className="relative w-full max-w-5xl px-16 flex flex-col items-center gap-8">

        {/* Book spread */}
        <div className="relative w-full aspect-[2/1.4] rounded-xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.6)] bg-cream-50">

          {/* Left click zone — prev */}
          <button
            onClick={() => !isFirst && setIdx(i => i - 1)}
            disabled={isFirst}
            aria-label="Previous spread"
            className="absolute inset-y-0 left-0 w-1/3 z-10 cursor-w-resize disabled:cursor-default group/prev"
          >
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white/0 group-hover/prev:text-white/60 bg-black/0 group-hover/prev:bg-black/20 transition-all duration-150 text-2xl font-thin">
              ‹
            </div>
          </button>

          {/* Right click zone — next */}
          <button
            onClick={() => !isLast && setIdx(i => i + 1)}
            disabled={isLast}
            aria-label="Next spread"
            className="absolute inset-y-0 right-0 w-1/3 z-10 cursor-e-resize disabled:cursor-default group/next"
          >
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white/0 group-hover/next:text-white/60 bg-black/0 group-hover/next:bg-black/20 transition-all duration-150 text-2xl font-thin">
              ›
            </div>
          </button>

          {/* Spine line */}
          <div className="absolute inset-y-0 left-1/2 w-px bg-cream-300 z-0" />

          {/* Image or placeholder */}
          {displayImage ? (
            <img
              key={spread.id}
              src={displayImage}
              alt=""
              className="w-full h-full object-contain animate-in fade-in duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-cream-100">
              <svg viewBox="0 0 80 56" className="w-16 h-16 text-cream-300">
                <rect x="2" y="2" width="76" height="52" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <line x1="2" y1="2" x2="78" y2="54" stroke="currentColor" strokeWidth="1.5" />
                <line x1="78" y1="2" x2="2" y2="54" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <p className="font-sans text-xs text-ink-500/30">No image yet</p>
            </div>
          )}
        </div>

        {/* Manuscript text */}
        {spread.manuscriptText && (
          <p className="max-w-xl text-center font-serif text-lg text-cream-200 leading-relaxed px-4">
            {spread.manuscriptText}
          </p>
        )}
      </div>

      {/* Standalone prev arrow */}
      <button
        onClick={() => setIdx(i => Math.max(0, i - 1))}
        disabled={isFirst}
        className="absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-white/10 text-white/30 hover:border-white/30 hover:text-white/70 hover:bg-white/5 transition-all duration-150 disabled:opacity-20 flex items-center justify-center text-lg"
      >
        ←
      </button>

      {/* Standalone next arrow */}
      <button
        onClick={() => setIdx(i => Math.min(spreads.length - 1, i + 1))}
        disabled={isLast}
        className="absolute right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-white/10 text-white/30 hover:border-white/30 hover:text-white/70 hover:bg-white/5 transition-all duration-150 disabled:opacity-20 flex items-center justify-center text-lg"
      >
        →
      </button>

      {/* Progress dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        {spreads.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={[
              'rounded-full transition-all duration-200',
              i === idx
                ? 'w-4 h-1.5 bg-ochre-400'
                : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40',
            ].join(' ')}
          />
        ))}
      </div>

    </div>
  )
}
