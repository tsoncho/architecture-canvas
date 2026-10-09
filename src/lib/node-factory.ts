import { NODE_CATALOG, defaultNodeSize } from '@/lib/node-types'
import type { ArchitectureEdge, ArchitectureNode, NodeType } from '@/types'

export function createArchitectureNode(input: {
  projectId: string
  type: NodeType
  userId: string
  positionX: number
  positionY: number
  name?: string
}): ArchitectureNode {
  const catalog = NODE_CATALOG[input.type]
  const size = defaultNodeSize(input.type)
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    type: input.type,
    name: input.name ?? catalog.defaultName,
    description: '',
    technology: catalog.defaultTechnology,
    color: catalog.defaultColor,
    positionX: input.positionX,
    positionY: input.positionY,
    width: size.width,
    height: size.height,
    zIndex: input.type === 'group' ? 0 : 1,
    parentGroupId: null,
    metadata: {},
    updatedBy: input.userId,
    createdAt: now,
    updatedAt: now,
  }
}

export function createArchitectureEdge(input: {
  projectId: string
  sourceNodeId: string
  targetNodeId: string
  userId: string
  label?: string
}): ArchitectureEdge {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    sourceNodeId: input.sourceNodeId,
    targetNodeId: input.targetNodeId,
    label: input.label ?? '',
    edgeType: 'default',
    style: {},
    updatedBy: input.userId,
    createdAt: now,
    updatedAt: now,
  }
}
