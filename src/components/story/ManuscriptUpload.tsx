import { useRef, useState } from 'react'
import { useAppStore, useActiveProject } from '@/store'
import { analyzeManuscript, type SpreadSuggestion } from '@/lib/manuscriptAnalyzer'

interface ManuscriptUploadProps {
  spreadCount: number
  onSuggestionsReady: (suggestions: SpreadSuggestion[]) => void
}

export function ManuscriptUpload({ spreadCount, onSuggestionsReady }: ManuscriptUploadProps) {
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const apiKey = useAppStore((s) => s.settings.claudeApiKey)
  const openSettings = useAppStore((s) => s.openSettings)
  const project = useActiveProject()

  const handleFile = (file: File) => {
    const isDocx = file.name.endsWith('.docx')
    const isText = file.name.endsWith('.md') || file.name.endsWith('.txt')
    if (!isDocx && !isText) {
      setError('Please upload a .md, .txt, or .docx file.')
      return
    }
    setError(null)

    if (isDocx) {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer
          const mammoth = await import('mammoth')
          const result = await mammoth.extractRawText({ arrayBuffer })
          setFileContent(result.value)
          setFileName(file.name)
        } catch {
          setError('Could not read the .docx file. Please try a different file.')
        }
      }
      reader.readAsArrayBuffer(file)
    } else {
      const reader = new FileReader()
      reader.onload = (e) => {
        setFileContent(e.target?.result as string)
        setFileName(file.name)
      }
      reader.readAsText(file)
    }
  }

  const analyze = async () => {
    if (!fileContent || !apiKey || !project) return
    setIsAnalyzing(true)
    setError(null)
    try {
      const suggestions = await analyzeManuscript({
        manuscriptText: fileContent,
        projectTitle: project.title,
        spreadCount,
        apiKey,
      })
      onSuggestionsReady(suggestions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const clear = () => {
    setFileContent(null)
    setFileName(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-2 pt-1">
      <input
        ref={inputRef}
        type="file"
        accept=".md,.txt,.docx"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {!fileContent ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="self-start font-sans text-xs text-ink-500/50 hover:text-ochre-600 border border-dashed border-cream-300 hover:border-ochre-400 hover:bg-ochre-500/5 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <span className="opacity-60">↑</span>
          Upload manuscript (.md / .docx)
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          {/* File info row */}
          <div className="flex items-center gap-2 bg-cream-200 border border-cream-300 rounded-lg px-3 py-1.5">
            <span className="font-sans text-xs text-moss-600">📄</span>
            <span className="font-sans text-xs text-ink-500 flex-1 truncate">{fileName}</span>
            <span className="font-sans text-[10px] text-ink-500/40">
              {fileContent.length.toLocaleString()} chars
            </span>
            <button
              onClick={clear}
              className="text-ink-500/30 hover:text-ink-500 transition-colors text-xs ml-1"
            >
              ×
            </button>
          </div>

          {/* Analyze button */}
          {apiKey ? (
            <button
              onClick={analyze}
              disabled={isAnalyzing}
              className={[
                'self-start font-sans text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5',
                isAnalyzing
                  ? 'bg-moss-500/10 text-moss-600 cursor-not-allowed'
                  : 'bg-moss-500 text-white hover:bg-moss-600',
              ].join(' ')}
            >
              {isAnalyzing ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>✦ Suggest {spreadCount} spreads</>
              )}
            </button>
          ) : (
            <p className="font-sans text-xs text-ink-500/60">
              <button onClick={openSettings} className="text-ochre-500 underline hover:text-ochre-600">
                Add your Claude API key
              </button>
              {' '}to analyze with AI.
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="font-sans text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
    </div>
  )
}
