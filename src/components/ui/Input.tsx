import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, className = '', ...rest }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-sans font-medium text-ink-500/70 uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        className={[
          'w-full rounded-xl bg-cream-100 border border-cream-300',
          'px-3 py-2.5 font-sans text-sm text-ink-500 placeholder:text-ink-500/40',
          'focus:outline-none focus:ring-2 focus:ring-ochre-400/50 focus:border-ochre-400',
          'transition-colors duration-150',
          className,
        ].join(' ')}
        {...rest}
      />
    </div>
  )
}
