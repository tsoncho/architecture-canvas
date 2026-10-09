export type HistoryEntry<TNode, TEdge> = {
  label: string
  nodes: TNode[]
  edges: TEdge[]
}

function fingerprint<TNode, TEdge>(nodes: TNode[], edges: TEdge[]): string {
  // Cheap stability check — skip no-op history pushes.
  return `${nodes.length}:${edges.length}:${JSON.stringify(nodes)}:${JSON.stringify(edges)}`
}

/**
 * Lightweight labeled undo/redo stack.
 * Stores full graph snapshots (fine for ≤300 nodes / 500 edges).
 */
export class UndoStack<TNode, TEdge> {
  private past: Array<HistoryEntry<TNode, TEdge>> = []
  private future: Array<HistoryEntry<TNode, TEdge>> = []
  private readonly cap: number
  private lastFingerprint = ''

  constructor(cap = 80) {
    this.cap = cap
  }

  push(nodes: TNode[], edges: TEdge[], label = 'Edit'): boolean {
    const fp = fingerprint(nodes, edges)
    if (fp === this.lastFingerprint && this.past.length > 0) {
      return false
    }
    this.past.push({
      label,
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
    })
    if (this.past.length > this.cap) {
      this.past.shift()
    }
    this.future = []
    this.lastFingerprint = fp
    return true
  }

  /** Call after applying a restored snapshot so the next edit diffs correctly. */
  rememberCurrent(nodes: TNode[], edges: TEdge[]): void {
    this.lastFingerprint = fingerprint(nodes, edges)
  }

  undo(current: { nodes: TNode[]; edges: TEdge[] }): HistoryEntry<TNode, TEdge> | null {
    const previous = this.past.pop()
    if (!previous) return null
    this.future.push({
      label: previous.label,
      nodes: structuredClone(current.nodes),
      edges: structuredClone(current.edges),
    })
    this.rememberCurrent(previous.nodes, previous.edges)
    return previous
  }

  redo(current: { nodes: TNode[]; edges: TEdge[] }): HistoryEntry<TNode, TEdge> | null {
    const next = this.future.pop()
    if (!next) return null
    this.past.push({
      label: next.label,
      nodes: structuredClone(current.nodes),
      edges: structuredClone(current.edges),
    })
    this.rememberCurrent(next.nodes, next.edges)
    return next
  }

  get canUndo(): boolean {
    return this.past.length > 0
  }

  get canRedo(): boolean {
    return this.future.length > 0
  }

  get pastCount(): number {
    return this.past.length
  }

  get futureCount(): number {
    return this.future.length
  }

  /** Label of the action that will be undone (what the past entry restored from). */
  peekUndoLabel(): string | null {
    return this.past[this.past.length - 1]?.label ?? null
  }

  peekRedoLabel(): string | null {
    return this.future[this.future.length - 1]?.label ?? null
  }

  clear(): void {
    this.past = []
    this.future = []
    this.lastFingerprint = ''
  }
}
