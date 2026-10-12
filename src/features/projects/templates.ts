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
    description: 'Merchants → Dashboard → Gateway → services → Postgres / Redis / Stripe',
    nodes: [
      {
        type: 'user',
        name: 'Merchant',
        technology: 'Browser',
        color: '#78716c',
        x: 40,
        y: 220,
      },
      {
        type: 'application',
        name: 'Dashboard',
        technology: 'React',
        color: '#3b82f6',
        x: 280,
        y: 200,
      },
      {
        type: 'api',
        name: 'API Gateway',
        technology: 'Kong',
        color: '#06b6d4',
        x: 540,
        y: 200,
      },
      {
        type: 'service',
        name: 'Auth Service',
        technology: 'Go',
        color: '#8b5cf6',
        x: 820,
        y: 40,
      },
      {
        type: 'service',
        name: 'User Service',
        technology: 'Node.js',
        color: '#8b5cf6',
        x: 820,
        y: 200,
      },
      {
        type: 'service',
        name: 'Payment Service',
        technology: 'Java',
        color: '#8b5cf6',
        x: 820,
        y: 360,
      },
      {
        type: 'database',
        name: 'Postgres',
        technology: 'PostgreSQL',
        color: '#16a34a',
        x: 1100,
        y: 120,
      },
      {
        type: 'queue',
        name: 'Job Queue',
        technology: 'Redis',
        color: '#d97706',
        x: 1100,
        y: 300,
      },
      {
        type: 'external',
        name: 'Stripe',
        technology: 'Payments API',
        color: '#6b7280',
        x: 1100,
        y: 460,
      },
    ],
    edges: [
      { sourceIndex: 0, targetIndex: 1, label: 'HTTPS' },
      { sourceIndex: 1, targetIndex: 2, label: 'REST' },
      { sourceIndex: 2, targetIndex: 3, label: 'route' },
      { sourceIndex: 2, targetIndex: 4, label: 'route' },
      { sourceIndex: 2, targetIndex: 5, label: 'route' },
      { sourceIndex: 3, targetIndex: 6, label: 'store' },
      { sourceIndex: 4, targetIndex: 6, label: 'store' },
      { sourceIndex: 5, targetIndex: 6, label: 'store' },
      { sourceIndex: 5, targetIndex: 7, label: 'enqueue' },
      { sourceIndex: 5, targetIndex: 8, label: 'charge' },
    ],
  },
]

export function getTemplateById(id: string): ProjectTemplate | undefined {
  return PROJECT_TEMPLATES.find((t) => t.id === id)
}
