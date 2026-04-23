import { useMemo, useState } from 'react'
import { useProjectStore, useAppStore } from '@/store'
import type { Project } from '@/types'

// ─── Book-spine palette ──────────────────────────────────────────
// Book-cloth colors inspired by real publisher bindings. Spine picks one
// deterministically from the project's id so a book keeps the same color
// across sessions.
const SPINE_PALETTE: { body: string; cap: string; text: string }[] = [
  { body: '#6E8FA8', cap: '#D9B679', text: '#F6EFDE' }, // dusty blue + gold
  { body: '#8E5C41', cap: '#E2C074', text: '#F6EFDE' }, // warm rust + ochre
  { body: '#7A8C6E', cap: '#D9B679', text: '#F6EFDE' }, // moss + gold
  { body: '#C8913A', cap: '#5C4629', text: '#FAF7F2' }, // ochre + brown
  { body: '#2C3A5C', cap: '#C8913A', text: '#F6EFDE' }, // midnight + ochre
  { body: '#A67B4F', cap: '#E8DFC8', text: '#FAF7F2' }, // cardboard + cream
  { body: '#8B5A4A', cap: '#D4A096', text: '#FAF7F2' }, // rust + rose
  { body: '#4D6A5A', cap: '#D9B679', text: '#F6EFDE' }, // pine + gold
  { body: '#5C6E8A', cap: '#E2C074', text: '#F6EFDE' }, // slate + gold
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
        transition: 'transform 180ms ease-out, filter 180ms ease-out',
      }}
      onClick={onOpen}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-8px)'
        e.currentTarget.style.filter = 'drop-shadow(0 12px 18px rgba(74,69,64,0.25))'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.filter = 'drop-shadow(0 3px 5px rgba(74,69,64,0.18))'
      }}
      title={`${project.title}\n${metaFor(project)}`}
    >
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width={w}
        height={h}
        style={{ display: 'block', filter: 'drop-shadow(0 3px 5px rgba(74,69,64,0.18))' }}
      >
        {/* Spine body */}
        <rect x="0" y="0" width={w} height={h} fill={palette.body} />
        {/* Top + bottom caps (book-cloth bands) */}
        <rect x="0" y="8" width={w} height="14" fill={palette.cap} opacity="0.85" />
        <rect x="0" y={h - 22} width={w} height="14" fill={palette.cap} opacity="0.85" />
        {/* Thin gold rules on the bands */}
        <line x1="4" y1="8" x2={w - 4} y2="8" stroke={palette.cap} strokeWidth="0.5" opacity="0.6" />
        <line x1="4" y1="22" x2={w - 4} y2="22" stroke={palette.cap} strokeWidth="0.5" opacity="0.6" />
        <line x1="4" y1={h - 22} x2={w - 4} y2={h - 22} stroke={palette.cap} strokeWidth="0.5" opacity="0.6" />
        <line x1="4" y1={h - 8} x2={w - 4} y2={h - 8} stroke={palette.cap} strokeWidth="0.5" opacity="0.6" />
        {/* Subtle vertical inner shadow to give depth */}
        <rect x="0" y="0" width="3" height={h} fill="rgba(0,0,0,0.2)" />
        <rect x={w - 3} y="0" width="3" height={h} fill="rgba(255,255,255,0.08)" />
        {/* Vertical title text, bottom-up (real spine orientation) */}
        <text
          x={w / 2}
          y={h / 2}
          fontFamily="'Lora', Georgia, serif"
          fontSize={w < 60 ? 13 : 14}
          fill={palette.text}
          textAnchor="middle"
          dominantBaseline="middle"
          transform={`rotate(-90 ${w / 2} ${h / 2})`}
          style={{ letterSpacing: '0.02em' }}
        >
          {displayTitle}
        </text>
        {/* Tiny maker mark near bottom cap */}
        <text
          x={w / 2}
          y={h - 14}
          fontFamily="'Caveat', cursive"
          fontSize="10"
          fill={palette.cap}
          textAnchor="middle"
          opacity="0.85"
        >
          ✦
        </text>
      </svg>

      {/* Delete affordance — appears on hover, top corner */}
      <button
        onClick={onRequestDelete}
        className={[
          'absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center',
          'font-sans text-[11px] leading-none transition-all',
          isConfirmingDelete
            ? 'bg-red-500 text-white opacity-100 scale-110'
            : 'bg-cream-100 text-ink-500/50 opacity-0 group-hover:opacity-100 border border-cream-300 shadow-soft hover:text-red-500',
        ].join(' ')}
        title={isConfirmingDelete ? 'Click again to confirm' : 'Remove from shelf'}
        aria-label="Delete project"
      >
        {isConfirmingDelete ? '✓' : '×'}
      </button>

      {/* Hover caption — meta info */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ top: h + 8, fontFamily: "'Caveat', cursive" }}
      >
        <div className="font-serif text-xs text-ink-700">{project.title}</div>
        <div className="font-sans text-[10px] text-ink-500/60 mt-0.5 text-center">{metaFor(project)}</div>
      </div>
    </div>
  )
}

// ─── "Empty slot" — the + book ──────────────────────────────────
function NewBookSlot({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <div
      className="group relative cursor-pointer"
      style={{ width: 58, height: 280, transition: 'transform 180ms ease-out' }}
      onClick={onClick}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-6px)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
      title={label}
    >
      <svg viewBox="0 0 58 280" width="58" height="280" style={{ display: 'block' }}>
        <rect
          x="2"
          y="2"
          width="54"
          height="276"
          fill="var(--cream-100, #FAF7F2)"
          stroke="rgba(120,100,60,0.4)"
          strokeWidth="1.2"
          strokeDasharray="4 4"
        />
        <text
          x="29"
          y="140"
          fontFamily="'Lora', serif"
          fontSize="24"
          fill="rgba(120,100,60,0.5)"
          textAnchor="middle"
          dominantBaseline="middle"
          className="group-hover:[fill:rgba(200,145,58,0.85)]"
        >
          +
        </text>
      </svg>
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ top: 280 + 8, fontFamily: "'Caveat', cursive" }}
      >
        <div className="font-sans text-[11px] text-ink-500/70">{label}</div>
      </div>
    </div>
  )
}

// ─── ProjectsView ──────────────────────────────────────────────
export function ProjectsView() {
  const { projects, addProject, deleteProject } = useProjectStore()
  const { setActiveProjectId, setActiveView, openSettings } = useAppStore()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const openProject = (id: string) => {
    setActiveProjectId(id)
    useProjectStore.getState().setActiveProject(id)
    setActiveView('dream')
  }

  const handleNew = () => {
    const id = addProject('Untitled Story')
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
            <h1 className="font-serif text-4xl text-ink-700 mb-1 leading-tight">Storyfolio</h1>
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
    </div>
  )
}

// ─── Shelf presentation ─────────────────────────────────────────
function Shelf({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative pt-6">
      {/* Books sit on top of the shelf */}
      <div className="pb-1">{children}</div>
      {/* The shelf itself — a simple wooden plank with a soft shadow under */}
      <div
        className="h-3 rounded-sm"
        style={{
          background:
            'linear-gradient(180deg, #A67B4F 0%, #8E5C41 55%, #5C4629 100%)',
          boxShadow:
            '0 4px 8px rgba(74,69,64,0.22), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      />
      <div
        className="h-1.5 mx-1 rounded-b-sm"
        style={{
          background:
            'linear-gradient(180deg, rgba(92,70,41,0.6) 0%, rgba(92,70,41,0) 100%)',
        }}
      />
    </div>
  )
}

// ─── Empty state ───────────────────────────────────────────────
function EmptyShelf({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative pt-10 pb-4">
      <div className="flex items-end justify-center gap-6 mb-6">
        {/* A single gently-suggested first book */}
        <div
          className="relative cursor-pointer"
          onClick={onStart}
          style={{ transition: 'transform 200ms ease-out' }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-8px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          <svg viewBox="0 0 62 288" width="62" height="288" style={{ display: 'block' }}>
            <rect
              x="2"
              y="2"
              width="58"
              height="284"
              fill="var(--cream-50, #FDFCFA)"
              stroke="rgba(120,100,60,0.55)"
              strokeWidth="1.4"
              strokeDasharray="5 5"
            />
            <text
              x="31"
              y="140"
              fontFamily="'Lora', serif"
              fontSize="28"
              fill="rgba(200,145,58,0.7)"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              +
            </text>
            <text
              x="31"
              y="170"
              fontFamily="'Caveat', cursive"
              fontSize="13"
              fill="rgba(74,69,64,0.5)"
              textAnchor="middle"
            >
              your first book
            </text>
          </svg>
        </div>
      </div>

      {/* The shelf */}
      <div
        className="h-3 rounded-sm"
        style={{
          background:
            'linear-gradient(180deg, #A67B4F 0%, #8E5C41 55%, #5C4629 100%)',
          boxShadow:
            '0 4px 8px rgba(74,69,64,0.22), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      />
      <div
        className="h-1.5 mx-1 rounded-b-sm"
        style={{
          background:
            'linear-gradient(180deg, rgba(92,70,41,0.6) 0%, rgba(92,70,41,0) 100%)',
        }}
      />

      {/* Handwritten invitation */}
      <div className="text-center mt-14">
        <p
          className="text-ink-700 text-2xl mb-3"
          style={{ fontFamily: "'Caveat', cursive" }}
        >
          start your first book
        </p>
        <p className="font-sans text-sm text-ink-500/60 mb-6 max-w-md mx-auto">
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
