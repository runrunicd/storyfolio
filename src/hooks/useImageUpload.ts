import { useRef, useState } from 'react'
import { MAX_IMAGE_DATA_URL_BYTES } from '@/lib/storage'

interface UseImageUploadOptions {
  maxBytes?: number
}

interface UseImageUploadReturn {
  triggerUpload: () => void
  inputProps: React.ComponentPropsWithRef<'input'>
  isLoading: boolean
  error: string | null
}

// Resize an image file to fit within maxBytes using canvas, trying progressively
// lower quality and smaller dimensions until it fits.
function resizeToDataUrl(file: File, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      const MAX_DIMENSION = 1600
      let width = img.naturalWidth
      let height = img.naturalHeight

      // Scale down if either dimension exceeds the max
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas not available')); return }

      const draw = (w: number, h: number) => {
        canvas.width = w
        canvas.height = h
        ctx.drawImage(img, 0, 0, w, h)
      }

      // Try progressively lower JPEG quality at current dimensions
      draw(width, height)
      for (const quality of [0.85, 0.72, 0.6, 0.45]) {
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        if (dataUrl.length <= maxBytes) { resolve(dataUrl); return }
      }

      // Still too large — halve the dimensions and try again
      draw(Math.round(width / 2), Math.round(height / 2))
      for (const quality of [0.85, 0.7, 0.55]) {
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        if (dataUrl.length <= maxBytes) { resolve(dataUrl); return }
      }

      // Accept whatever we have at minimum quality rather than blocking
      resolve(canvas.toDataURL('image/jpeg', 0.4))
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image'))
    }

    img.src = objectUrl
  })
}

export function useImageUpload(
  onUpload: (dataUrl: string) => void,
  options: UseImageUploadOptions = {}
): UseImageUploadReturn {
  const maxBytes = options.maxBytes ?? MAX_IMAGE_DATA_URL_BYTES
  const inputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const triggerUpload = () => {
    setError(null)
    inputRef.current?.click()
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setIsLoading(true)
    setError(null)

    try {
      const dataUrl = await resizeToDataUrl(file, maxBytes)
      onUpload(dataUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process the image.')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    triggerUpload,
    inputProps: {
      ref: inputRef,
      type: 'file',
      accept: 'image/jpeg,image/png,image/gif,image/webp',
      onChange: handleChange,
      style: { display: 'none' },
    },
    isLoading,
    error,
  }
}
