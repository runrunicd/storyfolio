import { useState } from 'react'
import { useProjectStore } from '@/store'
import { useAppStore } from '@/store'

const CARD_COLORS = [
  'bg-ochre-400/20 border-ochre-400/30',
  'bg-moss-400/20 border-moss-400/30',
  'bg-[#D4A096]/20 border-[#D4A096]/30',
  'bg-[#2C3A5C]/10 border-[#2C3A5C]/20',
  'bg-cream-300 border-cream-400',
]

export function ProjectsView() {
  const { projects, addProject, deleteProject } = useProjectStore()
  const { setActiveProjectId, setActiveView } = useAppStore()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const openProject = (id: string) => {
    setActiveProjectId(id)
    useProjectStore.getState().setActiveProject(id)
    setActiveView('dream')
  }

  const handleNew = () => {
    const id = addProject('Untitled Story')
    useProjectStore.getState().setActiveProject(id)
    setActiveProjectId(id)
    setActiveView('dream')
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (confirmDelete === id) {
      deleteProject(id)
      setConfirmDelete(null)
    } else {
      setConfirmDelete(id)
      setTimeout(() => setConfirmDelete(null), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-cream-100 px-10 py-12">
      {/* Header */}
      <div className="max-w-5xl mx-auto">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h1 className="font-serif text-4xl text-ink-700 mb-1">Storyfolio</h1>
            <p className="font-sans text-sm text-ink-500/60">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </p>
          </div>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-5 py-2.5 bg-ochre-500 text-white font-sans text-sm font-medium rounded-xl hover:bg-ochre-600 transition-colors shadow-soft"
          >
            <span>+</span> New Project
          </button>
        </div>

        {/* Project grid */}
        {projects.length === 0 ? (
          <div className="text-center py-24">
            <p className="font-serif text-2xl text-ink-700/40 mb-2">No projects yet</p>
            <p className="font-sans text-sm text-ink-500/40 mb-6">Start your first picture book</p>
            <button
              onClick={handleNew}
              className="px-6 py-3 bg-ochre-500 text-white font-sans text-sm font-medium rounded-xl hover:bg-ochre-600 transition-colors"
            >
              Create a Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {projects.map((project, i) => {
              const colorClass = CARD_COLORS[i % CARD_COLORS.length]
              const filledSpreads = project.storyFlow.filter((s) => s.manuscriptText).length
              const isDeleting = confirmDelete === project.id

              return (
                <div
                  key={project.id}
                  onClick={() => openProject(project.id)}
                  className={`group relative cursor-pointer rounded-2xl border-2 ${colorClass} p-5 hover:shadow-medium transition-all duration-200 hover:-translate-y-0.5`}
                >
                  {/* Cover area */}
                  <div className="aspect-[3/4] rounded-xl bg-cream-100/60 mb-4 flex items-end p-3">
                    <p className="font-serif text-sm text-ink-700 leading-snug line-clamp-3">
                      {project.title}
                    </p>
                  </div>

                  {/* Meta */}
                  <p className="font-sans text-xs text-ink-500/60 mb-0.5 truncate">{project.title}</p>
                  <p className="font-sans text-[10px] text-ink-500/40">
                    {filledSpreads} / 16 spreads · {new Date(project.updatedAt).toLocaleDateString()}
                  </p>

                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDelete(e, project.id)}
                    className={[
                      'absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-xs',
                      'opacity-0 group-hover:opacity-100 transition-all',
                      isDeleting
                        ? 'bg-red-500 text-white opacity-100'
                        : 'bg-cream-100/80 text-ink-500/50 hover:text-red-500',
                    ].join(' ')}
                    title={isDeleting ? 'Click again to confirm' : 'Delete project'}
                  >
                    {isDeleting ? '✓' : '✕'}
                  </button>
                </div>
              )
            })}

            {/* New project card */}
            <button
              onClick={handleNew}
              className="aspect-[3/4] rounded-2xl border-2 border-dashed border-cream-300 hover:border-ochre-400 hover:bg-cream-200/30 transition-all flex flex-col items-center justify-center gap-2 text-ink-500/40 hover:text-ochre-500 group"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">+</span>
              <span className="font-sans text-xs">New Project</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
