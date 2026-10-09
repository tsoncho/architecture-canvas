import { toPng } from 'html-to-image'
import { downloadDataUrl, sanitizeFilename } from '@/lib/download'

function shouldIncludeNode(node: HTMLElement): boolean {
  if (node.dataset?.exportIgnore === 'true') return false
  const cls = typeof node.className === 'string' ? node.className : ''
  // Keep the diagram only — skip chrome / selection UI if present inside the flow root.
  if (cls.includes('react-flow__controls')) return false
  if (cls.includes('react-flow__minimap')) return false
  if (cls.includes('react-flow__panel')) return false
  if (cls.includes('react-flow__attribution')) return false
  return true
}

export async function exportPng(element: HTMLElement, fileName: string): Promise<string> {
  const safeName = sanitizeFilename(
    fileName.replace(/\.png$/i, ''),
    'architecture',
  )
  const finalName = `${safeName}.png`

  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor:
      getComputedStyle(document.documentElement).getPropertyValue('--color-canvas').trim() ||
      '#f3f4f6',
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return true
      return shouldIncludeNode(node)
    },
  })

  downloadDataUrl(dataUrl, finalName)
  return finalName
}
