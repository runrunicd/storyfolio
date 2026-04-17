export const MAX_IMAGE_DATA_URL_BYTES = 800_000

export function safeSetItem(key: string, value: string): { ok: boolean; error?: string } {
  try {
    localStorage.setItem(key, value)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown storage error'
    console.warn(`[fable] localStorage quota exceeded for key "${key}":`, msg)
    return { ok: false, error: msg }
  }
}

export function estimateStorageUsage(): { usedBytes: number; usedMB: string } {
  let total = 0
  for (const key of Object.keys(localStorage)) {
    const value = localStorage.getItem(key) ?? ''
    total += key.length + value.length
  }
  // Each JS character is 2 bytes in UTF-16
  const usedBytes = total * 2
  const usedMB = (usedBytes / (1024 * 1024)).toFixed(2)
  return { usedBytes, usedMB }
}

export function isImageTooLarge(dataUrl: string): boolean {
  return dataUrl.length > MAX_IMAGE_DATA_URL_BYTES
}
