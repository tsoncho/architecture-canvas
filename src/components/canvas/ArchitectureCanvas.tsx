import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type OnSelectionChangeParams,
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
import type { ArchitectureEdge, ArchitectureNode, NodeType } from '@/types'
// ArchitectureNode type alias for clipboard
type ArchNode = ArchitectureNode
import { NODE_CATALOG } from '@/lib/node-types'

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
  const moveNodes = useProjectStore((s) => s.moveNodes)
  const deleteNodes = useProjectStore((s) => s.deleteNodes)
  const deleteEdges = useProjectStore((s) => s.deleteEdges)
  const undo = useProjectStore((s) => s.undo)
  const redo = useProjectStore((s) => s.redo)

  const setSelectedIds = useUiStore((s) => s.setSelectedIds)
  const setEditingNodeId = useUiStore((s) => s.setEditingNodeId)
  const setEditingEdgeId = useUiStore((s) => s.setEditingEdgeId)
  const clearSelection = useUiStore((s) => s.clearSelection)
  const setZoom = useUiStore((s) => s.setZoom)
  const showGrid = useIdentityStore((s) => s.settings.showGrid)

  const { screenToFlowPosition, fitView, getViewport } = useReactFlow()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(initialContextMenu)
  const [pendingType, setPendingType] = useState<NodeType>(defaultNodeType)

  const flowNodes = useMemo(() => nodes.map(toFlowNode), [nodes])
  const flowEdges = useMemo(() => edges.map(toFlowEdge), [edges])
  const [displayNodes, setDisplayNodes] = useState(flowNodes)

  useEffect(() => {
    setDisplayNodes(flowNodes)
  }, [flowNodes])

  const onNodesChange = useCallback((changes: NodeChange<Node<ArchitectureFlowData>>[]) => {
    setDisplayNodes(
      (current) =>
        applyNodeChanges(changes, current) as Node<ArchitectureFlowData>[],
    )
  }, [])

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
      const edge = createArchitectureEdge({
        projectId: project.id,
        sourceNodeId: connection.source,
        targetNodeId: connection.target,
        userId,
      })
      addEdge(edge)
      void syncEngine.insertEdge(edge)
    },
    [project, userId, addEdge],
  )

  const onNodeDragStop = useCallback(
    (_event: MouseEvent | TouchEvent, node: Node<ArchitectureFlowData>) => {
      const arch = nodes.find((n) => n.id === node.id)
      if (!arch) return
      const updated: ArchitectureNode = {
        ...arch,
        positionX: node.position.x,
        positionY: node.position.y,
        updatedAt: new Date().toISOString(),
      }
      moveNodes([{ id: updated.id, positionX: updated.positionX, positionY: updated.positionY }])
      syncEngine.scheduleNodePosition(updated)
    },
    [nodes, moveNodes],
  )

  const onSelectionChange = useCallback(
    ({ nodes: selNodes, edges: selEdges }: OnSelectionChangeParams) => {
      const ids = [...selNodes.map((n) => n.id), ...selEdges.map((e) => e.id)]
      setSelectedIds(ids)
    },
    [setSelectedIds],
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
    for (const n of clipboard.nodes) {
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
      void syncEngine.insertNode(copy)
    }
    for (const e of clipboard.edges) {
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
      void syncEngine.insertEdge(copy)
    }
  }, [project, userId, addNode, addEdge])

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
        }
      }
      if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      }
      if (event.ctrlKey && event.key === 'z' && event.shiftKey) {
        event.preventDefault()
        redo()
      }
      if (event.ctrlKey && event.key === 'c') {
        event.preventDefault()
        copySelection()
      }
      if (event.ctrlKey && event.key === 'v') {
        event.preventDefault()
        pasteClipboard()
      }
      if (event.ctrlKey && event.key === 'a') {
        event.preventDefault()
        setSelectedIds([...nodes.map((n) => n.id), ...edges.map((e) => e.id)])
      }
      if (event.key === 'Escape') {
        clearSelection()
        setContextMenu(initialContextMenu)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    nodes,
    edges,
    undo,
    redo,
    spawnNode,
    screenToFlowPosition,
    pendingType,
    deleteNodes,
    deleteEdges,
    clearSelection,
    copySelection,
    pasteClipboard,
    setSelectedIds,
  ])

  useEffect(() => {
    const vp = getViewport()
    setZoom(vp.zoom)
  }, [getViewport, setZoom])

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault()
    setContextMenu({
      open: true,
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
    })
    setSelectedIds([node.id])
  }, [setSelectedIds])

  const onEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault()
    setContextMenu({
      open: true,
      x: event.clientX,
      y: event.clientY,
      edgeId: edge.id,
    })
    setSelectedIds([edge.id])
  }, [setSelectedIds])

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
        nodes={displayNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onSelectionChange={onSelectionChange}
        onPaneClick={() => setContextMenu(initialContextMenu)}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onMove={(_, viewport) => setZoom(viewport.zoom)}
        fitView
        selectionMode={SelectionMode.Partial}
        nodesDraggable
        nodesConnectable
        elementsSelectable
        panOnScroll
        selectionOnDrag
        proOptions={{ hideAttribution: true }}
        className="bg-[var(--color-canvas)] dark:bg-[var(--color-canvas-dark)]"
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
        onDelete={() => {
          if (contextMenu.nodeId) {
            deleteNodes([contextMenu.nodeId])
            void syncEngine.deleteNode(contextMenu.nodeId)
          }
          if (contextMenu.edgeId) {
            deleteEdges([contextMenu.edgeId])
            void syncEngine.deleteEdge(contextMenu.edgeId)
          }
        }}
      />
      {/* expose type picker hook for toolbar via custom event */}
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

// Fix: ArchitectureCanvas must wrap with ReactFlowProvider - do in export
