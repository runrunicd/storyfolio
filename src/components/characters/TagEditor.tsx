import { useState } from 'react'
import { Pill } from '@/components/ui/Pill'
import type { CharacterTag } from '@/types'

interface TagEditorProps {
  tags: CharacterTag[]
  type: 'personality' | 'visual'
  label: string
  onAdd: (label: string) => void
  onRemove: (id: string) => void
}

export function TagEditor({ tags, type, label, onAdd, onRemove }: TagEditorProps) {
  const [input, setInput] = useState('')

  const commit = () => {
    const trimmed = input.trim()
    if (trimmed) {
      onAdd(trimmed)
      setInput('')
    }
  }

  return (
    <div>
      <p className="text-xs font-sans font-medium text-ink-500/60 uppercase tracking-wide mb-2">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5 items-center">
        {tags.map((tag) => (
          <Pill
            key={tag.id}
            label={tag.label}
            type={type}
            onRemove={() => onRemove(tag.id)}
          />
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              commit()
            }
          }}
          onBlur={commit}
          placeholder="Add tag…"
          className="text-xs font-sans bg-transparent border-b border-dashed border-cream-400 text-ink-500 placeholder:text-ink-500/30 focus:outline-none focus:border-ochre-400 w-20 py-0.5"
        />
      </div>
    </div>
  )
}
