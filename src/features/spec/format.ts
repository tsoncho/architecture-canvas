import { NODE_CATALOG, defaultNodeSize } from '@/lib/node-types'
import type { ArchitectureEdge, ArchitectureNode, NodeType } from '@/types'
import { ensureSpecLayout } from './layout'
import { SPEC_LIMITS } from './limits'
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
    let id = slugify(node.name).slice(0, SPEC_LIMITS.maxIdLength)
    if (used.has(id)) {
      let n = 2
      while (used.has(`${id}-${n}`.slice(0, SPEC_LIMITS.maxIdLength))) n += 1
      id = `${id}-${n}`.slice(0, SPEC_LIMITS.maxIdLength)
    }
    used.add(id)
    map.set(node.id, id)
  }
  return map
}

function clip(value: string | undefined, max: number): string | undefined {
  if (value == null) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, max)
}

/** Export current canvas into a portable Architecture Spec. */
export function exportArchitectureSpec(input: {
  name?: string
  nodes: ArchitectureNode[]
  edges: ArchitectureEdge[]
}): ArchitectureSpec {
  const idMap = uniqueIds(input.nodes)
  const nodes: ArchitectureSpecNode[] = [...input.nodes]
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
    .map((node) => ({
      id: idMap.get(node.id)!,
      type: node.type,
      name: node.name.slice(0, SPEC_LIMITS.maxNameLength),
      technology: clip(node.technology, SPEC_LIMITS.maxTechnologyLength),
      description: clip(node.description, SPEC_LIMITS.maxDescriptionLength),
      color: node.color || undefined,
      x: Math.round(node.positionX),
      y: Math.round(node.positionY),
      width: Math.round(node.width),
      height: Math.round(node.height),
    }))

  const edges: ArchitectureSpecEdge[] = []
  for (const edge of [...input.edges].sort((a, b) => a.id.localeCompare(b.id))) {
    const from = idMap.get(edge.sourceNodeId)
    const to = idMap.get(edge.targetNodeId)
    if (!from || !to) continue
    edges.push({
      from,
      to,
      label: clip(edge.label, SPEC_LIMITS.maxLabelLength),
    })
  }

  return {
    version: 1,
    name: clip(input.name, SPEC_LIMITS.maxProjectNameLength),
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

function requireVersion(raw: unknown): 1 {
  if (raw === undefined || raw === null) return 1
  if (typeof raw !== 'number' || !Number.isInteger(raw)) {
    throw new Error('Architecture Spec "version" must be an integer.')
  }
  if (!(SPEC_LIMITS.supportedVersions as readonly number[]).includes(raw)) {
    throw new Error(
      `Unsupported Architecture Spec version ${raw}. Supported: ${SPEC_LIMITS.supportedVersions.join(', ')}.`,
    )
  }
  return raw as 1
}

/** Parse paste/file text into a validated Architecture Spec. */
export function parseArchitectureSpec(raw: string): ArchitectureSpec {
  if (typeof raw !== 'string') {
    throw new Error('Architecture Spec must be text.')
  }
  if (raw.length > SPEC_LIMITS.maxJsonBytes) {
    throw new Error(
      `Architecture Spec is too large (max ${Math.round(SPEC_LIMITS.maxJsonBytes / 1000)} KB).`,
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('That does not look like valid JSON.')
  }

  // Allow accidental wrappers: { architecture: {...} }
  if (isRecord(parsed) && isRecord(parsed.architecture)) {
    parsed = parsed.architecture
  }

  if (!isRecord(parsed)) {
    throw new Error('Architecture Spec must be a JSON object.')
  }

  const version = requireVersion(parsed.version)
  const nodesRaw = parsed.nodes
  const edgesRaw = parsed.edges ?? []
  if (!Array.isArray(nodesRaw)) {
    throw new Error('Architecture Spec needs a "nodes" array.')
  }
  if (!Array.isArray(edgesRaw)) {
    throw new Error('"edges" must be an array when present.')
  }
  if (nodesRaw.length > SPEC_LIMITS.maxNodes) {
    throw new Error(`Too many nodes (max ${SPEC_LIMITS.maxNodes}).`)
  }
  if (edgesRaw.length > SPEC_LIMITS.maxEdges) {
    throw new Error(`Too many edges (max ${SPEC_LIMITS.maxEdges}).`)
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
    if (id.length > SPEC_LIMITS.maxIdLength) {
      throw new Error(`Node id "${id.slice(0, 24)}…" is too long.`)
    }
    if (!type || !NODE_TYPES.has(type)) {
      throw new Error(
        `Node "${id}" has unknown type "${type ?? ''}". Allowed: ${[...NODE_TYPES].join(', ')}.`,
      )
    }
    if (!name) throw new Error(`Node "${id}" needs a "name".`)
    if (name.length > SPEC_LIMITS.maxNameLength) {
      throw new Error(`Node "${id}" name is too long (max ${SPEC_LIMITS.maxNameLength}).`)
    }
    if (seen.has(id)) throw new Error(`Duplicate node id "${id}".`)
    seen.add(id)

    const x = asNumber(item.x)
    const y = asNumber(item.y)
    const width = asNumber(item.width)
    const height = asNumber(item.height)
    if (item.x !== undefined && x === undefined) {
      throw new Error(`Node "${id}" has a non-finite "x".`)
    }
    if (item.y !== undefined && y === undefined) {
      throw new Error(`Node "${id}" has a non-finite "y".`)
    }

    nodes.push({
      id,
      type: type as NodeType,
      name: name.slice(0, SPEC_LIMITS.maxNameLength),
      technology: clip(asString(item.technology), SPEC_LIMITS.maxTechnologyLength),
      description: clip(asString(item.description), SPEC_LIMITS.maxDescriptionLength),
      color: asString(item.color)?.trim() || undefined,
      x,
      y,
      width,
      height,
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
      label: clip(asString(item.label), SPEC_LIMITS.maxLabelLength),
    })
  }

  return {
    version,
    name: clip(asString(parsed.name), SPEC_LIMITS.maxProjectNameLength),
    description: clip(asString(parsed.description), SPEC_LIMITS.maxDescriptionLength),
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
