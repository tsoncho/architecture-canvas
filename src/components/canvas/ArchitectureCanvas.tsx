import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type OnReconnect,
  type OnSelectionChangeParams,
  type XYPosition,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ArchitectureNode as ArchitectureNodeCard } from '@/components/nodes/ArchitectureNode'
import { GroupNode } from '@/components/nodes/GroupNode'
import { TextNode } from '@/components/nodes/TextNode'
import { LabeledEdge } from '@/components/edges/LabeledEdge'
import { EmptyHint } from '@/components/canvas/EmptyHint'
import {
  CanvasContextMenu,
  initialContextMenu,
  type ContextMenuState,
} from '@/components/canvas/ContextMenus'
import { syncEngine } from '@/features/collaboration/sync'
import { createArchitectureEdge, createArchitectureNode } from '@/lib/node-factory'
import { toFlowEdge, toFlowNode, type ArchitectureFlowData } from '@/lib/flow-mappers'
import { useProjectStore } from '@/stores/project-store'
import { useUiStore } from '@/stores/ui-store'
import { useIdentityStore } from '@/stores/identity-store'
import { toast } from '@/stores/toast-store'
import type { ArchitectureEdge, ArchitectureNode, NodeType } from '@/types'
import { NODE_CATALOG } from '@/lib/node-types'

type ArchNode = ArchitectureNode

const nodeTypes = {
  architecture: ArchitectureNodeCard,
  group: GroupNode,
  text: TextNode,
}

const edgeTypes = {
  labeled: LabeledEdge,
}

type ClipboardPayload = {
  nodes: ArchNode[]
  edges: ArchitectureEdge[]
}

let clipboard: ClipboardPayload | null = null

type ArchitectureCanvasProps = {
  userId: string
  defaultNodeType?: NodeType
}

function CanvasInner({ userId, defaultNodeType = 'application' }: ArchitectureCanvasProps) {
  const project = useProjectStore((s) => s.project)
  const nodes = useProjectStore((s) => s.nodes)
  const edges = useProjectStore((s) => s.edges)
  const addNode = useProjectStore((s) => s.addNode)
  const addEdge = useProjectStore((s) => s.addEdge)
  const updateEdge = useProjectStore((s) => s.updateEdge)
  const moveNodes = useProjectStore((s) => s.moveNodes)
  const resizeNode = useProjectStore((s) => s.resizeNode)
  const deleteNodes = useProjectStore((s) => s.deleteNodes)
  const deleteEdges = useProjectStore((s) => s.deleteEdges)
  const withHistory = useProjectStore((s) => s.withHistory)
  const undo = useProjectStore((s) => s.undo)
  const redo = useProjectStore((s) => s.redo)

  const selectedIds = useUiStore((s) => s.selectedIds)
  const setSelectedIds = useUiStore((s) => s.setSelectedIds)
  const setEditingNodeId = useUiStore((s) => s.setEditingNodeId)
  const setEditingEdgeId = useUiStore((s) => s.setEditingEdgeId)
  const clearSelection = useUiStore((s) => s.clearSelection)
  const setZoom = useUiStore((s) => s.setZoom)
  const showGrid = useIdentityStore((s) => s.settings.showGrid)

  const { screenToFlowPosition, fitView, getViewport } = useReactFlow()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const didInitialFit = useRef(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(initialContextMenu)
  const [pendingType, setPendingType] = useState<NodeType>(defaultNodeType)
  // Positions while dragging only — membership always comes from the project store.
  const [dragPositions, setDragPositions] = useState<Record<string, XYPosition>>({})

  const nodeIdsKey = useMemo(() => nodes.map((n) => n.id).sort().join(','), [nodes])
  const presence = useProjectStore((s) => s.presence)
  const remoteSelection = useMemo(() => {
    const map = new Map<string, string>()
    for (const user of presence) {
      if (user.userId === userId) continue
      for (const id of user.selectedIds ?? []) {
        if (!map.has(id)) map.set(id, user.color)
      }
    }
    return map
  }, [presence, userId])

  const flowNodes = useMemo(
    () =>
      nodes.map((n) => {
        const base = toFlowNode(n)
        const drag = dragPositions[n.id]
        const remoteColor = remoteSelection.get(n.id)
        return {
          ...base,
          position: drag ?? base.position,
          selected: selectedIds.includes(n.id),
          style: {
            ...base.style,
            ...(remoteColor && !selectedIds.includes(n.id)
              ? { boxShadow: `0 0 0 2px ${remoteColor}` }
              : {}),
          },
        }
      }),
    [nodes, dragPositions, selectedIds, remoteSelection],
  )
  const flowEdges = useMemo(
    () => edges.map((edge) => toFlowEdge(edge, nodes, edges)),
    [edges, nodes],
  )

  // Drop stale drag overlays when the store node set changes (import / undo / delete).
  useEffect(() => {
    setDragPositions((prev) => {
      const ids = new Set(nodes.map((n) => n.id))
      const next: Record<string, XYPosition> = {}
      let changed = false
      for (const [id, pos] of Object.entries(prev)) {
        if (ids.has(id)) next[id] = pos
        else changed = true
      }
      return changed ? next : prev
    })
  }, [nodeIdsKey, nodes])

  useEffect(() => {
    void syncEngine.trackSelection(selectedIds)
  }, [selectedIds])

  const runSyncedUndo = useCallback(() => {
    const before = useProjectStore.getState()
    const beforeNodes = structuredClone(before.nodes)
    const beforeEdges = structuredClone(before.edges)
    const result = undo()
    if (!result) return
    void syncEngine.syncUndoSnapshot(beforeNodes, beforeEdges)
    toast(`Undid ${result.label}`)
  }, [undo])

  const runSyncedRedo = useCallback(() => {
    const before = useProjectStore.getState()
    const beforeNodes = structuredClone(before.nodes)
    const beforeEdges = structuredClone(before.edges)
    const result = redo()
    if (!result) return
    void syncEngine.syncUndoSnapshot(beforeNodes, beforeEdges)
    toast(`Redid ${result.label}`)
  }, [redo])

  const onNodesChange = useCallback((changes: NodeChange<Node<ArchitectureFlowData>>[]) => {
    // Never apply remove/add/replace here — that was desyncing the canvas from Spec/store.
    setDragPositions((prev) => {
      let next: Record<string, XYPosition> | null = null
      const draggingNow = new Set<string>()
      for (const change of changes) {
        if (change.type === 'dimensions' && change.dimensions && change.resizing === false) {
          const arch = useProjectStore.getState().nodes.find((n) => n.id === change.id)
          if (
            arch &&
            (arch.width !== change.dimensions.width || arch.height !== change.dimensions.height)
          ) {
            resizeNode(change.id, {
              width: change.dimensions.width,
              height: change.dimensions.height,
            })
            const updated = useProjectStore.getState().nodes.find((n) => n.id === change.id)
            if (updated) void syncEngine.upsertNode(updated)
          }
          continue
        }
        if (change.type !== 'position' || !change.position) continue
        if (change.dragging) {
          if (!next) next = { ...prev }
          next[change.id] = change.position
          draggingNow.add(change.id)
        } else if (prev[change.id]) {
          if (!next) next = { ...prev }
          delete next[change.id]
        }
      }
      const mergedDragging = new Set([
        ...Object.keys(next ?? prev),
        ...draggingNow,
      ])
      syncEngine.setDraggingIds([...mergedDragging])
      return next ?? prev
    })
  }, [resizeNode])

  const spawnNode = useCallback(
    (type: NodeType, position: { x: number; y: number }) => {
      if (!project) return
      const node = createArchitectureNode({
        projectId: project.id,
        type,
        userId,
        positionX: position.x,
        positionY: position.y,
      })
      addNode(node)
      void syncEngine.insertNode(node)
      setEditingNodeId(node.id)
      setSelectedIds([node.id])
    },
    [project, userId, addNode, setEditingNodeId, setSelectedIds],
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!project || !connection.source || !connection.target) return
      if (connection.source === connection.target) return
      // One directed link per pair keeps diagrams readable; rewire instead of stacking.
      const exists = useProjectStore
        .getState()
        .edges.some(
          (e) =>
            e.sourceNodeId === connection.source &&
            e.targetNodeId === connection.target,
        )
      if (exists) return
      const edge = createArchitectureEdge({
        projectId: project.id,
        sourceNodeId: connection.source,
        targetNodeId: connection.target,
        userId,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
      })
      addEdge(edge)
      void syncEngine.insertEdge(edge)
    },
    [project, userId, addEdge],
  )

  const isValidConnection = useCallback((connection: Connection | Edge) => {
    const source = 'source' in connection ? connection.source : null
    const target = 'target' in connection ? connection.target : null
    if (!source || !target || source === target) return false
    return !useProjectStore
      .getState()
      .edges.some((e) => e.sourceNodeId === source && e.targetNodeId === target)
  }, [])

  const onNodeDragStop = useCallback(
    (
      _event: MouseEvent | TouchEvent,
      _node: Node<ArchitectureFlowData>,
      dragged: Node<ArchitectureFlowData>[],
    ) => {
      const storeNodes = useProjectStore.getState().nodes
      const updates: Array<{ id: string; positionX: number; positionY: number }> = []
      for (const draggedNode of dragged) {
        const arch = storeNodes.find((n) => n.id === draggedNode.id)
        if (!arch) continue
        updates.push({
          id: draggedNode.id,
          positionX: draggedNode.position.x,
          positionY: draggedNode.position.y,
        })
        syncEngine.scheduleNodePosition({
          ...arch,
          positionX: draggedNode.position.x,
          positionY: draggedNode.position.y,
          updatedAt: new Date().toISOString(),
        })
      }
      if (updates.length) moveNodes(updates)
      setDragPositions((prev) => {
        if (Object.keys(prev).length === 0) return prev
        const next = { ...prev }
        for (const draggedNode of dragged) delete next[draggedNode.id]
        syncEngine.setDraggingIds(Object.keys(next))
        return next
      })
      syncEngine.setDraggingIds([])
    },
    [moveNodes],
  )

  const onReconnect: OnReconnect = useCallback(
    (oldEdge, newConnection) => {
      if (!newConnection.source || !newConnection.target) return
      if (newConnection.source === newConnection.target) return
      const exists = useProjectStore.getState().edges.some(
        (e) =>
          e.id !== oldEdge.id &&
          e.sourceNodeId === newConnection.source &&
          e.targetNodeId === newConnection.target,
      )
      if (exists) return
      const patch = {
        sourceNodeId: newConnection.source,
        targetNodeId: newConnection.target,
        style: {
          sourceHandle: newConnection.sourceHandle ?? undefined,
          targetHandle: newConnection.targetHandle ?? undefined,
          lockHandles: true,
        },
        updatedAt: new Date().toISOString(),
      }
      updateEdge(oldEdge.id, patch, 'Reconnect')
      const updated = useProjectStore.getState().edges.find((e) => e.id === oldEdge.id)
      if (updated) void syncEngine.upsertEdge(updated)
    },
    [updateEdge],
  )

  const onSelectionChange = useCallback(
    ({ nodes: selNodes, edges: selEdges }: OnSelectionChangeParams) => {
      const ids = [...selNodes.map((n) => n.id), ...selEdges.map((e) => e.id)]
      setSelectedIds(ids)
      // Property panel only for a single node/edge selection.
      if (selNodes.length === 1 && selEdges.length === 0) {
        setEditingNodeId(selNodes[0]!.id)
      } else if (selEdges.length === 1 && selNodes.length === 0) {
        setEditingEdgeId(selEdges[0]!.id)
      } else if (selNodes.length === 0 && selEdges.length === 0) {
        // pane clear handled separately; keep editing until pane click if needed
      } else {
        setEditingNodeId(null)
        setEditingEdgeId(null)
      }
    },
    [setSelectedIds, setEditingNodeId, setEditingEdgeId],
  )

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node<ArchitectureFlowData>) => {
      // Let React Flow own multi-select (Shift-click). Don't collapse the selection.
      if (event.shiftKey || event.metaKey || event.ctrlKey) {
        setEditingNodeId(null)
        return
      }
      setEditingNodeId(node.id)
    },
    [setEditingNodeId],
  )

  const onPaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      spawnNode(pendingType, position)
    },
    [screenToFlowPosition, spawnNode, pendingType],
  )

  const copySelection = useCallback(() => {
    const selected = useUiStore.getState().selectedIds
    const nodeSet = new Set(nodes.filter((n) => selected.includes(n.id)).map((n) => n.id))
    if (nodeSet.size === 0) return
    const copiedNodes = nodes.filter((n) => nodeSet.has(n.id))
    const copiedEdges = edges.filter(
      (e) => nodeSet.has(e.sourceNodeId) && nodeSet.has(e.targetNodeId),
    )
    clipboard = { nodes: structuredClone(copiedNodes), edges: structuredClone(copiedEdges) }
  }, [nodes, edges])

  const pasteClipboard = useCallback(() => {
    if (!clipboard || !project || clipboard.nodes.length === 0) return
    const idMap = new Map<string, string>()
    for (const n of clipboard.nodes) {
      idMap.set(n.id, crypto.randomUUID())
    }
    const offset = 24
    const now = new Date().toISOString()
    const createdNodes: ArchitectureNode[] = []
    const createdEdges: ArchitectureEdge[] = []
    withHistory('Paste', () => {
      for (const n of clipboard!.nodes) {
        const copy: ArchitectureNode = {
          ...n,
          id: idMap.get(n.id)!,
          positionX: n.positionX + offset,
          positionY: n.positionY + offset,
          updatedBy: userId,
          createdAt: now,
          updatedAt: now,
        }
        addNode(copy)
        createdNodes.push(copy)
      }
      for (const e of clipboard!.edges) {
        const copy: ArchitectureEdge = {
          ...e,
          id: crypto.randomUUID(),
          sourceNodeId: idMap.get(e.sourceNodeId)!,
          targetNodeId: idMap.get(e.targetNodeId)!,
          updatedBy: userId,
          createdAt: now,
          updatedAt: now,
        }
        addEdge(copy)
        createdEdges.push(copy)
      }
    })
    for (const n of createdNodes) void syncEngine.insertNode(n)
    for (const e of createdEdges) void syncEngine.insertEdge(e)
    setSelectedIds(createdNodes.map((n) => n.id))
    toast(`Pasted ${createdNodes.length} item${createdNodes.length === 1 ? '' : 's'}`)
  }, [project, userId, addNode, addEdge, withHistory, setSelectedIds])

  const duplicateSelection = useCallback(() => {
    copySelection()
    pasteClipboard()
  }, [copySelection, pasteClipboard])

  useEffect(() => {
    const onAdd = (e: Event) => {
      const detail = (e as CustomEvent<{ type: NodeType }>).detail
      const type = detail?.type ?? pendingType
      const rect = wrapperRef.current?.getBoundingClientRect()
      const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
      const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
      spawnNode(type, screenToFlowPosition({ x: cx, y: cy }))
    }
    window.addEventListener('architecture-canvas:add-node', onAdd)
    return () => window.removeEventListener('architecture-canvas:add-node', onAdd)
  }, [spawnNode, screenToFlowPosition, pendingType])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return

      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault()
        const rect = wrapperRef.current?.getBoundingClientRect()
        const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
        const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
        spawnNode(pendingType, screenToFlowPosition({ x: cx, y: cy }))
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const selected = useUiStore.getState().selectedIds
        const nodeIds = selected.filter((id) => nodes.some((n) => n.id === id))
        const edgeIds = selected.filter((id) => edges.some((e) => e.id === id))
        if (nodeIds.length || edgeIds.length) {
          event.preventDefault()
          deleteNodes(nodeIds)
          deleteEdges(edgeIds)
          for (const id of nodeIds) void syncEngine.deleteNode(id)
          for (const id of edgeIds) void syncEngine.deleteEdge(id)
          clearSelection()
          setEditingNodeId(null)
          setEditingEdgeId(null)
        }
      }
      const mod = event.ctrlKey || event.metaKey
      if (mod && event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        runSyncedUndo()
      }
      if ((mod && event.key === 'z' && event.shiftKey) || (mod && event.key === 'y')) {
        event.preventDefault()
        runSyncedRedo()
      }
      if (mod && event.key === 'c') {
        event.preventDefault()
        copySelection()
      }
      if (mod && event.key === 'v') {
        event.preventDefault()
        pasteClipboard()
      }
      if (mod && event.key === 'd') {
        event.preventDefault()
        duplicateSelection()
      }
      if (mod && event.key === 'a') {
        event.preventDefault()
        setSelectedIds([...nodes.map((n) => n.id), ...edges.map((e) => e.id)])
      }
      if (event.key === 'Escape') {
        clearSelection()
        setEditingNodeId(null)
        setEditingEdgeId(null)
        setContextMenu(initialContextMenu)
      }
      // Fit when nodes exist but may be off-screen
      if (event.key === 'f' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault()
        fitView({ padding: 0.2 })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    nodes,
    edges,
    runSyncedUndo,
    runSyncedRedo,
    spawnNode,
    screenToFlowPosition,
    pendingType,
    deleteNodes,
    deleteEdges,
    clearSelection,
    copySelection,
    pasteClipboard,
    duplicateSelection,
    setSelectedIds,
    setEditingNodeId,
    setEditingEdgeId,
    fitView,
  ])

  useEffect(() => {
    const vp = getViewport()
    setZoom(vp.zoom)
  }, [getViewport, setZoom])

  // Fit once when the project first has nodes — not on every peer/add change.
  useEffect(() => {
    if (didInitialFit.current || nodes.length === 0) return
    didInitialFit.current = true
    const timer = window.setTimeout(() => fitView({ padding: 0.2 }), 30)
    return () => clearTimeout(timer)
  }, [nodes.length, fitView])

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault()
      setContextMenu({
        open: true,
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
      })
      setSelectedIds([node.id])
      setEditingNodeId(node.id)
    },
    [setSelectedIds, setEditingNodeId],
  )

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault()
      setContextMenu({
        open: true,
        x: event.clientX,
        y: event.clientY,
        edgeId: edge.id,
      })
      setSelectedIds([edge.id])
      setEditingEdgeId(edge.id)
    },
    [setSelectedIds, setEditingEdgeId],
  )

  return (
    <div
      ref={wrapperRef}
      className="relative h-full w-full"
      onDoubleClick={(event) => {
        const target = event.target as HTMLElement
        if (!target.closest('.react-flow__pane')) return
        onPaneDoubleClick(event)
      }}
    >
      {nodes.length === 0 ? <EmptyHint /> : null}
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        isValidConnection={isValidConnection}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onSelectionChange={onSelectionChange}
        onPaneClick={() => {
          setContextMenu(initialContextMenu)
          setEditingNodeId(null)
          setEditingEdgeId(null)
        }}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onMove={(_, viewport) => setZoom(viewport.zoom)}
        selectionMode={SelectionMode.Partial}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{
          stroke: 'var(--color-accent)',
          strokeWidth: 2,
          strokeDasharray: '6 4',
        }}
        defaultEdgeOptions={{
          type: 'labeled',
          interactionWidth: 20,
        }}
        nodesDraggable
        nodesConnectable
        elementsSelectable
        edgesReconnectable
        panOnDrag
        panOnScroll
        zoomOnScroll
        zoomOnPinch
        selectionOnDrag={false}
        selectionKeyCode="Shift"
        multiSelectionKeyCode="Shift"
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
        className="bg-[var(--color-canvas)]"
      >
        {showGrid ? (
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--color-border)" />
        ) : null}
      </ReactFlow>
      <CanvasContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(initialContextMenu)}
        onEdit={() => {
          if (contextMenu.nodeId) setEditingNodeId(contextMenu.nodeId)
          if (contextMenu.edgeId) setEditingEdgeId(contextMenu.edgeId)
        }}
        onDuplicate={
          contextMenu.nodeId
            ? () => {
                setSelectedIds([contextMenu.nodeId!])
                window.setTimeout(() => duplicateSelection(), 0)
              }
            : undefined
        }
        onDelete={() => {
          if (contextMenu.nodeId) {
            deleteNodes([contextMenu.nodeId], 'Delete node')
            void syncEngine.deleteNode(contextMenu.nodeId)
            setEditingNodeId(null)
          }
          if (contextMenu.edgeId) {
            deleteEdges([contextMenu.edgeId], 'Delete connection')
            void syncEngine.deleteEdge(contextMenu.edgeId)
            setEditingEdgeId(null)
          }
        }}
      />
      <TypeListener onType={setPendingType} />
      <FitViewBridge onFit={() => fitView({ padding: 0.2 })} />
    </div>
  )
}

function TypeListener({ onType }: { onType: (t: NodeType) => void }) {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ type: NodeType }>).detail
      if (detail?.type) onType(detail.type)
    }
    window.addEventListener('architecture-canvas:set-node-type', handler)
    return () => window.removeEventListener('architecture-canvas:set-node-type', handler)
  }, [onType])
  return null
}

function FitViewBridge({ onFit }: { onFit: () => void }) {
  useEffect(() => {
    const handler = () => onFit()
    window.addEventListener('architecture-canvas:fit-view', handler)
    return () => window.removeEventListener('architecture-canvas:fit-view', handler)
  }, [onFit])
  return null
}

export function ArchitectureCanvas(props: ArchitectureCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  )
}

export function dispatchNodeType(type: NodeType) {
  window.dispatchEvent(new CustomEvent('architecture-canvas:set-node-type', { detail: { type } }))
}

export function dispatchFitView() {
  window.dispatchEvent(new Event('architecture-canvas:fit-view'))
}

export function getNodeTypeLabel(type: NodeType): string {
  return NODE_CATALOG[type].label
}
