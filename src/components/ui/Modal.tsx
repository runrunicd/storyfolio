import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: string
}

export function Modal({ isOpen, onClose, title, children, width = 'max-w-lg' }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-900/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={`relative w-full ${width} bg-cream-100 rounded-2xl shadow-lifted border border-cream-300 overflow-hidden`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-cream-300">
          <h2 className="font-serif text-lg text-ink-700">{title}</h2>
          <button
            onClick={onClose}
            className="text-ink-500 hover:text-ink-700 transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-cream-200"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto max-h-[80vh]">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
