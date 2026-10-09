export type NodeType =
  | 'application'
  | 'service'
  | 'database'
  | 'api'
  | 'server'
  | 'queue'
  | 'external'
  | 'user'
  | 'group'
  | 'text'

export type ArchitectureNode = {
  id: string
  projectId: string
  type: NodeType
  name: string
  description: string
  technology: string
  color: string
  positionX: number
  positionY: number
  width: number
  height: number
  zIndex: number
  parentGroupId: string | null
  metadata: Record<string, unknown>
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

export type ArchitectureEdge = {
  id: string
  projectId: string
  sourceNodeId: string
  targetNodeId: string
  label: string
  edgeType: string
  style: Record<string, unknown>
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

export type Project = {
  id: string
  name: string
  joinCode: string
  createdAt: string
  updatedAt: string
}

export type ProjectMember = {
  id: string
  projectId: string
  userId: string
  displayName: string
  createdAt: string
  lastSeenAt: string
}

export type PresenceUser = {
  userId: string
  displayName: string
  color: string
  selectedIds?: string[]
}

export type SaveStatus = 'saved' | 'saving' | 'offline' | 'error'

export type RecentProject = {
  id: string
  name: string
  joinCode: string
  memberCount: number
  lastOpenedAt: string
  updatedAt: string
}

export type LocalIdentity = {
  installationId: string
  displayName: string
}

export type AppSettings = {
  appearance: 'system' | 'light' | 'dark'
  showGrid: boolean
  reducedMotion: boolean
  displayName: string
  onboardingSeen: boolean
  /** Last project opened in the editor — used to resume on launch. */
  lastProjectId: string | null
}

export type OutboxItem = {
  id: string
  projectId: string
  table: 'nodes' | 'edges' | 'projects' | 'project_members'
  op: 'insert' | 'update' | 'delete'
  payload: Record<string, unknown>
  createdAt: string
}

export type ProjectSnapshot = {
  project: Project
  members: ProjectMember[]
  nodes: ArchitectureNode[]
  edges: ArchitectureEdge[]
  cachedAt: string
}
