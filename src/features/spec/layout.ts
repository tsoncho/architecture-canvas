import { defaultNodeSize } from '@/lib/node-types'
import type { NodeType } from '@/types'
import type { ArchitectureSpec, ArchitectureSpecEdge, ArchitectureSpecNode } from './types'

const ORIGIN_X = 80
const ORIGIN_Y = 72
const GAP_X = 300
const GAP_Y = 36
const OVERLAP_PAD = 40

/** Prefer left-to-right architecture lanes by node kind. */
function typeLane(type: NodeType): number {
  switch (type) {
    case 'user':
    case 'external':
      return 0
    case 'application':
    case 'text':
      return 1
    case 'api':
    case 'service':
    case 'server':
    case 'group':
      return 2
    case 'queue':
    case 'database':
      return 3
    default:
      return 2
  }
}

function nodeSize(node: ArchitectureSpecNode): { w: number; h: number } {
  const fallback = defaultNodeSize(node.type)
  return {
    w: node.width && node.width > 0 ? node.width : fallback.width,
    h: node.height && node.height > 0 ? node.height : fallback.height,
  }
}

function boxesOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return !(
    a.x + a.w + OVERLAP_PAD <= b.x ||
    b.x + b.w + OVERLAP_PAD <= a.x ||
    a.y + a.h + OVERLAP_PAD <= b.y ||
    b.y + b.h + OVERLAP_PAD <= a.y
  )
}

function graphDepths(
  nodes: ArchitectureSpecNode[],
  edges: ArchitectureSpecEdge[],
): Map<string, number> {
  const ids = nodes.map((n) => n.id)
  const idSet = new Set(ids)
  const succs = new Map<string, string[]>()
  const indeg = new Map<string, number>()
  for (const id of ids) {
    succs.set(id, [])
    indeg.set(id, 0)
  }
  for (const edge of edges) {
    if (!idSet.has(edge.from) || !idSet.has(edge.to) || edge.from === edge.to) continue
    succs.get(edge.from)!.push(edge.to)
    indeg.set(edge.to, (indeg.get(edge.to) ?? 0) + 1)
  }

  const queue = ids.filter((id) => (indeg.get(id) ?? 0) === 0)
  const order: string[] = []
  const pending = new Map(indeg)
  while (queue.length > 0) {
    const u = queue.shift()!
    order.push(u)
    for (const v of succs.get(u) ?? []) {
      const next = (pending.get(v) ?? 1) - 1
      pending.set(v, next)
      if (next === 0) queue.push(v)
    }
  }

  const depth = new Map<string, number>()
  for (const id of ids) depth.set(id, 0)
  for (const u of order) {
    for (const v of succs.get(u) ?? []) {
      depth.set(v, Math.max(depth.get(v) ?? 0, (depth.get(u) ?? 0) + 1))
    }
  }
  return depth
}

/** True when coordinates are missing, piled up, or heavily overlapping. */
export function needsAutoLayout(nodes: ArchitectureSpecNode[]): boolean {
  if (nodes.length === 0) return false
  const positioned = nodes.filter(
    (n) =>
      typeof n.x === 'number' &&
      typeof n.y === 'number' &&
      Number.isFinite(n.x) &&
      Number.isFinite(n.y),
  )
  if (positioned.length < nodes.length) return true
  if (positioned.every((n) => Math.abs(n.x!) < 48 && Math.abs(n.y!) < 48)) return true

  let overlaps = 0
  for (let i = 0; i < positioned.length; i += 1) {
    const a = positioned[i]!
    const as = nodeSize(a)
    const boxA = { x: a.x!, y: a.y!, w: as.w, h: as.h }
    for (let j = i + 1; j < positioned.length; j += 1) {
      const b = positioned[j]!
      const bs = nodeSize(b)
      if (boxesOverlap(boxA, { x: b.x!, y: b.y!, w: bs.w, h: bs.h })) overlaps += 1
    }
  }
  return overlaps >= Math.max(1, Math.floor(nodes.length / 3))
}

/**
 * Layered left→right layout from edges + type lanes.
 * Clients/users left, apps next, APIs/services middle, data/queues right.
 */
export function autoLayoutSpecNodes(
  nodes: ArchitectureSpecNode[],
  edges: ArchitectureSpecEdge[],
): ArchitectureSpecNode[] {
  if (nodes.length === 0) return nodes

  const depth = graphDepths(nodes, edges)
  const outgoing = new Map<string, number>()
  for (const n of nodes) outgoing.set(n.id, 0)
  for (const e of edges) {
    if (outgoing.has(e.from)) outgoing.set(e.from, (outgoing.get(e.from) ?? 0) + 1)
  }

  const layers = new Map<number, ArchitectureSpecNode[]>()
  for (const node of nodes) {
    const layer = Math.max(typeLane(node.type), depth.get(node.id) ?? 0)
    const list = layers.get(layer) ?? []
    list.push(node)
    layers.set(layer, list)
  }

  for (const list of layers.values()) {
    list.sort((a, b) => {
      const outDiff = (outgoing.get(b.id) ?? 0) - (outgoing.get(a.id) ?? 0)
      if (outDiff !== 0) return outDiff
      return a.name.localeCompare(b.name)
    })
  }

  const positioned: ArchitectureSpecNode[] = []
  for (const layer of [...layers.keys()].sort((a, b) => a - b)) {
    const list = layers.get(layer) ?? []
    const heights = list.map((n) => nodeSize(n).h)
    const stackHeight =
      heights.reduce((s, h) => s + h, 0) + Math.max(0, list.length - 1) * GAP_Y
    let y = ORIGIN_Y + Math.max(0, (520 - stackHeight) / 2)
    const x = ORIGIN_X + layer * GAP_X
    for (const node of list) {
      const size = nodeSize(node)
      positioned.push({
        ...node,
        x,
        y: Math.round(y),
        width: node.width ?? size.w,
        height: node.height ?? size.h,
      })
      y += size.h + GAP_Y
    }
  }

  return positioned
}

/** Keep good AI layouts; rebuild when missing, piled, or overlapping. */
export function ensureSpecLayout(spec: ArchitectureSpec): ArchitectureSpec {
  if (!needsAutoLayout(spec.nodes)) {
    return {
      ...spec,
      nodes: spec.nodes.map((n) => ({
        ...n,
        x: Math.round(n.x!),
        y: Math.round(n.y!),
      })),
    }
  }
  return {
    ...spec,
    nodes: autoLayoutSpecNodes(spec.nodes, spec.edges),
  }
}
