import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/store'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { estimateStorageUsage } from '@/lib/storage'
import { PROVIDER_OPTIONS, keyFor } from '@/lib/ai'
import type { ProviderId } from '@/lib/ai'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Settings modal — overhauled for Day 3.
 *
 * AI is opt-in. When disabled, we hide provider controls entirely so the
 * Story/Draw/Publish loops read as "craft tool first, AI is an add-on".
 *
 * When enabled:
 *   • Provider dropdown — currently Gemini + Claude implemented; OpenAI/Kimi
 *     listed as "coming soon" and disabled.
 *   • One key field for the active provider. Other providers' keys persist
 *     quietly in storage (switch the dropdown to edit them).
 *
 * The Storage and About sections are unchanged.
 */
export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const settings = useAppStore((s) => s.settings)
  const setAiEnabled  = useAppStore((s) => s.setAiEnabled)
  const setAiProvider = useAppStore((s) => s.setAiProvider)
  const setProviderKey = useAppStore((s) => s.setProviderKey)
  const openFeedback = useAppStore((s) => s.openFeedback)

  const activeProvider: ProviderId = settings.aiProvider ?? 'gemini'

  // Local key draft — lets the user edit without writing every keystroke.
  // Resets when the modal opens or the provider changes.
  const [keyDraft, setKeyDraft] = useState('')
  useEffect(() => {
    if (isOpen) setKeyDraft(keyFor(activeProvider, settings))
  }, [isOpen, activeProvider, settings])

  const keyDirty = keyDraft.trim() !== (keyFor(activeProvider, settings) ?? '').trim()

  const activeOption = useMemo(
    () => PROVIDER_OPTIONS.find((p) => p.id === activeProvider),
    [activeProvider]
  )

  const { usedMB } = estimateStorageUsage()

  const handleSaveKey = () => {
    setProviderKey(activeProvider, keyDraft.trim())
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings">
      <div className="p-6 flex flex-col gap-6">

        {/* ── AI ───────────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-serif text-base text-ink-700 mb-1">AI</h3>
              <p className="font-sans text-xs text-ink-500/60 leading-relaxed">
                Optional. Enables the Creative Partner tab and design loops.
                Your API key stays in this browser.
              </p>
            </div>
            <Toggle
              checked={settings.aiEnabled}
              onChange={setAiEnabled}
              ariaLabel="Toggle AI"
            />
          </div>

          {settings.aiEnabled && (
            <div className="mt-2 flex flex-col gap-4 rounded-xl border border-cream-300 bg-cream-200/30 px-4 py-4">
              {/* Provider */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-sans font-medium text-ink-500/70 uppercase tracking-wide">
                  Provider
                </label>
                <select
                  value={activeProvider}
                  onChange={(e) => setAiProvider(e.target.value as ProviderId)}
                  className={[
                    'w-full rounded-xl bg-cream-100 border border-cream-300',
                    'px-3 py-2.5 font-sans text-sm text-ink-700',
                    'focus:outline-none focus:ring-2 focus:ring-ochre-400/50 focus:border-ochre-400',
                  ].join(' ')}
                >
                  {PROVIDER_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id} disabled={!opt.implemented}>
                      {opt.name}
                    </option>
                  ))}
                </select>
                {activeOption && !activeOption.implemented && (
                  <p className="font-sans text-xs text-red-600/80">
                    {activeOption.name} isn't wired up yet — pick Gemini or Claude for now.
                  </p>
                )}
              </div>

              {/* Key */}
              <div className="flex flex-col gap-1.5">
                <Input
                  label={`${providerLabel(activeProvider)} API key`}
                  type="password"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveKey() }}
                  placeholder={keyPlaceholder(activeProvider)}
                  autoComplete="off"
                />
                <div className="flex items-center justify-between">
                  <p className="font-sans text-xs text-ink-500/50">
                    Need a key?{' '}
                    <a
                      href={keyHelpUrl(activeProvider)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ochre-500 hover:underline"
                    >
                      {keyHelpHost(activeProvider)}
                    </a>
                  </p>
                  <Button
                    variant="primary"
                    onClick={handleSaveKey}
                    disabled={!keyDirty}
                  >
                    {keyDirty ? 'Save key' : 'Saved'}
                  </Button>
                </div>
                <p className="font-sans text-[11px] text-ink-500/40 leading-relaxed">
                  Keys for other providers persist in your browser — switch the dropdown to edit them.
                </p>
              </div>
            </div>
          )}
        </section>

        <hr className="border-cream-300" />

        {/* ── Storage ──────────────────────────────────────── */}
        <section>
          <h3 className="font-serif text-base text-ink-700 mb-2">Data &amp; Storage</h3>
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

        {/* ── Feedback ─────────────────────────────────────── */}
        <section>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-serif text-base text-ink-700 mb-1">Send feedback</h3>
              <p className="font-sans text-xs text-ink-500/60 leading-relaxed">
                Share a thought, bug, or wish. Goes straight to the maker.
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => { onClose(); openFeedback() }}
            >
              Write a note
            </Button>
          </div>
        </section>

        <hr className="border-cream-300" />

        {/* ── About ────────────────────────────────────────── */}
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

// ─── Small toggle control ──────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  ariaLabel: string
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={[
        'shrink-0 w-11 h-6 rounded-full relative transition-colors',
        checked ? 'bg-ochre-500' : 'bg-cream-300',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-0.5 w-5 h-5 rounded-full bg-cream-100 shadow-soft transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  )
}

// ─── Provider-specific copy ────────────────────────────────────────

function providerLabel(id: ProviderId): string {
  switch (id) {
    case 'gemini':    return 'Gemini'
    case 'anthropic': return 'Claude'
    case 'openai':    return 'OpenAI'
    case 'kimi':      return 'Kimi'
  }
}

function keyPlaceholder(id: ProviderId): string {
  switch (id) {
    case 'gemini':    return 'AIza...'
    case 'anthropic': return 'sk-ant-api03-...'
    case 'openai':    return 'sk-...'
    case 'kimi':      return 'sk-...'
  }
}

function keyHelpUrl(id: ProviderId): string {
  switch (id) {
    case 'gemini':    return 'https://aistudio.google.com/app/apikey'
    case 'anthropic': return 'https://console.anthropic.com'
    case 'openai':    return 'https://platform.openai.com/api-keys'
    case 'kimi':      return 'https://platform.moonshot.cn/console/api-keys'
  }
}

function keyHelpHost(id: ProviderId): string {
  switch (id) {
    case 'gemini':    return 'aistudio.google.com'
    case 'anthropic': return 'console.anthropic.com'
    case 'openai':    return 'platform.openai.com'
    case 'kimi':      return 'platform.moonshot.cn'
  }
}
