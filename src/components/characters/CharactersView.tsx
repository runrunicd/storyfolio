import { useState } from 'react'
import { useProjectStore, useActiveProject } from '@/store'
import { CharacterCard } from './CharacterCard'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

export function CharactersView() {
  const { addCharacter, deleteCharacter } = useProjectStore()
  const project = useActiveProject()
  const characters = project?.characters ?? []
  const [activeId, setActiveId] = useState<string | null>(characters[0]?.id ?? null)

  const activeCharacter = characters.find((c) => c.id === activeId) ?? characters[0]

  const handleAdd = () => {
    addCharacter()
    setTimeout(() => {
      const proj = useProjectStore.getState().projects.find(
        (p) => p.id === useProjectStore.getState().activeProjectId
      )
      const last = proj?.characters[proj.characters.length - 1]
      if (last) setActiveId(last.id)
    }, 0)
  }

  const handleDelete = (id: string) => {
    deleteCharacter(id)
    const remaining = characters.filter((c) => c.id !== id)
    setActiveId(remaining[0]?.id ?? null)
  }

  return (
    <div className="flex h-full">
      {/* Character list sidebar */}
      <div className="w-48 shrink-0 border-r border-cream-300 bg-cream-200/50 flex flex-col">
        <div className="px-4 py-5 border-b border-cream-300 flex items-center justify-between">
          <h2 className="font-serif text-sm text-ink-700">Characters</h2>
          <button
            onClick={handleAdd}
            title="Add character"
            className="w-6 h-6 flex items-center justify-center rounded-lg bg-ochre-500 text-white text-sm hover:bg-ochre-600 transition-colors"
          >
            +
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {characters.map((c) => (
            <div key={c.id} className="relative group">
              <button
                onClick={() => setActiveId(c.id)}
                className={[
                  'w-full text-left px-4 py-2.5 font-sans text-sm transition-colors',
                  activeCharacter?.id === c.id
                    ? 'bg-cream-100 text-ochre-600 font-medium'
                    : 'text-ink-500 hover:bg-cream-100/70',
                ].join(' ')}
              >
                <span className="block truncate">{c.name}</span>
                <span className="block text-xs text-ink-500/50 truncate">{c.species || 'No species'}</span>
              </button>
              <button
                onClick={() => handleDelete(c.id)}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-ink-500/40 hover:text-red-500 text-xs transition-all"
              >
                ✕
              </button>
            </div>
          ))}
        </nav>
      </div>

      {/* Main workspace */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        {activeCharacter ? (
          <CharacterCard character={activeCharacter} />
        ) : (
          <EmptyState
            icon="🐦"
            title="No characters yet"
            description="Add your first character to start building their profile."
            action={<Button variant="primary" onClick={handleAdd}>Add Character</Button>}
          />
        )}
      </div>
    </div>
  )
}
