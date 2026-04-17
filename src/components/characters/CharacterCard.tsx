import { useProjectStore } from '@/store'
import { ImageUploadSlot } from '@/components/ui/ImageUploadSlot'
import { Input } from '@/components/ui/Input'
import { TextArea } from '@/components/ui/TextArea'
import { TagEditor } from './TagEditor'
import { PromptPreview } from './PromptPreview'
import type { Character } from '@/types'

interface CharacterCardProps {
  character: Character
}

export function CharacterCard({ character }: CharacterCardProps) {
  const { updateCharacter, addTag, removeTag, setCharacterImage } = useProjectStore()

  return (
    <div className="bg-cream-200 rounded-2xl border border-cream-300 p-6 shadow-soft">
      {/* Top row: image + basic info */}
      <div className="flex gap-5 mb-5">
        <ImageUploadSlot
          dataUrl={character.referenceImageDataUrl}
          onUpload={(url) => setCharacterImage(character.id, url)}
          onRemove={() => setCharacterImage(character.id, null)}
          aspectRatio="1/1"
          label="Reference image"
          className="w-36 shrink-0"
        />
        <div className="flex-1 flex flex-col gap-3">
          <Input
            value={character.name}
            onChange={(e) => updateCharacter(character.id, { name: e.target.value })}
            placeholder="Character name"
            className="font-serif text-xl text-ink-700 bg-transparent border-0 border-b border-dashed border-cream-400 rounded-none px-0 focus:ring-0 focus:border-ochre-400"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Species / Type"
              value={character.species}
              onChange={(e) => updateCharacter(character.id, { species: e.target.value })}
              placeholder="e.g. barn owl"
            />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-sans font-medium text-ink-500/70 uppercase tracking-wide">
                Role
              </label>
              <select
                value={character.role}
                onChange={(e) => updateCharacter(character.id, { role: e.target.value as Character['role'] })}
                className="rounded-xl bg-cream-100 border border-cream-300 px-3 py-2.5 font-sans text-sm text-ink-500 focus:outline-none focus:ring-2 focus:ring-ochre-400/50"
              >
                <option value="main">Main</option>
                <option value="supporting">Supporting</option>
                <option value="background">Background</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-3 mb-4">
        <TagEditor
          tags={character.personalityTags}
          type="personality"
          label="Personality"
          onAdd={(label) => addTag(character.id, 'personality', label)}
          onRemove={(id) => removeTag(character.id, id)}
        />
        <TagEditor
          tags={character.visualTags}
          type="visual"
          label="Visual Traits"
          onAdd={(label) => addTag(character.id, 'visual', label)}
          onRemove={(id) => removeTag(character.id, id)}
        />
      </div>

      {/* Notes */}
      <TextArea
        label="Notes"
        value={character.notes}
        onChange={(e) => updateCharacter(character.id, { notes: e.target.value })}
        placeholder="Background, arc, relationships..."
      />

      {/* Prompt preview */}
      <PromptPreview characterId={character.id} />
    </div>
  )
}
