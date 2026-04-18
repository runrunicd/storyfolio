import { useState } from 'react'
import { useAppStore } from '@/store'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { estimateStorageUsage } from '@/lib/storage'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, setApiKey } = useAppStore()
  const [localKey, setLocalKey] = useState(settings.claudeApiKey)

  const handleSave = () => {
    setApiKey(localKey.trim())
    onClose()
  }

  const { usedMB } = estimateStorageUsage()

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings">
      <div className="p-6 flex flex-col gap-6">

        {/* Claude API Key */}
        <section className="flex flex-col gap-3">
          <div>
            <h3 className="font-serif text-base text-ink-700 mb-1">Claude API Key</h3>
            <p className="font-sans text-xs text-ink-500/60 leading-relaxed">
              Your API key is stored only in your browser and sent directly to Anthropic's API.
              It is never sent to any third-party server.
            </p>
          </div>
          <Input
            type="password"
            value={localKey}
            onChange={(e) => setLocalKey(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
            placeholder="sk-ant-api03-..."
          />
          <p className="font-sans text-xs text-ink-500/50">
            Need a key?{' '}
            <a
              href="https://console.anthropic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ochre-500 hover:underline"
            >
              console.anthropic.com
            </a>
          </p>
          <div className="flex justify-end">
            <Button variant="primary" onClick={handleSave}>
              Save Key
            </Button>
          </div>
        </section>

        <hr className="border-cream-300" />

        {/* Storage */}
        <section>
          <h3 className="font-serif text-base text-ink-700 mb-2">Data & Storage</h3>
          <div className="bg-cream-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="font-sans text-sm text-ink-500">Browser storage used</span>
            <span className="font-sans text-sm font-medium text-ink-700">{usedMB} MB</span>
          </div>
          <p className="mt-2 font-sans text-xs text-ink-500/60 leading-relaxed">
            Images are stored as base64 in your browser. Large images may approach storage limits.
            We recommend resizing to under 1200 px before uploading.
          </p>
        </section>

        <hr className="border-cream-300" />

        {/* About */}
        <section>
          <h3 className="font-serif text-base text-ink-700 mb-1">About Storyfolio</h3>
          <p className="font-sans text-xs text-ink-500/60 leading-relaxed">
            A quiet workspace for picture book author-illustrators. Version 0.1.0.
          </p>
        </section>
      </div>
    </Modal>
  )
}
