import { toPng } from 'html-to-image'

export async function exportPng(element: HTMLElement, fileName: string): Promise<void> {
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue(
      '--color-canvas',
    ) || '#f4f5f7',
  })

  const link = document.createElement('a')
  link.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`
  link.href = dataUrl
  link.click()
}
