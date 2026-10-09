/** Safe Windows / browser download filename. */
export function sanitizeFilename(name: string, fallback = 'architecture'): string {
  const cleaned = name
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return cleaned || fallback
}

function triggerDownload(href: string, fileName: string): void {
  const link = document.createElement('a')
  link.href = href
  link.download = fileName
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export function downloadDataUrl(dataUrl: string, fileName: string): string {
  triggerDownload(dataUrl, fileName)
  return fileName
}

export function downloadBlob(blob: Blob, fileName: string): string {
  const url = URL.createObjectURL(blob)
  try {
    triggerDownload(url, fileName)
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 2_000)
  }
  return fileName
}

export function downloadText(
  text: string,
  fileName: string,
  mime = 'application/json;charset=utf-8',
): string {
  return downloadBlob(new Blob([text], { type: mime }), fileName)
}

export function downloadsFolderMessage(fileName: string): string {
  return `Saved “${fileName}” to your Downloads folder`
}
