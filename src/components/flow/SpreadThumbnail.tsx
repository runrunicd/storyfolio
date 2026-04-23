import type { StorySpread } from '@/types'

interface SpreadThumbnailProps {
  spread: StorySpread
  onClick: () => void
}

/**
 * Storyboard thumbnail. Every spread — cover, middle, or end — renders
 * in the same frame (same aspect, same blank-page background) so the
 * grid reads as a uniform storyboard sheet. Content differentiates by:
 *   • a small corner label ("Cover" / "pp. 4–5" / "End")
 *   • if a sketch exists, that sketch fills the entire spread
 */
export function SpreadThumbnail({ spread, onClick }: SpreadThumbnailProps) {
  const sketches = spread.sketches ?? []
  const latestSketch = sketches.length > 0 ? sketches[sketches.length - 1] : null
  const olderSketches = sketches.slice(0, -1)

  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-1.5 focus:outline-none w-full"
    >
      {/* Uniform double-page rectangle — same size for every spread */}
      <div className="relative w-full aspect-[2/1.4] rounded border-2 border-cream-300 bg-cream-50 overflow-hidden transition-all duration-150 group-hover:border-ochre-400 group-hover:shadow-medium">

        {/* Blank-page base: left page, spine, right page — always rendered
            so the box geometry is identical across all spread types */}
        <div className="flex h-full">
          <div className="flex-1 relative" />
          <div className="w-px bg-cream-300/70 shrink-0" />
          <div className="flex-1 relative" />
        </div>

        {/* Corner label — only visible when no sketch covers the spread */}
        {!latestSketch && (
          <span className="absolute top-1 left-1.5 font-sans text-[8px] text-ink-500/35 leading-none pointer-events-none">
            {spread.pageLabel}
          </span>
        )}

        {/* Optional scene reference (non-sketch seed image) */}
        {!latestSketch && spread.sceneImageDataUrl && (
          <img
            src={spread.sceneImageDataUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
        )}

        {/* Sketch overlay — covers both pages when present */}
        {latestSketch && (
          <div className="absolute inset-0">
            {olderSketches.slice(-2).map((sk, i) => (
              <div
                key={sk.id}
                className="absolute inset-0"
                style={{ transform: `rotate(${(i - 1) * 4}deg)`, zIndex: i + 1 }}
              >
                <img src={sk.imageDataUrl} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            <div className="absolute inset-0" style={{ zIndex: 10 }}>
              <img src={latestSketch.imageDataUrl} alt="" className="w-full h-full object-cover" />
            </div>
            {sketches.length > 1 && (
              <span
                className="absolute top-1 left-1 font-mono text-[7px] bg-black/50 text-white px-1 py-0.5 rounded leading-none"
                style={{ zIndex: 11 }}
              >
                v{sketches.length}
              </span>
            )}
          </div>
        )}

      </div>

      {/* Page label below the card (always visible) */}
      <p className="font-sans text-[9px] text-ink-500/50 leading-none">
        {spread.pageLabel}
      </p>
    </button>
  )
}
