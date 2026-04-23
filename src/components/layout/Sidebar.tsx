import { useAppStore, useProjectStore, useActiveProject } from '@/store'
import type { ViewId } from '@/types'

interface NavItem {
  id: ViewId
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dream',   label: 'Story',   icon: '✦' },
  { id: 'draw',    label: 'Draw',    icon: '✏' },
  { id: 'publish', label: 'Publish', icon: '◎' },
]

// Partner tab is always shown so the feature is discoverable. When AI is
// not enabled, the tab renders greyed out with an "off" dot, and clicking
// opens Settings (pre-focused on AI) rather than switching to a dead view.
const PARTNER_NAV_ITEM: NavItem = { id: 'partner', label: 'Partner', icon: '✧' }

export function Sidebar() {
  const activeView = useAppStore((s) => s.activeView)
  const setActiveView = useAppStore((s) => s.setActiveView)
  const setActiveProjectId = useAppStore((s) => s.setActiveProjectId)
  const openSettings = useAppStore((s) => s.openSettings)
  const aiEnabled = useAppStore((s) => s.settings.aiEnabled)
  const project = useActiveProject()

  const goHome = () => {
    useProjectStore.getState().setActiveProject(null)
    setActiveProjectId(null)
  }

  const handlePartnerClick = () => {
    if (aiEnabled) {
      setActiveView('partner')
    } else {
      // Feature isn't active yet — send the user to Settings so they
      // understand why it's off and can opt in. Keeps the "AI is optional"
      // posture while making discovery obvious.
      openSettings()
    }
  }

  return (
    <aside className="w-[72px] flex flex-col items-center py-5 bg-cream-200 border-r border-cream-300 h-screen shrink-0">
      {/* Back to projects */}
      <button
        onClick={goHome}
        title="All Projects"
        className="w-12 h-7 rounded-lg flex items-center justify-center text-ink-500/40 hover:bg-cream-100/70 hover:text-ink-700 transition-colors mb-4 text-xs"
      >
        ←
      </button>

      {/* Project title pill */}
      {project && (
        <div className="w-10 mb-5 overflow-hidden">
          <p
            className="font-sans text-[9px] text-ink-500/50 text-center leading-tight line-clamp-3 break-words"
            title={project.title}
          >
            {project.title}
          </p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex flex-col items-center gap-1 flex-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            title={item.label}
            className={[
              'w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all duration-150',
              activeView === item.id
                ? 'bg-cream-100 shadow-soft text-ochre-500'
                : 'text-ink-500/40 hover:bg-cream-100/70 hover:text-ink-700',
            ].join(' ')}
          >
            <span className="text-base leading-none">{item.icon}</span>
            <span className="text-[9px] font-sans font-medium leading-none">{item.label}</span>
          </button>
        ))}

        {/* Partner — always shown. Greyed + dot when AI is off. */}
        <button
          onClick={handlePartnerClick}
          title={aiEnabled ? 'Creative Partner' : 'Creative Partner — enable AI in Settings'}
          className={[
            'relative w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all duration-150',
            activeView === PARTNER_NAV_ITEM.id && aiEnabled
              ? 'bg-cream-100 shadow-soft text-ochre-500'
              : aiEnabled
              ? 'text-ink-500/40 hover:bg-cream-100/70 hover:text-ink-700'
              // Greyed state — visibly dimmer, still hoverable so it's discoverable
              : 'text-ink-500/25 hover:bg-cream-100/50 hover:text-ink-500/50',
          ].join(' ')}
        >
          <span className="text-base leading-none">{PARTNER_NAV_ITEM.icon}</span>
          <span className="text-[9px] font-sans font-medium leading-none">{PARTNER_NAV_ITEM.label}</span>
          {/* Off-state dot — tiny outlined circle at top-right, signals disabled */}
          {!aiEnabled && (
            <span
              aria-hidden
              className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full border border-ink-500/30 bg-cream-200"
            />
          )}
        </button>
      </nav>

      {/* Settings */}
      <button
        onClick={openSettings}
        title="Settings"
        className="w-12 h-12 rounded-xl flex items-center justify-center text-ink-500/30 hover:bg-cream-100/70 hover:text-ink-700 transition-colors"
      >
        <span className="text-base">⚙</span>
      </button>
    </aside>
  )
}
