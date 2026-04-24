import { jsPDF } from 'jspdf'
import type { Project, StorySpread } from '@/types'

// ─── Shared layout constants ─────────────────────────────────────
const PAGE_W = 8.5
const PAGE_H = 11
const MARGIN = 1
const USABLE_W = PAGE_W - MARGIN * 2  // 6.5 in
const FOOTER_Y = PAGE_H - 0.5

// Free-tier marketing footer. The phrase is rendered as a clickable link
// pointing to storyfolio.co (works in any digital PDF viewer) — dropped
// the `· storyfolio.co` suffix because the link carries that already.
// When Pro ships (PRO_PLAN.md), pass `{ proUnlocked: true }` to suppress.
const MADE_WITH = 'Made with Storyfolio'
const MADE_WITH_URL = 'https://storyfolio.co'

export interface ExportOptions {
  /** When true, suppresses the "Made with Storyfolio" free-tier footer.
   *  Pro users get a clean, submission-ready PDF without the mark. */
  proUnlocked?: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────

/** Draws the "Made with Storyfolio" linked caption, horizontally centered
 *  at (cx, y). Split into doc.text() + doc.link() for maximum jsPDF
 *  compatibility — textWithLink sometimes mispositions the link rectangle
 *  relative to the rendered text. Measuring manually and creating a link
 *  annotation over the exact text bounds is more reliable. */
function drawMadeWith(doc: jsPDF, cx: number, y: number) {
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  // Darker beige-grey so the mark reads legibly on white at 8pt without
  // competing with the page number above it.
  doc.setTextColor(130, 120, 100)
  const textWidth = doc.getTextWidth(MADE_WITH)
  const x = cx - textWidth / 2
  doc.text(MADE_WITH, x, y)
  // Link rectangle — slightly taller than the text to give an easy click
  // target; origin is top-left so we subtract ~font-height to overlay the
  // glyphs themselves rather than the baseline.
  const lineH = 0.13
  doc.link(x, y - lineH + 0.03, textWidth, lineH, { url: MADE_WITH_URL })
}

function addFooter(doc: jsPDF, pageNum: number, opts: ExportOptions = {}) {
  // Page number — centered, slightly higher to leave room for the mark below.
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(160, 140, 120)
  doc.text(String(pageNum), PAGE_W / 2, FOOTER_Y, { align: 'center' })

  // "Made with Storyfolio" — free-tier only, clickable link to storyfolio.co.
  if (!opts.proUnlocked) {
    drawMadeWith(doc, PAGE_W / 2, FOOTER_Y + 0.18)
  }

  doc.setTextColor(0, 0, 0)
}

/** Write wrapped text, returning the new y position. Adds a new page if needed. */
function writeText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  style: 'normal' | 'bold' | 'italic',
  pageNum: { n: number },
  opts: ExportOptions = {}
): number {
  doc.setFont('helvetica', style)
  doc.setFontSize(fontSize)
  const lines = doc.splitTextToSize(text, maxWidth)
  const lineH = fontSize / 72 * 1.45
  for (const line of lines) {
    if (y + lineH > PAGE_H - MARGIN) {
      addFooter(doc, pageNum.n, opts)
      doc.addPage()
      pageNum.n++
      y = MARGIN
    }
    doc.text(line, x, y)
    y += lineH
  }
  return y
}

function safeName(title: string): string {
  return title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
}

/** Returns spreads to publish: locked ones if any exist, otherwise all. */
function publishSpreads(project: Project): StorySpread[] {
  const locked = project.storyFlow.filter((s) => s.locked)
  return locked.length > 0 ? locked : project.storyFlow
}

// ─── Builders (return doc — do not save) ─────────────────────────

export function buildManuscript2(project: Project, opts: ExportOptions = {}): { doc: jsPDF; filename: string } {
  const doc = new jsPDF({ unit: 'in', format: 'letter' })
  const pn = { n: 1 }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text(project.title, PAGE_W / 2, PAGE_H / 2 - 0.3, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text('Manuscript', PAGE_W / 2, PAGE_H / 2 + 0.3, { align: 'center' })
  addFooter(doc, pn.n, opts)

  const spreads = publishSpreads(project).filter((s) => s.manuscriptText.trim())
  for (const spread of spreads) {
    doc.addPage()
    pn.n++
    let y = MARGIN
    y = writeText(doc, spread.pageLabel, MARGIN, y, USABLE_W, 9, 'italic', pn, opts)
    y += 0.08
    writeText(doc, spread.manuscriptText, MARGIN, y, USABLE_W, 12, 'normal', pn, opts)
    addFooter(doc, pn.n, opts)
  }

  return { doc, filename: `${safeName(project.title)}-manuscript.pdf` }
}

export function buildManuscript1(project: Project, opts: ExportOptions = {}): { doc: jsPDF; filename: string } {
  const doc = new jsPDF({ unit: 'in', format: 'letter' })
  const pn = { n: 1 }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text(project.title, PAGE_W / 2, PAGE_H / 2 - 0.3, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text('Manuscript with Art Notes', PAGE_W / 2, PAGE_H / 2 + 0.3, { align: 'center' })
  addFooter(doc, pn.n, opts)

  const spreads = publishSpreads(project).filter(
    (s) => s.manuscriptText.trim() || Object.values(s.artNotes).some(Boolean)
  )

  for (const spread of spreads) {
    doc.addPage()
    pn.n++
    let y = MARGIN
    y = writeText(doc, spread.pageLabel, MARGIN, y, USABLE_W, 9, 'italic', pn, opts)
    y += 0.08
    if (spread.manuscriptText.trim()) {
      y = writeText(doc, spread.manuscriptText, MARGIN, y, USABLE_W, 12, 'normal', pn, opts)
      y += 0.18
    }
    const artFields: Array<{ label: string; value: string }> = [
      { label: 'Characters', value: spread.artNotes.characters },
      { label: 'Design',     value: spread.artNotes.designNotes },
      { label: 'Notes',      value: spread.artNotes.scene },
    ]
    for (const { label, value } of artFields) {
      if (!value.trim()) continue
      y = writeText(doc, `${label}:`, MARGIN, y, USABLE_W, 8, 'bold', pn, opts)
      y = writeText(doc, value, MARGIN + 0.15, y - 0.02, USABLE_W - 0.15, 9, 'italic', pn, opts)
      y += 0.06
    }
    addFooter(doc, pn.n, opts)
  }

  return { doc, filename: `${safeName(project.title)}-manuscript-with-art-notes.pdf` }
}

export function buildStatement(project: Project, opts: ExportOptions = {}): { doc: jsPDF; filename: string } {
  const doc = new jsPDF({ unit: 'in', format: 'letter' })
  const pn = { n: 1 }
  let y = MARGIN

  y = writeText(doc, project.title, MARGIN, y, USABLE_W, 20, 'bold', pn, opts)
  y += 0.12
  doc.setDrawColor(180, 160, 130)
  doc.line(MARGIN, y, MARGIN + USABLE_W, y)
  y += 0.22

  const sections: Array<{ label: string; value: string }> = [
    { label: 'Logline',     value: project.statementLogline },
    { label: 'POV',         value: project.statementPov },
    { label: 'Comparables', value: project.statementComparables },
    { label: 'Notes',       value: project.statementMisc },
  ]
  for (const { label, value } of sections) {
    if (!value.trim()) continue
    y = writeText(doc, label, MARGIN, y, USABLE_W, 10, 'bold', pn, opts)
    y += 0.02
    y = writeText(doc, value, MARGIN, y, USABLE_W, 11, 'normal', pn, opts)
    y += 0.22
  }

  addFooter(doc, pn.n, opts)
  return { doc, filename: `${safeName(project.title)}-statement.pdf` }
}

function imgFormat(dataUrl: string): string {
  return dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG'
}

export function buildBookDummy(project: Project, opts: ExportOptions = {}): { doc: jsPDF; filename: string } {
  // Landscape letter: 11" × 8.5"
  const doc = new jsPDF({ unit: 'in', format: 'letter', orientation: 'landscape' })
  const pn = { n: 1 }
  const LW = PAGE_H   // landscape width  = 11"
  const LH = PAGE_W   // landscape height = 8.5"
  const LMARGIN = MARGIN
  const LUSABLE_W = LW - LMARGIN * 2   // 9"
  const LUSABLE_H = LH - LMARGIN * 2   // 6.5"
  const LFOOTER_Y = LH - 0.5

  function lFooter(pageNum: number) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(160, 140, 120)
    doc.text(String(pageNum), LW / 2, LFOOTER_Y, { align: 'center' })

    // Free-tier "Made with Storyfolio" mark — the book dummy is what
    // authors share with critique groups, so this is the single highest-
    // leverage marketing surface in the app. Rendered as a live link.
    if (!opts.proUnlocked) {
      drawMadeWith(doc, LW / 2, LFOOTER_Y + 0.18)
    }

    doc.setTextColor(0, 0, 0)
  }

  // Only locked spreads — no fallback
  const spreads = project.storyFlow.filter((s) => s.locked)

  // ── Page 1: Storyboard overview (thumbnail grid) ──────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(project.title, LW / 2, LMARGIN, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(140, 120, 100)
  doc.text('Book Dummy', LW / 2, LMARGIN + 0.35, { align: 'center' })
  doc.setTextColor(0, 0, 0)

  const COLS = 5
  const GAP = 0.12
  const THUMB_W = (LUSABLE_W - GAP * (COLS - 1)) / COLS   // ~1.73"
  const THUMB_H = THUMB_W * 0.7                             // 10:7 spread aspect
  const LABEL_H = 0.22
  const ROW_H = THUMB_H + LABEL_H + 0.1
  const GRID_Y = LMARGIN + 0.65

  spreads.forEach((spread, i) => {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    const x = LMARGIN + col * (THUMB_W + GAP)
    const y = GRID_Y + row * ROW_H

    doc.setDrawColor(200, 185, 160)
    doc.setFillColor(245, 240, 232)
    doc.rect(x, y, THUMB_W, THUMB_H, 'FD')

    const latestSketch = spread.sketches?.[spread.sketches.length - 1]
    const imgUrl = latestSketch?.imageDataUrl ?? null
    if (imgUrl) {
      try {
        doc.addImage(imgUrl, imgFormat(imgUrl), x, y, THUMB_W, THUMB_H)
      } catch { /* skip */ }
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5.5)
    doc.setTextColor(120, 100, 80)
    doc.text(spread.pageLabel, x + THUMB_W / 2, y + THUMB_H + 0.14, { align: 'center' })
    doc.setTextColor(0, 0, 0)
  })

  lFooter(pn.n)

  // ── Pages 2+: One spread per page — sketch only ───────────────
  for (const spread of spreads) {
    doc.addPage()
    pn.n++

    // Page label top-left
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(140, 120, 100)
    doc.text(spread.pageLabel, LMARGIN, LMARGIN + 0.02)
    doc.setTextColor(0, 0, 0)

    // Latest sketch — centred, as large as possible within usable area
    const latestSketch = spread.sketches?.[spread.sketches.length - 1]
    const imgUrl = latestSketch?.imageDataUrl ?? null
    if (imgUrl) {
      // Fit image within usable area preserving aspect (assume 10:7 if unknown)
      const maxW = LUSABLE_W
      const maxH = LUSABLE_H - 0.3   // leave room for label + footer
      const aspect = 10 / 7
      let imgW = maxW
      let imgH = imgW / aspect
      if (imgH > maxH) { imgH = maxH; imgW = imgH * aspect }
      const imgX = LMARGIN + (LUSABLE_W - imgW) / 2
      const imgY = LMARGIN + 0.25 + (maxH - imgH) / 2
      try {
        doc.addImage(imgUrl, imgFormat(imgUrl), imgX, imgY, imgW, imgH)
      } catch { /* skip */ }
    }

    lFooter(pn.n)
  }

  // ── Final page: End ───────────────────────────────────────────
  doc.addPage()
  pn.n++
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(140, 120, 100)
  doc.text(project.title, LW / 2, LH / 2 - 0.35, { align: 'center' })
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(13)
  doc.text('The End', LW / 2, LH / 2 + 0.15, { align: 'center' })
  doc.setTextColor(0, 0, 0)
  lFooter(pn.n)

  return { doc, filename: `${safeName(project.title)}-book-dummy.pdf` }
}

// ─── Convenience wrappers (direct download) ──────────────────────

export function exportManuscript2(project: Project, opts: ExportOptions = {}): void {
  const { doc, filename } = buildManuscript2(project, opts)
  doc.save(filename)
}

export function exportManuscript1(project: Project, opts: ExportOptions = {}): void {
  const { doc, filename } = buildManuscript1(project, opts)
  doc.save(filename)
}

export function exportStatement(project: Project, opts: ExportOptions = {}): void {
  const { doc, filename } = buildStatement(project, opts)
  doc.save(filename)
}

export function exportBookDummy(project: Project, opts: ExportOptions = {}): void {
  const { doc, filename } = buildBookDummy(project, opts)
  doc.save(filename)
}
