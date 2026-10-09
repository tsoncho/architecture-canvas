import { MarkerType, type Edge, type Node } from '@xyflow/react'
import {
  parallelEdgeSlot,
  parallelPathOffset,
  pickHandlePair,
} from '@/lib/edge-routing'
import type { ArchitectureEdge, ArchitectureNode } from '@/types'

export type ArchitectureFlowData = {
  architectureNode: ArchitectureNode
}

export type ArchitectureEdgeData = {
  architectureEdge: ArchitectureEdge
  pathOffset?: number
}

export function toFlowNode(node: ArchitectureNode): Node<ArchitectureFlowData> {
  const flowType =
    node.type === 'group' ? 'group' : node.type === 'text' ? 'text' : 'architecture'
  const width = node.width > 0 ? node.width : 220
  const height = node.height > 0 ? node.height : 88
  return {
    id: node.id,
    type: flowType,
    position: { x: node.positionX, y: node.positionY },
    data: { architectureNode: node },
    width,
    height,
    style: { width, height },
    zIndex: node.zIndex ?? 1,
  }
}

export function toFlowEdge(
  edge: ArchitectureEdge,
  nodes: ArchitectureNode[],
  allEdges: ArchitectureEdge[],
): Edge<ArchitectureEdgeData> {
  const source = nodes.find((n) => n.id === edge.sourceNodeId)
  const target = nodes.find((n) => n.id === edge.targetNodeId)
  const auto =
    source && target
      ? pickHandlePair(source, target)
      : { sourceHandle: 'right' as const, targetHandle: 'left' as const }

  // Prefer geometry-based ports so links stay clean when nodes move.
  // Manual ports only win if explicitly locked after a drag-from-handle.
  const locked = edge.style.lockHandles === true
  const sourceHandle = locked && typeof edge.style.sourceHandle === 'string'
    ? edge.style.sourceHandle
    : auto.sourceHandle
  const targetHandle = locked && typeof edge.style.targetHandle === 'string'
    ? edge.style.targetHandle
    : auto.targetHandle

  const { index, count } = parallelEdgeSlot(edge, allEdges)
  const pathOffset = parallelPathOffset(index, count)

  return {
    id: edge.id,
    source: edge.sourceNodeId,
    target: edge.targetNodeId,
    sourceHandle,
    targetHandle,
    type: 'labeled',
    label: edge.label || undefined,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 18,
      height: 18,
      color: '#94a3b8',
    },
    data: { architectureEdge: edge, pathOffset },
  }
}
