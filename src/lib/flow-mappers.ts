import type { Edge, Node } from '@xyflow/react'
import type { ArchitectureEdge, ArchitectureNode } from '@/types'

export type ArchitectureFlowData = {
  architectureNode: ArchitectureNode
}

export type ArchitectureEdgeData = {
  architectureEdge: ArchitectureEdge
}

export function toFlowNode(node: ArchitectureNode): Node<ArchitectureFlowData> {
  const flowType =
    node.type === 'group' ? 'group' : node.type === 'text' ? 'text' : 'architecture'
  return {
    id: node.id,
    type: flowType,
    position: { x: node.positionX, y: node.positionY },
    data: { architectureNode: node },
    style: {
      width: node.width || 220,
      height: node.height || 88,
    },
    zIndex: node.zIndex,
  }
}

export function toFlowEdge(edge: ArchitectureEdge): Edge<ArchitectureEdgeData> {
  return {
    id: edge.id,
    source: edge.sourceNodeId,
    target: edge.targetNodeId,
    type: 'labeled',
    label: edge.label,
    data: { architectureEdge: edge },
  }
}
