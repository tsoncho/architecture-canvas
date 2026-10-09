import { NODE_CATALOG, defaultNodeSize } from '@/lib/node-types'
import type { ArchitectureEdge, ArchitectureNode, NodeType } from '@/types'
import { ensureSpecLayout } from './layout'
import type {
  ArchitectureSpec,
  ArchitectureSpecEdge,
  ArchitectureSpecNode,
} from './types'

const NODE_TYPES = new Set<string>(Object.keys(NODE_CATALOG))

function slugify(value: string): string {
  const base = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'node'
}

function uniqueIds(nodes: ArchitectureNode[]): Map<string, string> {
  const used = new Set<string>()
  const map = new Map<string, string>()
  for (const node of nodes) {
    let id = slugify(node.name)
    if (used.has(id)) {
      let n = 2
      while (used.has(`${id}-${n}`)) n += 1
      id = `${id}-${n}`
    }
    used.add(id)
    map.set(node.id, id)
  }
  return map
}

/** Export current canvas into a portable Architecture Spec. */
export function exportArchitectureSpec(input: {
  name?: string
  nodes: ArchitectureNode[]
  edges: ArchitectureEdge[]
}): ArchitectureSpec {
  const idMap = uniqueIds(input.nodes)
  const nodes: ArchitectureSpecNode[] = input.nodes.map((node) => ({
    id: idMap.get(node.id)!,
    type: node.type,
    name: node.name,
    technology: node.technology || undefined,
    description: node.description || undefined,
    color: node.color || undefined,
    x: Math.round(node.positionX),
    y: Math.round(node.positionY),
    width: Math.round(node.width),
    height: Math.round(node.height),
  }))

  const edges: ArchitectureSpecEdge[] = []
  for (const edge of input.edges) {
    const from = idMap.get(edge.sourceNodeId)
    const to = idMap.get(edge.targetNodeId)
    if (!from || !to) continue
    edges.push({
      from,
      to,
      label: edge.label || undefined,
    })
  }

  return {
    version: 1,
    name: input.name,
    nodes,
    edges,
  }
}

export function stringifyArchitectureSpec(spec: ArchitectureSpec): string {
  return `${JSON.stringify(spec, null, 2)}\n`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/** Parse paste/file text into a validated Architecture Spec. */
export function parseArchitectureSpec(raw: string): ArchitectureSpec {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('That does not look like valid JSON.')
  }

  // Allow accidental wrappers: { architecture: {...} } or a bare array of nodes
  if (isRecord(parsed) && isRecord(parsed.architecture)) {
    parsed = parsed.architecture
  }

  if (!isRecord(parsed)) {
    throw new Error('Architecture Spec must be a JSON object.')
  }

  const nodesRaw = parsed.nodes
  const edgesRaw = parsed.edges ?? []
  if (!Array.isArray(nodesRaw)) {
    throw new Error('Architecture Spec needs a "nodes" array.')
  }
  if (!Array.isArray(edgesRaw)) {
    throw new Error('"edges" must be an array when present.')
  }

  const nodes: ArchitectureSpecNode[] = []
  const seen = new Set<string>()

  for (const [index, item] of nodesRaw.entries()) {
    if (!isRecord(item)) {
      throw new Error(`Node #${index + 1} is invalid.`)
    }
    const id = asString(item.id)?.trim()
    const type = asString(item.type)?.trim()
    const name = asString(item.name)?.trim()
    if (!id) throw new Error(`Node #${index + 1} needs an "id".`)
    if (!type || !NODE_TYPES.has(type)) {
      throw new Error(
        `Node "${id}" has unknown type "${type ?? ''}". Allowed: ${[...NODE_TYPES].join(', ')}.`,
      )
    }
    if (!name) throw new Error(`Node "${id}" needs a "name".`)
    if (seen.has(id)) throw new Error(`Duplicate node id "${id}".`)
    seen.add(id)

    nodes.push({
      id,
      type: type as NodeType,
      name,
      technology: asString(item.technology),
      description: asString(item.description),
      color: asString(item.color),
      x: asNumber(item.x),
      y: asNumber(item.y),
      width: asNumber(item.width),
      height: asNumber(item.height),
    })
  }

  const edges: ArchitectureSpecEdge[] = []
  for (const [index, item] of edgesRaw.entries()) {
    if (!isRecord(item)) {
      throw new Error(`Edge #${index + 1} is invalid.`)
    }
    const from = asString(item.from)?.trim() ?? asString(item.source)?.trim()
    const to = asString(item.to)?.trim() ?? asString(item.target)?.trim()
    if (!from || !to) {
      throw new Error(`Edge #${index + 1} needs "from" and "to".`)
    }
    if (!seen.has(from) || !seen.has(to)) {
      throw new Error(`Edge #${index + 1} references unknown node ids (${from} → ${to}).`)
    }
    edges.push({
      from,
      to,
      label: asString(item.label),
    })
  }

  return {
    version: 1,
    name: asString(parsed.name),
    description: asString(parsed.description),
    nodes,
    edges,
  }
}

/** Convert Spec → canvas nodes/edges with fresh UUIDs. Auto-layout messy/missing coords. */
export function specToCanvas(input: {
  spec: ArchitectureSpec
  projectId: string
  userId: string
}): { nodes: ArchitectureNode[]; edges: ArchitectureEdge[] } {
  const laidOut = ensureSpecLayout(input.spec)
  const now = new Date().toISOString()
  const idMap = new Map<string, string>()
  const nodes: ArchitectureNode[] = []

  for (const draft of laidOut.nodes) {
    const uuid = crypto.randomUUID()
    idMap.set(draft.id, uuid)
    const size = defaultNodeSize(draft.type)
    const catalog = NODE_CATALOG[draft.type]
    nodes.push({
      id: uuid,
      projectId: input.projectId,
      type: draft.type,
      name: draft.name,
      description: draft.description ?? '',
      technology: draft.technology ?? catalog.defaultTechnology,
      color: draft.color ?? catalog.defaultColor,
      positionX: draft.x ?? 80,
      positionY: draft.y ?? 80,
      width: draft.width ?? size.width,
      height: draft.height ?? size.height,
      zIndex: draft.type === 'group' ? 0 : 1,
      parentGroupId: null,
      metadata: { specId: draft.id },
      updatedBy: input.userId,
      createdAt: now,
      updatedAt: now,
    })
  }

  const edges: ArchitectureEdge[] = laidOut.edges.map((draft) => ({
    id: crypto.randomUUID(),
    projectId: input.projectId,
    sourceNodeId: idMap.get(draft.from)!,
    targetNodeId: idMap.get(draft.to)!,
    label: draft.label ?? '',
    edgeType: 'default',
    style: {},
    updatedBy: input.userId,
    createdAt: now,
    updatedAt: now,
  }))

  return { nodes, edges }
}
