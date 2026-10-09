import type { NodeType } from '@/types'

export type NodeCatalogEntry = {
  type: NodeType
  label: string
  defaultName: string
  defaultColor: string
  defaultTechnology: string
}

export const NODE_CATALOG: Record<NodeType, NodeCatalogEntry> = {
  application: {
    type: 'application',
    label: 'Application',
    defaultName: 'Frontend',
    defaultColor: '#3b82f6',
    defaultTechnology: 'React',
  },
  service: {
    type: 'service',
    label: 'Service',
    defaultName: 'Service',
    defaultColor: '#8b5cf6',
    defaultTechnology: 'Node.js',
  },
  database: {
    type: 'database',
    label: 'Database',
    defaultName: 'Database',
    defaultColor: '#16a34a',
    defaultTechnology: 'PostgreSQL',
  },
  api: {
    type: 'api',
    label: 'API',
    defaultName: 'API',
    defaultColor: '#06b6d4',
    defaultTechnology: 'REST',
  },
  server: {
    type: 'server',
    label: 'Server',
    defaultName: 'Server',
    defaultColor: '#f97316',
    defaultTechnology: 'Linux',
  },
  queue: {
    type: 'queue',
    label: 'Queue',
    defaultName: 'Queue',
    defaultColor: '#d97706',
    defaultTechnology: 'Redis',
  },
  external: {
    type: 'external',
    label: 'External',
    defaultName: 'External system',
    defaultColor: '#6b7280',
    defaultTechnology: 'Third party',
  },
  user: {
    type: 'user',
    label: 'User',
    defaultName: 'User',
    defaultColor: '#78716c',
    defaultTechnology: 'Person',
  },
  group: {
    type: 'group',
    label: 'Group',
    defaultName: 'Group',
    defaultColor: '#94a3b8',
    defaultTechnology: '',
  },
  text: {
    type: 'text',
    label: 'Text',
    defaultName: 'Note',
    defaultColor: '#111827',
    defaultTechnology: '',
  },
}

export const ADDABLE_NODE_TYPES: NodeType[] = [
  'application',
  'service',
  'database',
  'api',
  'server',
  'queue',
  'external',
  'user',
  'group',
  'text',
]

export function defaultNodeSize(type: NodeType): { width: number; height: number } {
  if (type === 'group') return { width: 480, height: 320 }
  if (type === 'text') return { width: 200, height: 56 }
  if (type === 'user') return { width: 160, height: 72 }
  return { width: 220, height: 88 }
}
