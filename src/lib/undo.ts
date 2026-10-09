export type UndoSnapshot<T> = {
  nodes: T[]
  edges: T[]
}

export class UndoStack<TNode, TEdge> {
  private past: Array<{ nodes: TNode[]; edges: TEdge[] }> = []
  private future: Array<{ nodes: TNode[]; edges: TEdge[] }> = []
  private readonly cap: number

  constructor(cap = 50) {
    this.cap = cap
  }

  push(nodes: TNode[], edges: TEdge[]): void {
    this.past.push({
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
    })
    if (this.past.length > this.cap) {
      this.past.shift()
    }
    this.future = []
  }

  undo(current: { nodes: TNode[]; edges: TEdge[] }): {
    nodes: TNode[]
    edges: TEdge[]
  } | null {
    const previous = this.past.pop()
    if (!previous) return null
    this.future.push({
      nodes: structuredClone(current.nodes),
      edges: structuredClone(current.edges),
    })
    return previous
  }

  redo(current: { nodes: TNode[]; edges: TEdge[] }): {
    nodes: TNode[]
    edges: TEdge[]
  } | null {
    const next = this.future.pop()
    if (!next) return null
    this.past.push({
      nodes: structuredClone(current.nodes),
      edges: structuredClone(current.edges),
    })
    return next
  }

  get canUndo(): boolean {
    return this.past.length > 0
  }

  get canRedo(): boolean {
    return this.future.length > 0
  }

  clear(): void {
    this.past = []
    this.future = []
  }
}
