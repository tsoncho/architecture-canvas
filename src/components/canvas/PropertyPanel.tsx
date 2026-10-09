import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { syncEngine } from '@/features/collaboration/sync'
import { useProjectStore } from '@/stores/project-store'
import { useUiStore } from '@/stores/ui-store'

export function PropertyPanel() {
  const editingNodeId = useUiStore((s) => s.editingNodeId)
  const editingEdgeId = useUiStore((s) => s.editingEdgeId)
  const setEditingNodeId = useUiStore((s) => s.setEditingNodeId)
  const setEditingEdgeId = useUiStore((s) => s.setEditingEdgeId)

  const node = useProjectStore((s) =>
    editingNodeId ? s.nodes.find((n) => n.id === editingNodeId) : undefined,
  )
  const edge = useProjectStore((s) =>
    editingEdgeId ? s.edges.find((e) => e.id === editingEdgeId) : undefined,
  )

  const updateNode = useProjectStore((s) => s.updateNode)
  const patchNodeLive = useProjectStore((s) => s.patchNodeLive)
  const updateEdge = useProjectStore((s) => s.updateEdge)
  const selectedIds = useUiStore((s) => s.selectedIds)
  const selectedNodeCount = useProjectStore(
    (s) => s.nodes.filter((n) => selectedIds.includes(n.id)).length,
  )

  const [name, setName] = useState('')
  const [technology, setTechnology] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const [label, setLabel] = useState('')
  const colorUndoArmed = useRef(false)
  const colorSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (node) {
      setName(node.name)
      setTechnology(node.technology)
      setColor(node.color)
      colorUndoArmed.current = false
    }
  }, [node?.id])

  useEffect(() => {
    if (edge) setLabel(edge.label)
  }, [edge?.id])

  useEffect(() => {
    return () => {
      if (colorSyncTimer.current) clearTimeout(colorSyncTimer.current)
    }
  }, [])

  if (!node && !edge) {
    if (selectedNodeCount > 1) {
      return (
        <aside className="flex w-72 shrink-0 flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] dark:border-[var(--color-border-dark)] dark:bg-[var(--color-surface-dark)]">
          <div className="border-b border-[var(--color-border)] px-4 py-3 dark:border-[var(--color-border-dark)]">
            <h2 className="text-sm font-medium">{selectedNodeCount} selected</h2>
          </div>
          <div className="p-4 text-sm text-[var(--color-muted)]">
            Drag together to move. Press Delete to remove. Shift-click to refine the selection.
          </div>
        </aside>
      )
    }
    return null
  }

  const latestNode = () =>
    (node && useProjectStore.getState().nodes.find((n) => n.id === node.id)) || node

  const persistNode = (patch: { name?: string; technology?: string; color?: string }) => {
    if (!node) return
    const current = latestNode()
    if (!current) return
    const updated = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    }
    updateNode(node.id, patch)
    void syncEngine.upsertNode(updated)
  }

  const persistColorLive = (nextColor: string) => {
    if (!node) return
    setColor(nextColor)
    // First change in a drag takes one undo snapshot; further ticks are live-only.
    if (!colorUndoArmed.current) {
      updateNode(node.id, { color: nextColor })
      colorUndoArmed.current = true
    } else {
      patchNodeLive(node.id, { color: nextColor })
    }
    if (colorSyncTimer.current) clearTimeout(colorSyncTimer.current)
    colorSyncTimer.current = setTimeout(() => {
      const current = latestNode()
      if (!current) return
      void syncEngine.upsertNode({
        ...current,
        color: nextColor,
        updatedAt: new Date().toISOString(),
      })
    }, 120)
  }

  const finishColorEdit = () => {
    colorUndoArmed.current = false
    const current = latestNode()
    if (!current) return
    void syncEngine.upsertNode({
      ...current,
      updatedAt: new Date().toISOString(),
    })
  }

  const persistEdge = (nextLabel: string) => {
    if (!edge) return
    const updated = { ...edge, label: nextLabel, updatedAt: new Date().toISOString() }
    updateEdge(edge.id, { label: nextLabel })
    void syncEngine.upsertEdge(updated)
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] dark:border-[var(--color-border-dark)] dark:bg-[var(--color-surface-dark)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3 dark:border-[var(--color-border-dark)]">
        <h2 className="text-sm font-medium">{node ? 'Node' : 'Connection'}</h2>
        <button
          type="button"
          className="text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          onClick={() => {
            setEditingNodeId(null)
            setEditingEdgeId(null)
          }}
        >
          Close
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {node ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="node-name">Name</Label>
              <Input
                id="node-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => persistNode({ name: name.trim() || node.name })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="node-tech">Technology</Label>
              <Input
                id="node-tech"
                value={technology}
                onChange={(e) => setTechnology(e.target.value)}
                onBlur={() => persistNode({ technology })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="node-color">Accent</Label>
              <div className="flex gap-2">
                <Input
                  id="node-color"
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : '#3b82f6'}
                  className="h-9 w-12 cursor-pointer p-1"
                  onChange={(e) => persistColorLive(e.target.value)}
                  onBlur={finishColorEdit}
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  onBlur={() => {
                    const next = color.trim()
                    if (/^#[0-9a-fA-F]{6}$/.test(next)) {
                      persistColorLive(next)
                      finishColorEdit()
                    } else {
                      setColor(node.color)
                    }
                  }}
                />
              </div>
            </div>
          </>
        ) : null}
        {edge ? (
          <div className="space-y-2">
            <Label htmlFor="edge-label">Label</Label>
            <Input
              id="edge-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={() => persistEdge(label)}
            />
          </div>
        ) : null}
      </div>
    </aside>
  )
}
