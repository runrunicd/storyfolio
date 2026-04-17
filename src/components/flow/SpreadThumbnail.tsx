import type { StorySpread } from '@/types'

interface SpreadThumbnailProps {
  spread: StorySpread
  onClick: () => void
}

export function SpreadThumbnail({ spread, onClick }: SpreadThumbnailProps) {
  const isCover = spread.pageLabel === 'Cover'
  const isEnd = spread.pageLabel === 'End'
  const sketches = spread.sketches ?? []
  const latestSketch = sketches.length > 0 ? sketches[sketches.length - 1] : null
  const olderSketches = sketches.slice(0, -1)
  // Parse page numbers directly from the label (e.g. "pp. 4–5" → "4", "5")
  const pageMatch = spread.pageLabel.match(/pp\. (\d+)–(\d+)/)
  const leftPage = pageMatch ? pageMatch[1] : ''
  const rightPage = pageMatch ? pageMatch[2] : ''

  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-1.5 focus:outline-none"
    >
      {/* Spread double-page rectangle */}
      <div className="relative w-full aspect-[2/1.4] rounded border-2 border-cream-300 bg-cream-200 overflow-hidden transition-all duration-150 group-hover:border-ochre-400 group-hover:shadow-medium">

        {/* Original left/spine/right layout — unchanged, provides sizing */}
        <div className="flex h-full">
          {/* Left page */}
          <div className="flex-1 relative overflow-hidden">
            {latestSketch ? (
              /* Render sketch here so flex h-full resolves correctly */
              <img src={latestSketch.imageDataUrl} alt="" className="w-full h-full object-cover" />
            ) : spread.sceneImageDataUrl ? (
              <img src={spread.sceneImageDataUrl} alt="" className="w-full h-full object-cover" />
            ) : isCover || isEnd ? (
              <div className="flex items-center justify-center w-full h-full">
                <svg viewBox="0 0 40 28" className="w-3/4 h-3/4 text-cream-300">
                  <rect x="1" y="1" width="38" height="26" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
                  <line x1="1" y1="1" x2="39" y2="27" stroke="currentColor" strokeWidth="1" />
                  <line x1="39" y1="1" x2="1" y2="27" stroke="currentColor" strokeWidth="1" />
                </svg>
              </div>
            ) : (
              <div className="p-1 flex flex-col justify-between h-full overflow-hidden">
                {leftPage && (
                  <span className="font-sans text-[7px] text-ink-500/30 leading-none">{leftPage}</span>
                )}
                {spread.manuscriptText && (
                  <p className="font-serif text-[6px] text-ink-500/60 leading-tight line-clamp-4 mt-0.5">
                    {spread.manuscriptText}
                  </p>
                )}
              </div>
            )}
          </div>
          {/* Spine */}
          <div className="w-px bg-cream-300 shrink-0" />
          {/* Right page */}
          <PageHalf
            imageUrl={null}
            text={isCover ? '' : isEnd ? '' : spread.artNotes.scene}
            label={isCover ? '' : isEnd ? '' : rightPage}
            isSpecial={false}
          />
        </div>

        {/* Sketch full-spread overlay — covers both pages */}
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

      {/* Page number label below */}
      <p className="font-sans text-[9px] text-ink-500/50 leading-none">
        {spread.pageLabel}
      </p>
    </button>
  )
}

interface PageHalfProps {
  imageUrl: string | null
  text: string
  label: string
  isSpecial: boolean
}

function PageHalf({ imageUrl, text, label, isSpecial }: PageHalfProps) {
  if (imageUrl) {
    return (
      <div className="flex-1 relative overflow-hidden">
        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
      </div>
    )
  }

  if (isSpecial) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <svg viewBox="0 0 40 28" className="w-3/4 h-3/4 text-cream-300">
          <rect x="1" y="1" width="38" height="26" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
          <line x1="1" y1="1" x2="39" y2="27" stroke="currentColor" strokeWidth="1" />
          <line x1="39" y1="1" x2="1" y2="27" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
    )
  }

  return (
    <div className="flex-1 p-1 flex flex-col justify-between overflow-hidden">
      {label && (
        <span className="font-sans text-[7px] text-ink-500/30 leading-none">{label}</span>
      )}
      {text && (
        <p className="font-serif text-[6px] text-ink-500/60 leading-tight line-clamp-4 mt-0.5">
          {text}
        </p>
      )}
    </div>
  )
}
