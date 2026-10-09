import type { AppSettings } from '@/types'

/** Single fixed light theme — no dark/system switch. */
export function applyAppearanceClass(settings: AppSettings): void {
  document.documentElement.classList.remove('dark')
  document.documentElement.style.colorScheme = 'light'
  if (settings.reducedMotion) {
    document.documentElement.classList.add('reduce-motion')
  } else {
    document.documentElement.classList.remove('reduce-motion')
  }
}
