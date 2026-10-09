import type { NodeType } from '@/types'

/** Portable, AI-friendly architecture document (no UUIDs required). */
export type ArchitectureSpec = {
  version: 1
  name?: string
  description?: string
  nodes: ArchitectureSpecNode[]
  edges: ArchitectureSpecEdge[]
}

export type ArchitectureSpecNode = {
  /** Stable string id used by edges, e.g. "frontend" or "payments-api" */
  id: string
  type: NodeType
  name: string
  technology?: string
  description?: string
  color?: string
  x?: number
  y?: number
  width?: number
  height?: number
}

export type ArchitectureSpecEdge = {
  from: string
  to: string
  label?: string
}
