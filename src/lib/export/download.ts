export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, '').trim()
  return cleaned.slice(0, 60) || 'untitled'
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  downloadBlob(filename, blob)
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  downloadUrl(filename, url)
  URL.revokeObjectURL(url)
}

export function downloadDataUrl(filename: string, dataUrl: string): void {
  downloadUrl(filename, dataUrl)
}

function downloadUrl(filename: string, url: string): void {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
}
