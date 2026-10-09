import { create } from 'zustand'
import type {
  ArchitectureEdge,
  ArchitectureNode,
  PresenceUser,
  Project,
  ProjectMember,
} from '@/types'
import { UndoStack } from '@/lib/undo'

const undoStack = new UndoStack<ArchitectureNode, ArchitectureEdge>(80)

/** Nested withHistory calls share one snapshot. */
let historyBatchDepth = 0

function stamp<T extends { updatedAt: string }>(item: T): T {
  return { ...item, updatedAt: new Date().toISOString() }
}

function newer(a: string, b: string): boolean {
  return new Date(a).getTime() >= new Date(b).getTime()
}

type ProjectState = {
  project: Project | null
  members: ProjectMember[]
  nodes: ArchitectureNode[]
  edges: ArchitectureEdge[]
  presence: PresenceUser[]
  canUndo: boolean
  canRedo: boolean
  undoLabel: string | null
  redoLabel: string | null
  historyDepth: number
  setProjectData: (payload: {
    project: Project
    members: ProjectMember[]
    nodes: ArchitectureNode[]
    edges: ArchitectureEdge[]
  }) => void
  setProject: (project: Project) => void
  setMembers: (members: ProjectMember[]) => void
  setPresence: (presence: PresenceUser[]) => void
  applyRemoteNode: (node: ArchitectureNode) => void
  applyRemoteEdge: (edge: ArchitectureEdge) => void
  applyRemoteNodeDelete: (id: string) => void
  applyRemoteEdgeDelete: (id: string) => void
  addNode: (node: ArchitectureNode, historyLabel?: string) => void
  updateNode: (id: string, patch: Partial<ArchitectureNode>, historyLabel?: string) => void
  /** Color/live paint — updates store without pushing undo. */
  patchNodeLive: (id: string, patch: Partial<ArchitectureNode>) => void
  deleteNodes: (ids: string[], historyLabel?: string) => void
  addEdge: (edge: ArchitectureEdge, historyLabel?: string) => void
  updateEdge: (id: string, patch: Partial<ArchitectureEdge>, historyLabel?: string) => void
  deleteEdges: (ids: string[], historyLabel?: string) => void
  moveNodes: (
    updates: Array<{ id: string; positionX: number; positionY: number }>,
    historyLabel?: string,
  ) => void
  resizeNode: (
    id: string,
    size: { width: number; height: number },
    historyLabel?: string,
  ) => void
  /** Run many store mutations as a single undo step. */
  withHistory: (label: string, run: () => void) => void
  undo: () => { label: string } | null
  redo: () => { label: string } | null
  replaceAll: (nodes: ArchitectureNode[], edges: ArchitectureEdge[], historyLabel?: string) => void
  reset: () => void
}

function syncUndoFlags(set: (partial: Partial<ProjectState>) => void) {
  set({
    canUndo: undoStack.canUndo,
    canRedo: undoStack.canRedo,
    undoLabel: undoStack.peekUndoLabel(),
    redoLabel: undoStack.peekRedoLabel(),
    historyDepth: undoStack.pastCount,
  })
}

function pushHistory(
  state: Pick<ProjectState, 'nodes' | 'edges'>,
  label: string,
  set: (partial: Partial<ProjectState>) => void,
) {
  if (historyBatchDepth > 0) return
  undoStack.push(state.nodes, state.edges, label)
  syncUndoFlags(set)
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: null,
  members: [],
  nodes: [],
  edges: [],
  presence: [],
  canUndo: false,
  canRedo: false,
  undoLabel: null,
  redoLabel: null,
  historyDepth: 0,

  setProjectData: ({ project, members, nodes, edges }) => {
    undoStack.clear()
    set({ project, members, nodes, edges })
    undoStack.rememberCurrent(nodes, edges)
    syncUndoFlags(set)
  },

  setProject: (project) => set({ project }),

  setMembers: (members) => set({ members }),

  setPresence: (presence) => set({ presence }),

  applyRemoteNode: (node) => {
    set((state) => {
      const idx = state.nodes.findIndex((n) => n.id === node.id)
      if (idx === -1) return { nodes: [...state.nodes, node] }
      const local = state.nodes[idx]!
      // Last-write-wins — never clobber a newer local edit from Realtime.
      if (newer(local.updatedAt, node.updatedAt) && local.updatedAt !== node.updatedAt) {
        return state
      }
      return {
        nodes: state.nodes.map((n) => (n.id === node.id ? { ...n, ...node } : n)),
      }
    })
  },

  applyRemoteEdge: (edge) => {
    set((state) => {
      const idx = state.edges.findIndex((e) => e.id === edge.id)
      if (idx === -1) return { edges: [...state.edges, edge] }
      const local = state.edges[idx]!
      if (newer(local.updatedAt, edge.updatedAt) && local.updatedAt !== edge.updatedAt) {
        return state
      }
      return {
        edges: state.edges.map((e) => (e.id === edge.id ? { ...e, ...edge } : e)),
      }
    })
  },

  applyRemoteNodeDelete: (id) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter(
        (e) => e.sourceNodeId !== id && e.targetNodeId !== id,
      ),
    }))
  },

  applyRemoteEdgeDelete: (id) => {
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== id),
    }))
  },

  withHistory: (label, run) => {
    if (historyBatchDepth === 0) {
      undoStack.push(get().nodes, get().edges, label)
    }
    historyBatchDepth += 1
    try {
      run()
    } finally {
      historyBatchDepth -= 1
      if (historyBatchDepth === 0) {
        undoStack.rememberCurrent(get().nodes, get().edges)
        syncUndoFlags(set)
      }
    }
  },

  addNode: (node, historyLabel = 'Add node') => {
    pushHistory(get(), historyLabel, set)
    set((state) => ({ nodes: [...state.nodes, stamp(node)] }))
    if (historyBatchDepth === 0) syncUndoFlags(set)
  },

  updateNode: (id, patch, historyLabel = 'Edit node') => {
    pushHistory(get(), historyLabel, set)
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? stamp({ ...n, ...patch }) : n,
      ),
    }))
    if (historyBatchDepth === 0) syncUndoFlags(set)
  },

  patchNodeLive: (id, patch) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? stamp({ ...n, ...patch }) : n,
      ),
    }))
  },

  deleteNodes: (ids, historyLabel = 'Delete nodes') => {
    if (ids.length === 0) return
    pushHistory(get(), historyLabel, set)
    const idSet = new Set(ids)
    set((state) => ({
      nodes: state.nodes.filter((n) => !idSet.has(n.id)),
      edges: state.edges.filter(
        (e) => !idSet.has(e.sourceNodeId) && !idSet.has(e.targetNodeId),
      ),
    }))
    if (historyBatchDepth === 0) syncUndoFlags(set)
  },

  addEdge: (edge, historyLabel = 'Connect') => {
    pushHistory(get(), historyLabel, set)
    set((state) => ({ edges: [...state.edges, stamp(edge)] }))
    if (historyBatchDepth === 0) syncUndoFlags(set)
  },

  updateEdge: (id, patch, historyLabel = 'Edit connection') => {
    pushHistory(get(), historyLabel, set)
    set((state) => ({
      edges: state.edges.map((e) =>
        e.id === id ? stamp({ ...e, ...patch }) : e,
      ),
    }))
    if (historyBatchDepth === 0) syncUndoFlags(set)
  },

  deleteEdges: (ids, historyLabel = 'Delete connections') => {
    if (ids.length === 0) return
    pushHistory(get(), historyLabel, set)
    const idSet = new Set(ids)
    set((state) => ({
      edges: state.edges.filter((e) => !idSet.has(e.id)),
    }))
    if (historyBatchDepth === 0) syncUndoFlags(set)
  },

  moveNodes: (updates, historyLabel = 'Move') => {
    if (updates.length === 0) return
    pushHistory(get(), historyLabel, set)
    const byId = new Map(updates.map((u) => [u.id, u]))
    set((state) => ({
      nodes: state.nodes.map((n) => {
        const u = byId.get(n.id)
        if (!u) return n
        return stamp({
          ...n,
          positionX: u.positionX,
          positionY: u.positionY,
        })
      }),
    }))
    if (historyBatchDepth === 0) syncUndoFlags(set)
  },

  resizeNode: (id, size, historyLabel = 'Resize') => {
    pushHistory(get(), historyLabel, set)
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id
          ? stamp({
              ...n,
              width: Math.max(80, size.width),
              height: Math.max(48, size.height),
            })
          : n,
      ),
    }))
    if (historyBatchDepth === 0) syncUndoFlags(set)
  },

  undo: () => {
    const state = get()
    const prev = undoStack.undo({ nodes: state.nodes, edges: state.edges })
    if (!prev) return null
    set({ nodes: prev.nodes, edges: prev.edges })
    syncUndoFlags(set)
    return { label: prev.label }
  },

  redo: () => {
    const state = get()
    const next = undoStack.redo({ nodes: state.nodes, edges: state.edges })
    if (!next) return null
    set({ nodes: next.nodes, edges: next.edges })
    syncUndoFlags(set)
    return { label: next.label }
  },

  replaceAll: (nodes, edges, historyLabel = 'Import Spec') => {
    pushHistory(get(), historyLabel, set)
    set({ nodes, edges })
    undoStack.rememberCurrent(nodes, edges)
    if (historyBatchDepth === 0) syncUndoFlags(set)
  },

  reset: () => {
    undoStack.clear()
    historyBatchDepth = 0
    set({
      project: null,
      members: [],
      nodes: [],
      edges: [],
      presence: [],
      canUndo: false,
      canRedo: false,
      undoLabel: null,
      redoLabel: null,
      historyDepth: 0,
    })
  },
}))
