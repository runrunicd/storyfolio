import { useEffect, useRef, type TextareaHTMLAttributes } from 'react'

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export function TextArea({ label, className = '', onChange, ...rest }: TextAreaProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = () => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  useEffect(() => { resize() }, [rest.value])

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-sans font-medium text-ink-500/70 uppercase tracking-wide">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        rows={3}
        className={[
          'w-full resize-none rounded-xl bg-cream-100 border border-cream-300',
          'px-3 py-2.5 font-sans text-sm text-ink-500 placeholder:text-ink-500/40',
          'focus:outline-none focus:ring-2 focus:ring-ochre-400/50 focus:border-ochre-400',
          'transition-colors duration-150 overflow-hidden',
          className,
        ].join(' ')}
        onChange={(e) => { onChange?.(e); resize() }}
        {...rest}
      />
    </div>
  )
}
