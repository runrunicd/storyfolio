import { useMemo, useState } from 'react'
import { useProjectStore, useAppStore } from '@/store'
import { NewBookModal } from '@/modals/NewBookModal'
import type { Project } from '@/types'

// ─── Book-spine palette ──────────────────────────────────────────
// Soft, warm picture-book colors — like children's-book covers on a
// nursery shelf. Spine picks one deterministically from the project's id
// so a book keeps the same color across sessions.
const SPINE_PALETTE: { body: string; cap: string; text: string }[] = [
  { body: '#EFC4A5', cap: '#F6EAD6', text: '#6B4A32' }, // soft peach + cream
  { body: '#B8C8A8', cap: '#F6EAD6', text: '#4A5A40' }, // sage + cream
  { body: '#E8B8A0', cap: '#F6EAD6', text: '#6B4238' }, // dusty rose + cream
  { body: '#E8C878', cap: '#F6EAD6', text: '#6B5020' }, // butter honey + cream
  { body: '#C8B8D0', cap: '#F6EAD6', text: '#4A3E58' }, // lavender + cream
  { body: '#A8C0CC', cap: '#F6EAD6', text: '#3E5260' }, // dusty sky + cream
  { body: '#D9B679', cap: '#F6EAD6', text: '#5C4020' }, // ochre + cream
  { body: '#B0C8B8', cap: '#F6EAD6', text: '#3E5446' }, // mint + cream
  { body: '#E0A890', cap: '#F6EAD6', text: '#5A2E20' }, // clay + cream
]

function paletteFor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return SPINE_PALETTE[Math.abs(h) % SPINE_PALETTE.length]
}

// Slight height variation so books don't look like a rack of clones.
function spineHeight(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 37 + id.charCodeAt(i)) | 0
  const variants = [280, 292, 276, 298, 284, 290]
  return variants[Math.abs(h) % variants.length]
}

function spineWidth(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 17 + id.charCodeAt(i)) | 0
  const variants = [56, 62, 58, 64, 60]
  return variants[Math.abs(h) % variants.length]
}

// "N spreads locked · updated 2 days ago"
function metaFor(project: Project): string {
  const lockedCount = project.storyFlow?.filter((s) => s.locked).length ?? 0
  const totalCount = project.storyFlow?.length ?? 0
  const locked = `${lockedCount}/${totalCount} locked`
  const updated = relativeTime(project.updatedAt)
  return `${locked} · ${updated}`
}

function relativeTime(iso: string): string {
  try {
    const now = Date.now()
    const then = new Date(iso).getTime()
    const diffMs = now - then
    const day = 24 * 60 * 60 * 1000
    if (diffMs < day) return 'today'
    if (diffMs < 2 * day) return 'yesterday'
    const days = Math.floor(diffMs / day)
    if (days < 7) return `${days}d ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    return `${Math.floor(days / 30)}mo ago`
  } catch {
    return ''
  }
}

// ─── Book spine component ────────────────────────────────────────
function BookSpine({
  project,
  onOpen,
  onRequestDelete,
  isConfirmingDelete,
}: {
  project: Project
  onOpen: () => void
  onRequestDelete: (e: React.MouseEvent) => void
  isConfirmingDelete: boolean
}) {
  const palette = paletteFor(project.id)
  const h = spineHeight(project.id)
  const w = spineWidth(project.id)

  // Title — vertical orientation. Long titles get truncated.
  const title = (project.title || 'Untitled').trim() || 'Untitled'
  const displayTitle = title.length > 42 ? `${title.slice(0, 40)}…` : title

  return (
    <div
      className="group relative cursor-pointer"
      style={{
        width: w,
        height: h,
        transformOrigin: 'bottom center',
        transition: 'transform 200ms ease-out, filter 200ms ease-out',
      }}
      onClick={onOpen}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-8px)'
        e.currentTarget.style.filter = 'drop-shadow(0 10px 16px rgba(120,95,60,0.22))'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.filter = 'drop-shadow(0 2px 4px rgba(120,95,60,0.15))'
      }}
    >
      {/* Hover caption — sits ABOVE the book so the shelf never covers it */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity text-center"
        style={{ bottom: 'calc(100% + 12px)' }}
      >
        <div
          className="text-ink-700 leading-tight"
          style={{ fontFamily: "'Caveat', cursive", fontSize: 18 }}
        >
          {project.title}
        </div>
        <div className="text-ink-500/55 text-[11px] mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {metaFor(project)}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        width={w}
        height={h}
        style={{ display: 'block', filter: 'drop-shadow(0 2px 4px rgba(120,95,60,0.15))' }}
      >
        <defs>
          <linearGradient id={`spine-${project.id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="rgba(0,0,0,0.14)" />
            <stop offset="0.12" stopColor="rgba(0,0,0,0)" />
            <stop offset="0.88" stopColor="rgba(0,0,0,0)" />
            <stop offset="1" stopColor="rgba(255,255,255,0.12)" />
          </linearGradient>
        </defs>
        {/* Spine body — soft rounded top corner for a picture-book feel */}
        <rect x="0" y="0" width={w} height={h} rx="3" ry="3" fill={palette.body} />
        {/* Soft depth gradient */}
        <rect x="0" y="0" width={w} height={h} rx="3" ry="3" fill={`url(#spine-${project.id})`} />
        {/* One cream cap at top — a thin ribbon, not leather */}
        <rect x="2" y="12" width={w - 4} height="2" fill={palette.cap} opacity="0.55" />
        {/* Vertical title, bottom-up (real spine orientation) */}
        <text
          x={w / 2}
          y={h / 2}
          fontFamily="'Lora', Georgia, serif"
          fontSize={w < 60 ? 13 : 14}
          fontWeight="500"
          fill={palette.text}
          textAnchor="middle"
          dominantBaseline="middle"
          transform={`rotate(-90 ${w / 2} ${h / 2})`}
          style={{ letterSpacing: '0.02em' }}
        >
          {displayTitle}
        </text>
      </svg>

      {/* Delete affordance — appears on hover, top-right corner */}
      <button
        onClick={onRequestDelete}
        className={[
          'absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center',
          'font-sans text-[11px] leading-none transition-all',
          isConfirmingDelete
            ? 'bg-red-500 text-white opacity-100 scale-110'
            : 'bg-cream-100 text-ink-500/45 opacity-0 group-hover:opacity-100 border border-cream-300 shadow-soft hover:text-red-500',
        ].join(' ')}
        aria-label={isConfirmingDelete ? 'Click again to confirm' : 'Remove from shelf'}
      >
        {isConfirmingDelete ? '✓' : '×'}
      </button>
    </div>
  )
}

// ─── "Empty slot" — the + book ──────────────────────────────────
function NewBookSlot({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div
      className="group relative cursor-pointer"
      style={{ width: 58, height: 280, transition: 'transform 200ms ease-out' }}
      onClick={onClick}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-6px)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
    >
      {/* Label lives ABOVE the slot, same as the book hover captions */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity text-center"
        style={{ bottom: 'calc(100% + 12px)' }}
      >
        <div className="text-ink-500/70" style={{ fontFamily: "'Caveat', cursive", fontSize: 16 }}>
          {label}
        </div>
      </div>
      <svg viewBox="0 0 58 280" width="58" height="280" style={{ display: 'block' }}>
        <rect
          x="2"
          y="2"
          width="54"
          height="276"
          rx="3"
          ry="3"
          fill="rgba(250,247,242,0.6)"
          stroke="rgba(200,145,58,0.35)"
          strokeWidth="1.2"
          strokeDasharray="5 5"
          className="group-hover:[stroke:rgba(200,145,58,0.7)]"
        />
        <text
          x="29"
          y="140"
          fontFamily="'Lora', serif"
          fontSize="28"
          fill="rgba(200,145,58,0.55)"
          textAnchor="middle"
          dominantBaseline="middle"
          className="group-hover:[fill:rgba(200,145,58,0.85)]"
        >
          +
        </text>
      </svg>
    </div>
  )
}

// ─── ProjectsView ──────────────────────────────────────────────
export function ProjectsView() {
  const { projects, addProject, deleteProject } = useProjectStore()
  const { setActiveProjectId, setActiveView, openSettings } = useAppStore()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [newBookOpen, setNewBookOpen] = useState(false)

  const openProject = (id: string) => {
    setActiveProjectId(id)
    useProjectStore.getState().setActiveProject(id)
    setActiveView('dream')
  }

  // New-book flow: show the template picker, then create + navigate on confirm.
  const handleNew = () => setNewBookOpen(true)

  const handleNewConfirm = (template: { spreadCount: number }, title: string) => {
    setNewBookOpen(false)
    const id = addProject(title, template.spreadCount)
    useProjectStore.getState().setActiveProject(id)
    setActiveProjectId(id)
    setActiveView('dream')
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (confirmDelete === id) {
      deleteProject(id)
      setConfirmDelete(null)
    } else {
      setConfirmDelete(id)
      setTimeout(() => setConfirmDelete(null), 3000)
    }
  }

  // Sort books newest-first so the one you were just working on is leftmost.
  const sorted = useMemo(
    () =>
      [...projects].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [projects],
  )

  const hasBooks = sorted.length > 0

  return (
    <div className="min-h-screen bg-cream-100">
      {/* Header */}
      <div className="px-10 pt-10 pb-6 max-w-6xl mx-auto">
        <div className="flex items-end justify-between">
          <div>
            <h1
              className="text-ink-700 mb-1 leading-none"
              style={{
                fontFamily: "'Caveat', 'Lora', cursive",
                fontWeight: 700,
                fontSize: '3.5rem',
                letterSpacing: '-0.01em',
              }}
            >
              Storyfolio
            </h1>
            <p className="font-sans text-sm text-ink-500/60">
              {hasBooks
                ? `${sorted.length} ${sorted.length === 1 ? 'book' : 'books'} on your shelf`
                : 'your studio — a quiet place to make a picture book'}
            </p>
          </div>
          <button
            onClick={openSettings}
            className="font-sans text-xs text-ink-500/60 hover:text-ink-700 px-3 py-1.5 rounded-lg hover:bg-cream-200 transition-colors"
            title="Settings"
          >
            ⚙ Settings
          </button>
        </div>
      </div>

      {/* Bookshelf */}
      <div className="px-10 max-w-6xl mx-auto">
        {hasBooks ? (
          <Shelf>
            <div className="flex items-end gap-3 flex-wrap">
              {sorted.map((project) => (
                <BookSpine
                  key={project.id}
                  project={project}
                  onOpen={() => openProject(project.id)}
                  onRequestDelete={(e) => handleDelete(e, project.id)}
                  isConfirmingDelete={confirmDelete === project.id}
                />
              ))}
              <NewBookSlot onClick={handleNew} label="Start a new book" />
            </div>
          </Shelf>
        ) : (
          <EmptyShelf onStart={handleNew} />
        )}
      </div>

      {/* Footer — handwritten note, helps make the empty shelf feel less like a 404 */}
      <div className="max-w-6xl mx-auto px-10 mt-12 pb-16">
        <p
          className="text-ink-500/45 text-sm italic"
          style={{ fontFamily: "'Caveat', 'Lora', cursive" }}
        >
          {hasBooks
            ? '— your books. click a spine to keep working. —'
            : '— storyfolio holds your books privately, in this browser. nothing leaves your device unless you export it. —'}
        </p>
      </div>

      {/* Template picker */}
      <NewBookModal
        isOpen={newBookOpen}
        onClose={() => setNewBookOpen(false)}
        onConfirm={handleNewConfirm}
      />
    </div>
  )
}

// ─── Shelf presentation ─────────────────────────────────────────
// A soft, honey-colored wooden plank — thin and warm, not a library
// leather-bound heavy thing. More like a nursery-room shelf.
function Shelf({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative pt-8">
      {/* Books sit on top of the shelf */}
      <div className="pb-0">{children}</div>
      {/* Warm honey wood plank */}
      <div
        className="h-2.5 rounded-sm"
        style={{
          background:
            'linear-gradient(180deg, #E8C890 0%, #D9B079 55%, #B8914F 100%)',
          boxShadow:
            '0 3px 6px rgba(120,95,60,0.18), inset 0 1px 0 rgba(255,240,210,0.35)',
        }}
      />
      {/* Gentle shadow fading away below */}
      <div
        className="h-2 mx-2 rounded-b-sm"
        style={{
          background:
            'linear-gradient(180deg, rgba(150,115,65,0.25) 0%, rgba(150,115,65,0) 100%)',
        }}
      />
    </div>
  )
}

// ─── Empty state ───────────────────────────────────────────────
function EmptyShelf({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative pt-10 pb-4">
      <div className="flex items-end justify-center gap-6 mb-0">
        {/* A single gently-suggested first book */}
        <div
          className="relative cursor-pointer group"
          onClick={onStart}
          style={{ transition: 'transform 220ms ease-out' }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-8px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <svg viewBox="0 0 62 288" width="62" height="288" style={{ display: 'block' }}>
            <rect
              x="2"
              y="2"
              width="58"
              height="284"
              rx="3"
              ry="3"
              fill="rgba(250,247,242,0.7)"
              stroke="rgba(200,145,58,0.4)"
              strokeWidth="1.4"
              strokeDasharray="5 5"
              className="group-hover:[stroke:rgba(200,145,58,0.75)]"
            />
            <text
              x="31"
              y="135"
              fontFamily="'Lora', serif"
              fontSize="30"
              fill="rgba(200,145,58,0.6)"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              +
            </text>
            <text
              x="31"
              y="168"
              fontFamily="'Caveat', cursive"
              fontSize="14"
              fill="rgba(74,69,64,0.55)"
              textAnchor="middle"
            >
              your first book
            </text>
          </svg>
        </div>
      </div>

      {/* The shelf — warm honey wood */}
      <div
        className="h-2.5 rounded-sm"
        style={{
          background:
            'linear-gradient(180deg, #E8C890 0%, #D9B079 55%, #B8914F 100%)',
          boxShadow:
            '0 3px 6px rgba(120,95,60,0.18), inset 0 1px 0 rgba(255,240,210,0.35)',
        }}
      />
      <div
        className="h-2 mx-2 rounded-b-sm"
        style={{
          background:
            'linear-gradient(180deg, rgba(150,115,65,0.25) 0%, rgba(150,115,65,0) 100%)',
        }}
      />

      {/* Handwritten invitation */}
      <div className="text-center mt-16">
        <p
          className="text-ink-700 mb-3"
          style={{ fontFamily: "'Caveat', cursive", fontSize: 32, lineHeight: 1 }}
        >
          start your first book
        </p>
        <p className="font-sans text-sm text-ink-500/60 mb-7 max-w-md mx-auto leading-relaxed">
          One rough idea. Ten or sixteen spreads. A finished dummy you can send to an editor.
        </p>
        <button
          onClick={onStart}
          className="px-6 py-3 bg-ochre-500 text-white font-sans text-sm font-medium rounded-xl hover:bg-ochre-600 transition-colors shadow-soft"
        >
          + Begin a new book
        </button>
      </div>
    </div>
  )
}
