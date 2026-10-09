import type { NodeType } from '@/types'

export type TemplateNodeDraft = {
  type: NodeType
  name: string
  technology: string
  color: string
  x: number
  y: number
}

export type TemplateEdgeDraft = {
  sourceIndex: number
  targetIndex: number
  label: string
}

export type ProjectTemplate = {
  id: string
  name: string
  description: string
  nodes: TemplateNodeDraft[]
  edges: TemplateEdgeDraft[]
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'simple-web',
    name: 'Simple web application',
    description: 'User → Frontend → API → Database',
    nodes: [
      {
        type: 'user',
        name: 'User',
        technology: 'Browser',
        color: '#78716c',
        x: 80,
        y: 200,
      },
      {
        type: 'application',
        name: 'Frontend',
        technology: 'React',
        color: '#3b82f6',
        x: 320,
        y: 200,
      },
      {
        type: 'api',
        name: 'API',
        technology: 'REST',
        color: '#06b6d4',
        x: 580,
        y: 200,
      },
      {
        type: 'database',
        name: 'Database',
        technology: 'PostgreSQL',
        color: '#16a34a',
        x: 840,
        y: 200,
      },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1, label: 'uses' },
      { sourceIndex: 1, targetIndex: 2, label: 'calls' },
      { sourceIndex: 2, targetIndex: 3, label: 'reads/writes' },
    ],
  },
  {
    id: 'mobile',
    name: 'Mobile application',
    description: 'Mobile App → Backend → Database',
    nodes: [
      {
        type: 'application',
        name: 'Mobile App',
        technology: 'React Native',
        color: '#3b82f6',
        x: 120,
        y: 220,
      },
      {
        type: 'service',
        name: 'Backend',
        technology: 'Node.js',
        color: '#8b5cf6',
        x: 420,
        y: 220,
      },
      {
        type: 'database',
        name: 'Database',
        technology: 'PostgreSQL',
        color: '#16a34a',
        x: 720,
        y: 220,
      },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1, label: 'HTTPS' },
      { sourceIndex: 1, targetIndex: 2, label: 'SQL' },
    ],
  },
  {
    id: 'microservices',
    name: 'Microservices',
    description: 'API Gateway → Auth / User / Payment → Database',
    nodes: [
      {
        type: 'api',
        name: 'API Gateway',
        technology: 'Kong',
        color: '#06b6d4',
        x: 360,
        y: 80,
      },
      {
        type: 'service',
        name: 'Auth Service',
        technology: 'Go',
        color: '#8b5cf6',
        x: 120,
        y: 280,
      },
      {
        type: 'service',
        name: 'User Service',
        technology: 'Node.js',
        color: '#8b5cf6',
        x: 360,
        y: 280,
      },
      {
        type: 'service',
        name: 'Payment Service',
        technology: 'Java',
        color: '#8b5cf6',
        x: 600,
        y: 280,
      },
      {
        type: 'database',
        name: 'Database',
        technology: 'PostgreSQL',
        color: '#16a34a',
        x: 360,
        y: 460,
      },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1, label: 'route' },
      { sourceIndex: 0, targetIndex: 2, label: 'route' },
      { sourceIndex: 0, targetIndex: 3, label: 'route' },
      { sourceIndex: 1, targetIndex: 4, label: 'store' },
      { sourceIndex: 2, targetIndex: 4, label: 'store' },
      { sourceIndex: 3, targetIndex: 4, label: 'store' },
    ],
  },
]

export function getTemplateById(id: string): ProjectTemplate | undefined {
  return PROJECT_TEMPLATES.find((t) => t.id === id)
}
