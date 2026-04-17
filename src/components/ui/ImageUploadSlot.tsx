import { useImageUpload } from '@/hooks/useImageUpload'

interface ImageUploadSlotProps {
  dataUrl: string | null
  onUpload: (dataUrl: string) => void
  onRemove?: () => void
  aspectRatio?: '1/1' | '4/3' | '16/9' | '3/2'
  label?: string
  className?: string
}

const aspectClasses: Record<string, string> = {
  '1/1':  'aspect-square',
  '4/3':  'aspect-[4/3]',
  '16/9': 'aspect-video',
  '3/2':  'aspect-[3/2]',
}

export function ImageUploadSlot({
  dataUrl,
  onUpload,
  onRemove,
  aspectRatio = '4/3',
  label = 'Click to upload image',
  className = '',
}: ImageUploadSlotProps) {
  const { triggerUpload, inputProps, isLoading, error } = useImageUpload(onUpload)

  return (
    <div className={`relative ${className}`}>
      <input {...inputProps} />

      {dataUrl ? (
        <div className={`relative group rounded-xl overflow-hidden ${aspectClasses[aspectRatio]} bg-cream-300`}>
          <img src={dataUrl} alt="Uploaded" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-ink-900/0 group-hover:bg-ink-900/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              onClick={triggerUpload}
              className="px-3 py-1.5 bg-cream-100 text-ink-700 text-xs rounded-lg font-medium shadow-medium"
            >
              Replace
            </button>
            {onRemove && (
              <button
                onClick={onRemove}
                className="px-3 py-1.5 bg-red-50 text-red-700 text-xs rounded-lg font-medium shadow-medium"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={triggerUpload}
          disabled={isLoading}
          className={[
            'w-full rounded-xl border-2 border-dashed border-cream-300',
            'hover:border-ochre-400 hover:bg-cream-200/50 transition-colors',
            'flex flex-col items-center justify-center gap-2 text-ink-500/60',
            'cursor-pointer',
            aspectClasses[aspectRatio],
          ].join(' ')}
        >
          {isLoading ? (
            <span className="w-5 h-5 border-2 border-ink-500/40 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span className="text-2xl opacity-40">⬆</span>
              <span className="text-xs font-sans">{label}</span>
              <span className="text-[10px] opacity-60">PNG or JPG · max ~600 KB</span>
            </>
          )}
        </button>
      )}

      {error && (
        <p className="mt-1 text-xs text-red-600 font-sans">{error}</p>
      )}
    </div>
  )
}
