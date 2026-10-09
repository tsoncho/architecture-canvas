import type { AppSettings } from '@/types'

export function resolveAppearance(settings: AppSettings): 'light' | 'dark' {
  if (settings.appearance === 'dark') return 'dark'
  if (settings.appearance === 'light') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyAppearanceClass(settings: AppSettings): void {
  const mode = resolveAppearance(settings)
  document.documentElement.classList.toggle('dark', mode === 'dark')
  if (settings.reducedMotion) {
    document.documentElement.classList.add('reduce-motion')
  } else {
    document.documentElement.classList.remove('reduce-motion')
  }
}
