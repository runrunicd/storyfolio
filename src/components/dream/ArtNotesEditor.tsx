import { TextArea } from '@/components/ui/TextArea'
import type { ArtNotes } from '@/types'

interface ArtNotesEditorProps {
  notes: ArtNotes
  onChange: (patch: Partial<ArtNotes>) => void
}

export function ArtNotesEditor({ notes, onChange }: ArtNotesEditorProps) {
  return (
    <div className="flex flex-col gap-3">
      <TextArea
        label="Characters"
        value={notes.characters}
        onChange={(e) => onChange({ characters: e.target.value })}
        placeholder="Who appears in this spread? What are they doing?"
        rows={2}
      />
      <TextArea
        label="Design"
        value={notes.designNotes}
        onChange={(e) => onChange({ designNotes: e.target.value })}
        placeholder="Colors, mood, composition, lighting, visual feel…"
        rows={2}
      />
      <TextArea
        label="Notes"
        value={notes.scene}
        onChange={(e) => onChange({ scene: e.target.value })}
        placeholder="Setting, time of day, atmosphere, anything else…"
        rows={2}
      />
    </div>
  )
}
