import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { TextArea } from '@/components/ui/TextArea'
import { Button } from '@/components/ui/Button'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

// ─── Delivery endpoint ─────────────────────────────────────────────
// Feedback is POSTed as JSON. Formspree (https://formspree.io) is the
// recommended host — sign up, create a form, and paste the endpoint URL
// here (looks like `https://formspree.io/f/xxxxxxx`). Until an endpoint
// is configured, the modal falls back to a `mailto:` link so no
// submission is lost.
//
// If you'd rather use a Cloudflare Worker or other backend, keep the
// same shape: POST JSON with `{ message, email, source, userAgent }`.
const FEEDBACK_ENDPOINT = (import.meta.env.VITE_FEEDBACK_ENDPOINT as string | undefined) ?? ''
const MAILTO_FALLBACK = 'hello@storyfolio.co'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorText, setErrorText] = useState('')

  // Reset form state whenever the modal reopens so old success/error
  // screens never linger into a new session.
  useEffect(() => {
    if (isOpen) {
      setMessage('')
      setEmail('')
      setStatus('idle')
      setErrorText('')
    }
  }, [isOpen])

  const canSubmit = message.trim().length > 0 && status !== 'sending'

  const handleSubmit = async () => {
    if (!canSubmit) return

    // No endpoint configured → fall back to mailto so the user still
    // has a way to reach the maker. Don't mark this as "sent" since we
    // can't confirm delivery.
    if (!FEEDBACK_ENDPOINT) {
      const subject = encodeURIComponent('Storyfolio feedback')
      const body = encodeURIComponent(message + (email ? `\n\n— ${email}` : ''))
      window.location.href = `mailto:${MAILTO_FALLBACK}?subject=${subject}&body=${body}`
      return
    }

    setStatus('sending')
    setErrorText('')

    try {
      const res = await fetch(FEEDBACK_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          email: email.trim() || undefined,
          source: 'storyfolio-app',
          userAgent: navigator.userAgent,
        }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || `Request failed (${res.status})`)
      }

      setStatus('sent')
    } catch (err) {
      setStatus('error')
      setErrorText(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send feedback">
      <div className="p-6 flex flex-col gap-5">
        {status === 'sent' ? (
          <SentState onClose={onClose} />
        ) : (
          <>
            <p className="font-sans text-sm text-ink-500/70 leading-relaxed">
              Tell me what worked, what didn't, or what you wish Storyfolio could do.
              Every note goes straight to the maker.
            </p>

            <TextArea
              label="Your feedback"
              placeholder="What's on your mind?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              autoFocus
            />

            <Input
              label="Email (optional)"
              type="email"
              placeholder="only if you'd like a reply"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            {status === 'error' && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700">
                {errorText || "Couldn't send. Try again in a moment."}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <p className="font-sans text-[11px] text-ink-500/45 leading-relaxed">
                No tracking. Just the message you write.
              </p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  loading={status === 'sending'}
                >
                  {status === 'sending' ? 'Sending…' : 'Send feedback'}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

function SentState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-4">
      <div className="w-12 h-12 rounded-full bg-ochre-500/10 flex items-center justify-center text-xl text-ochre-500">
        ✦
      </div>
      <h3 className="font-serif text-lg text-ink-700">Thank you.</h3>
      <p className="font-sans text-sm text-ink-500/70 max-w-sm leading-relaxed">
        Your note is on its way. If you left an email, I'll reply when I can.
      </p>
      <div className="mt-2">
        <Button variant="primary" onClick={onClose}>Back to your book</Button>
      </div>
    </div>
  )
}
