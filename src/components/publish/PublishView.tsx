import { useState } from 'react'
import { useActiveProject, useProjectStore } from '@/store'
import {
  buildBookDummy,
  buildManuscript1,
  buildManuscript2,
  buildStatement,
} from '@/lib/pdfExport'
import type { jsPDF } from 'jspdf'
import type { Project } from '@/types'

// ─── Preview modal ────────────────────────────────────────────────

interface PreviewState {
  url: string
  filename: string
  onDownload: () => void
}

interface PreviewModalProps {
  preview: PreviewState
  onClose: () => void
}

function PreviewModal({ preview, onClose }: PreviewModalProps) {
  const handleDownload = () => {
    preview.onDownload()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-ink-900/40 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl h-[88vh] bg-cream-100 rounded-2xl shadow-lifted border border-cream-300 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-cream-300 shrink-0">
          <p className="font-serif text-sm text-ink-700 truncate">{preview.filename}</p>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <button
              onClick={onClose}
              className="font-sans text-xs text-ink-500/60 hover:text-ink-700 transition-colors px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              className="font-sans text-xs px-3 py-1.5 rounded-lg bg-ochre-500 text-white hover:bg-ochre-600 transition-colors flex items-center gap-1.5"
            >
              ↓ Download PDF
            </button>
          </div>
        </div>
        {/* PDF iframe */}
        <iframe
          src={preview.url}
          className="flex-1 w-full border-0 bg-cream-200"
          title="PDF Preview"
        />
      </div>
    </div>
  )
}

// ─── Deliverable card ────────────────────────────────────────────

interface DeliverableCardProps {
  title: string
  description: string
  spreadNote: string
  onPreview: () => void
}

function DeliverableCard({ title, description, spreadNote, onPreview }: DeliverableCardProps) {
  return (
    <div className="flex flex-col gap-3 bg-cream-50 border border-cream-300 rounded-2xl p-5">
      <div className="flex-1">
        <p className="font-serif text-sm text-ink-700 mb-1">{title}</p>
        <p className="font-sans text-xs text-ink-500/60 leading-relaxed">{description}</p>
        <p className="font-sans text-[10px] text-moss-600 mt-2">{spreadNote}</p>
      </div>
      <button
        onClick={onPreview}
        className="self-start font-sans text-xs px-3 py-1.5 rounded-lg bg-ochre-500 text-white hover:bg-ochre-600 transition-colors"
      >
        Preview & Export
      </button>
    </div>
  )
}

// ─── Statement editor ────────────────────────────────────────────

interface StatementEditorProps {
  project: Project
}

function StatementEditor({ project }: StatementEditorProps) {
  const { updateStatement } = useProjectStore()

  const fields: Array<{
    key: keyof Pick<Project, 'statementLogline' | 'statementPov' | 'statementComparables' | 'statementMisc'>
    label: string
    placeholder: string
    rows: number
  }> = [
    {
      key: 'statementLogline',
      label: 'Logline',
      placeholder: 'One sentence — or 1–3 sentences — that capture the heart of your story…',
      rows: 2,
    },
    {
      key: 'statementPov',
      label: 'POV',
      placeholder: "Why are you the right person to write this book? Personal experience, expertise, lived perspective…",
      rows: 2,
    },
    {
      key: 'statementComparables',
      label: 'Comparables',
      placeholder: "It's ___ meets ___. Show agents and editors you know the market…",
      rows: 2,
    },
    {
      key: 'statementMisc',
      label: 'Notes',
      placeholder: 'Global art notes, anything else you want to highlight (e.g. color palette changes across spreads)…',
      rows: 3,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      {fields.map(({ key, label, placeholder, rows }) => (
        <div key={key} className="flex flex-col gap-1.5">
          <label className="font-sans text-xs font-medium text-ink-500/70">{label}</label>
          <textarea
            value={project[key]}
            onChange={(e) => updateStatement({ [key]: e.target.value })}
            placeholder={placeholder}
            rows={rows}
            className="w-full resize-none rounded-xl bg-cream-50 border border-cream-300 px-3 py-2.5 font-sans text-sm text-ink-700 placeholder:text-ink-500/25 focus:outline-none focus:ring-2 focus:ring-ochre-400/50 focus:border-ochre-400 transition-colors leading-relaxed"
          />
        </div>
      ))}
    </div>
  )
}

// ─── Main view ───────────────────────────────────────────────────

export function PublishView() {
  const project = useActiveProject()
  const [preview, setPreview] = useState<PreviewState | null>(null)

  if (!project) return null

  const lockedCount = project.storyFlow.filter((s) => s.locked).length
  const spreadNote =
    lockedCount > 0
      ? `${lockedCount} locked spread${lockedCount === 1 ? '' : 's'} will be included`
      : "All spreads (lock spreads in Story to control what\u2019s included)"

  const openPreview = (builder: () => { doc: jsPDF; filename: string }) => {
    const { doc, filename } = builder()
    const url = doc.output('bloburl') as unknown as string
    setPreview({ url, filename, onDownload: () => doc.save(filename) })
  }

  const closePreview = () => {
    if (preview) URL.revokeObjectURL(preview.url)
    setPreview(null)
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin bg-cream-100">
      <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col gap-8">

        {/* Header */}
        <div>
          <h1 className="font-serif text-2xl text-ink-700 mb-1">Publish</h1>
          <p className="font-sans text-sm text-ink-500/60">
            Export submission-ready documents from your project.
          </p>
        </div>

        {/* Statement 1-pager */}
        <div className="bg-cream-200 border border-cream-300 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-cream-300">
            <div>
              <p className="font-serif text-sm text-ink-700">Statement 1-Pager</p>
              <p className="font-sans text-xs text-ink-500/60 mt-0.5">
                Logline, POV, comparables, and global notes — one page for agents and editors.
              </p>
            </div>
            <button
              onClick={() => openPreview(() => buildStatement(project))}
              className="shrink-0 font-sans text-xs px-3 py-1.5 rounded-lg bg-ochre-500 text-white hover:bg-ochre-600 transition-colors"
            >
              Preview & Export
            </button>
          </div>
          <div className="px-5 py-5">
            <StatementEditor project={project} />
          </div>
        </div>

        {/* Deliverable cards */}
        <div>
          <p className="font-sans text-xs font-medium text-ink-500/50 uppercase tracking-wide mb-3">
            Manuscript & Book Dummy
          </p>
          <div className="grid grid-cols-3 gap-4">
            <DeliverableCard
              title="Book Dummy"
              description="Spreads with text placed and B&W sketches, plus up to 3 pieces of final art."
              spreadNote={spreadNote}
              onPreview={() => openPreview(() => buildBookDummy(project))}
            />
            <DeliverableCard
              title="Manuscript 1"
              description="Paginated manuscript with art notes (Characters, Design, Notes) after each spread."
              spreadNote={spreadNote}
              onPreview={() => openPreview(() => buildManuscript1(project))}
            />
            <DeliverableCard
              title="Manuscript 2"
              description="Clean plain text — just the story words, one spread per section."
              spreadNote={spreadNote}
              onPreview={() => openPreview(() => buildManuscript2(project))}
            />
          </div>
        </div>

      </div>

      {/* PDF Preview modal */}
      {preview && <PreviewModal preview={preview} onClose={closePreview} />}
    </div>
  )
}
