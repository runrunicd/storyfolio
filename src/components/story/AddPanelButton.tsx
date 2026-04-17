interface AddPanelButtonProps {
  onClick: () => void
}

export function AddPanelButton({ onClick }: AddPanelButtonProps) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full py-4 border-2 border-dashed border-cream-300 rounded-2xl',
        'flex items-center justify-center gap-2',
        'text-ink-500/50 hover:text-ochre-500 hover:border-ochre-400',
        'font-sans text-sm transition-colors duration-150',
      ].join(' ')}
    >
      <span className="text-lg leading-none">+</span>
      Add Page
    </button>
  )
}
