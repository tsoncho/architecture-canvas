import { create } from 'zustand'
import type {
  ArchitectureEdge,
  ArchitectureNode,
  PresenceUser,
  Project,
  ProjectMember,
} from '@/types'
import { UndoStack } from '@/lib/undo'

const undoStack = new UndoStack<ArchitectureNode, ArchitectureEdge>(50)

function snapshot(state: Pick<ProjectState, 'nodes' | 'edges'>) {
  undoStack.push(state.nodes, state.edges)
}

type ProjectState = {
  project: Project | null
  members: ProjectMember[]
  nodes: ArchitectureNode[]
  edges: ArchitectureEdge[]
  presence: PresenceUser[]
  canUndo: boolean
  canRedo: boolean
  setProjectData: (payload: {
    project: Project
    members: ProjectMember[]
    nodes: ArchitectureNode[]
    edges: ArchitectureEdge[]
  }) => void
  setMembers: (members: ProjectMember[]) => void
  setPresence: (presence: PresenceUser[]) => void
  applyRemoteNode: (node: ArchitectureNode) => void
  applyRemoteEdge: (edge: ArchitectureEdge) => void
  applyRemoteNodeDelete: (id: string) => void
  applyRemoteEdgeDelete: (id: string) => void
  addNode: (node: ArchitectureNode) => void
  updateNode: (id: string, patch: Partial<ArchitectureNode>) => void
  /** Color/live paint — updates store without pushing undo. */
  patchNodeLive: (id: string, patch: Partial<ArchitectureNode>) => void
  deleteNodes: (ids: string[]) => void
  addEdge: (edge: ArchitectureEdge) => void
  updateEdge: (id: string, patch: Partial<ArchitectureEdge>) => void
  deleteEdges: (ids: string[]) => void
  moveNodes: (updates: Array<{ id: string; positionX: number; positionY: number }>) => void
  undo: () => void
  redo: () => void
  replaceAll: (nodes: ArchitectureNode[], edges: ArchitectureEdge[]) => void
  reset: () => void
}

function syncUndoFlags(set: (partial: Partial<ProjectState>) => void) {
  set({ canUndo: undoStack.canUndo, canRedo: undoStack.canRedo })
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: null,
  members: [],
  nodes: [],
  edges: [],
  presence: [],
  canUndo: false,
  canRedo: false,

  setProjectData: ({ project, members, nodes, edges }) => {
    undoStack.clear()
    set({ project, members, nodes, edges })
    syncUndoFlags(set)
  },

  setMembers: (members) => set({ members }),

  setPresence: (presence) => set({ presence }),

  applyRemoteNode: (node) => {
    set((state) => {
      const idx = state.nodes.findIndex((n) => n.id === node.id)
      const nodes =
        idx === -1
          ? [...state.nodes, node]
          : state.nodes.map((n) => (n.id === node.id ? { ...n, ...node } : n))
      return { nodes }
    })
  },

  applyRemoteEdge: (edge) => {
    set((state) => {
      const idx = state.edges.findIndex((e) => e.id === edge.id)
      const edges =
        idx === -1
          ? [...state.edges, edge]
          : state.edges.map((e) => (e.id === edge.id ? { ...e, ...edge } : e))
      return { edges }
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

  addNode: (node) => {
    snapshot(get())
    set((state) => ({ nodes: [...state.nodes, node] }))
    syncUndoFlags(set)
  },

  updateNode: (id, patch) => {
    snapshot(get())
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    }))
    syncUndoFlags(set)
  },

  patchNodeLive: (id, patch) => {
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    }))
  },

  deleteNodes: (ids) => {
    if (ids.length === 0) return
    snapshot(get())
    const idSet = new Set(ids)
    set((state) => ({
      nodes: state.nodes.filter((n) => !idSet.has(n.id)),
      edges: state.edges.filter(
        (e) => !idSet.has(e.sourceNodeId) && !idSet.has(e.targetNodeId),
      ),
    }))
    syncUndoFlags(set)
  },

  addEdge: (edge) => {
    snapshot(get())
    set((state) => ({ edges: [...state.edges, edge] }))
    syncUndoFlags(set)
  },

  updateEdge: (id, patch) => {
    snapshot(get())
    set((state) => ({
      edges: state.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }))
    syncUndoFlags(set)
  },

  deleteEdges: (ids) => {
    if (ids.length === 0) return
    snapshot(get())
    const idSet = new Set(ids)
    set((state) => ({
      edges: state.edges.filter((e) => !idSet.has(e.id)),
    }))
    syncUndoFlags(set)
  },

  moveNodes: (updates) => {
    if (updates.length === 0) return
    snapshot(get())
    const byId = new Map(updates.map((u) => [u.id, u]))
    set((state) => ({
      nodes: state.nodes.map((n) => {
        const u = byId.get(n.id)
        if (!u) return n
        return { ...n, positionX: u.positionX, positionY: u.positionY }
      }),
    }))
    syncUndoFlags(set)
  },

  undo: () => {
    const state = get()
    const prev = undoStack.undo({ nodes: state.nodes, edges: state.edges })
    if (!prev) return
    set({ nodes: prev.nodes, edges: prev.edges })
    syncUndoFlags(set)
  },

  redo: () => {
    const state = get()
    const next = undoStack.redo({ nodes: state.nodes, edges: state.edges })
    if (!next) return
    set({ nodes: next.nodes, edges: next.edges })
    syncUndoFlags(set)
  },

  replaceAll: (nodes, edges) => {
    snapshot(get())
    set({ nodes, edges })
    syncUndoFlags(set)
  },

  reset: () => {
    undoStack.clear()
    set({
      project: null,
      members: [],
      nodes: [],
      edges: [],
      presence: [],
      canUndo: false,
      canRedo: false,
    })
  },
}))
