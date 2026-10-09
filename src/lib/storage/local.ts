import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type {
  AppSettings,
  LocalIdentity,
  OutboxItem,
  ProjectSnapshot,
  RecentProject,
} from '@/types'

const DB_NAME = 'architecture-canvas'
const DB_VERSION = 1

const IDENTITY_KEY = 'identity'
const SETTINGS_KEY = 'settings'

const DEFAULT_SETTINGS: AppSettings = {
  appearance: 'system',
  showGrid: true,
  reducedMotion: false,
  displayName: '',
  onboardingSeen: false,
}

interface ArchitectureCanvasDB extends DBSchema {
  kv: {
    key: string
    value: LocalIdentity | AppSettings
  }
  recentProjects: {
    key: string
    value: RecentProject
    indexes: { byLastOpened: string }
  }
  snapshots: {
    key: string
    value: ProjectSnapshot
  }
  outbox: {
    key: string
    value: OutboxItem
    indexes: { byProject: string }
  }
}

let dbPromise: Promise<IDBPDatabase<ArchitectureCanvasDB>> | null = null

function getDb(): Promise<IDBPDatabase<ArchitectureCanvasDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ArchitectureCanvasDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('kv')) {
          db.createObjectStore('kv')
        }
        if (!db.objectStoreNames.contains('recentProjects')) {
          const store = db.createObjectStore('recentProjects', { keyPath: 'id' })
          store.createIndex('byLastOpened', 'lastOpenedAt')
        }
        if (!db.objectStoreNames.contains('snapshots')) {
          db.createObjectStore('snapshots', { keyPath: 'project.id' })
        }
        if (!db.objectStoreNames.contains('outbox')) {
          const store = db.createObjectStore('outbox', { keyPath: 'id' })
          store.createIndex('byProject', 'projectId')
        }
      },
    })
  }
  return dbPromise
}

export async function getIdentity(): Promise<LocalIdentity | null> {
  const db = await getDb()
  const value = await db.get('kv', IDENTITY_KEY)
  if (!value || !('installationId' in value)) return null
  return value
}

export async function setIdentity(identity: LocalIdentity): Promise<void> {
  const db = await getDb()
  await db.put('kv', identity, IDENTITY_KEY)
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDb()
  const value = await db.get('kv', SETTINGS_KEY)
  if (!value || !('appearance' in value)) return { ...DEFAULT_SETTINGS }
  return value
}

export async function setSettings(settings: AppSettings): Promise<void> {
  const db = await getDb()
  await db.put('kv', settings, SETTINGS_KEY)
}

export async function getRecentProjects(): Promise<RecentProject[]> {
  const db = await getDb()
  const items = await db.getAllFromIndex('recentProjects', 'byLastOpened')
  return items.sort(
    (a, b) =>
      new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime(),
  )
}

export async function upsertRecentProject(project: RecentProject): Promise<void> {
  const db = await getDb()
  await db.put('recentProjects', project)
}

export async function getSnapshot(
  projectId: string,
): Promise<ProjectSnapshot | null> {
  const db = await getDb()
  return (await db.get('snapshots', projectId)) ?? null
}

export async function saveSnapshot(snapshot: ProjectSnapshot): Promise<void> {
  const db = await getDb()
  await db.put('snapshots', snapshot)
}

export async function enqueueOutbox(item: OutboxItem): Promise<void> {
  const db = await getDb()
  await db.put('outbox', item)
}

export async function listOutbox(projectId?: string): Promise<OutboxItem[]> {
  const db = await getDb()
  if (projectId) {
    return db.getAllFromIndex('outbox', 'byProject', projectId)
  }
  return db.getAll('outbox')
}

export async function removeOutbox(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('outbox', id)
}

export async function clearOutboxForProject(projectId: string): Promise<void> {
  const db = await getDb()
  const items = await db.getAllFromIndex('outbox', 'byProject', projectId)
  const tx = db.transaction('outbox', 'readwrite')
  await Promise.all([
    ...items.map((item) => tx.store.delete(item.id)),
    tx.done,
  ])
}
