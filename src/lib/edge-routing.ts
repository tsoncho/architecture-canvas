import type { ArchitectureEdge, ArchitectureNode } from '@/types'

export type HandleSide = 'top' | 'right' | 'bottom' | 'left'

type Box = { x: number; y: number; w: number; h: number }

function boxOf(node: ArchitectureNode): Box {
  return {
    x: node.positionX,
    y: node.positionY,
    w: node.width > 0 ? node.width : 220,
    h: node.height > 0 ? node.height : 88,
  }
}

/** Pick opposite ports so the link leaves toward the target (architecture L→R bias). */
export function pickHandlePair(
  source: ArchitectureNode,
  target: ArchitectureNode,
): { sourceHandle: HandleSide; targetHandle: HandleSide } {
  const s = boxOf(source)
  const t = boxOf(target)
  const dx = t.x + t.w / 2 - (s.x + s.w / 2)
  const dy = t.y + t.h / 2 - (s.y + s.h / 2)

  // Prefer horizontal ports — diagrams read left→right.
  if (Math.abs(dx) >= Math.abs(dy) * 0.85) {
    return dx >= 0
      ? { sourceHandle: 'right', targetHandle: 'left' }
      : { sourceHandle: 'left', targetHandle: 'right' }
  }
  return dy >= 0
    ? { sourceHandle: 'bottom', targetHandle: 'top' }
    : { sourceHandle: 'top', targetHandle: 'bottom' }
}

/**
 * Index among edges sharing the same unordered node pair (for fan-out).
 * Returns { index, count } where index is 0..count-1.
 */
export function parallelEdgeSlot(
  edge: ArchitectureEdge,
  all: ArchitectureEdge[],
): { index: number; count: number } {
  const a = edge.sourceNodeId
  const b = edge.targetNodeId
  const siblings = all.filter(
    (e) =>
      (e.sourceNodeId === a && e.targetNodeId === b) ||
      (e.sourceNodeId === b && e.targetNodeId === a),
  )
  const sorted = [...siblings].sort((x, y) => x.id.localeCompare(y.id))
  const index = sorted.findIndex((e) => e.id === edge.id)
  return { index: Math.max(0, index), count: sorted.length }
}

/** Pixel offset so parallel links don't stack on the same path. */
export function parallelPathOffset(index: number, count: number): number {
  if (count <= 1) return 0
  const mid = (count - 1) / 2
  return (index - mid) * 18
}
