import type { AppSettings } from '@/types'

/** Single fixed light theme — ignore OS dark mode entirely. */
export function applyAppearanceClass(settings: AppSettings): void {
  const root = document.documentElement
  root.classList.remove('dark')
  root.style.colorScheme = 'light'
  document.body?.style.setProperty('color-scheme', 'light')
  if (settings.reducedMotion) {
    root.classList.add('reduce-motion')
  } else {
    root.classList.remove('reduce-motion')
  }
}
