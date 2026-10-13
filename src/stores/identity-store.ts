import { create } from 'zustand'
import type { AppSettings, LocalIdentity, RecentProject } from '@/types'

function createDeviceSecret(): string {
  const a = crypto.randomUUID().replace(/-/g, '')
  const b = crypto.randomUUID().replace(/-/g, '')
  return `ac-${a}${b}`
}

const IDENTITY_KEY = 'architecture-canvas:identity'
const SETTINGS_KEY = 'architecture-canvas:settings'
const RECENT_KEY = 'architecture-canvas:recent'

const defaultSettings: AppSettings = {
  appearance: 'light',
  showGrid: true,
  reducedMotion: false,
  displayName: '',
  onboardingSeen: false,
  lastProjectId: null,
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getRecentProjects(): RecentProject[] {
  return readJson<RecentProject[]>(RECENT_KEY) ?? []
}

export function recordRecentProject(entry: RecentProject): void {
  const list = getRecentProjects().filter((p) => p.id !== entry.id)
  list.unshift(entry)
  writeJson(RECENT_KEY, list.slice(0, 12))
}

export function removeRecentProject(projectId: string): void {
  writeJson(
    RECENT_KEY,
    getRecentProjects().filter((p) => p.id !== projectId),
  )
}

type IdentityState = {
  identity: LocalIdentity | null
  settings: AppSettings
  hydrated: boolean
  hydrate: () => void
  setDisplayName: (name: string) => void
  updateSettings: (patch: Partial<AppSettings>) => void
  ensureIdentity: () => LocalIdentity
  persistIdentity: (identity: LocalIdentity) => void
}

export const useIdentityStore = create<IdentityState>((set, get) => ({
  identity: null,
  settings: defaultSettings,
  hydrated: false,

  hydrate: () => {
    const storedIdentity = readJson<LocalIdentity>(IDENTITY_KEY)
    const storedSettings = readJson<Partial<AppSettings>>(SETTINGS_KEY)
    set({
      identity: storedIdentity,
      settings: storedSettings
        ? { ...defaultSettings, ...storedSettings, appearance: 'light' }
        : defaultSettings,
      hydrated: true,
    })
  },

  setDisplayName: (name: string) => {
    const identity = get().ensureIdentity()
    const next = { ...identity, displayName: name.trim().slice(0, 80) }
    writeJson(IDENTITY_KEY, next)
    set({ identity: next })
    const settings = { ...get().settings, displayName: next.displayName }
    writeJson(SETTINGS_KEY, settings)
    set({ settings })
  },

  updateSettings: (patch: Partial<AppSettings>) => {
    const settings = { ...get().settings, ...patch, appearance: 'light' as const }
    writeJson(SETTINGS_KEY, settings)
    set({ settings })
  },

  persistIdentity: (identity) => {
    writeJson(IDENTITY_KEY, identity)
    set({ identity })
  },

  ensureIdentity: () => {
    const current = get().identity
    if (current) return current
    const next: LocalIdentity = {
      installationId: crypto.randomUUID(),
      displayName: get().settings.displayName || 'Guest',
      deviceSecret: createDeviceSecret(),
    }
    writeJson(IDENTITY_KEY, next)
    set({ identity: next })
    return next
  },
}))
