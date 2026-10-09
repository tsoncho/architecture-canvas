import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { mapEdge, mapNode, mapProjectMember } from '@/lib/supabase/mappers'
import {
  enqueueOutbox,
  listOutbox,
  removeOutbox,
  saveSnapshot,
} from '@/lib/storage/local'
import { useProjectStore } from '@/stores/project-store'
import { toast } from '@/stores/toast-store'
import { useUiStore } from '@/stores/ui-store'
import type {
  ArchitectureEdge,
  ArchitectureNode,
  OutboxItem,
  PresenceUser,
  ProjectSnapshot,
} from '@/types'

const PRESENCE_COLORS = [
  '#2563eb',
  '#059669',
  '#d97706',
  '#db2777',
  '#7c3aed',
  '#0891b2',
  '#ca8a04',
]

const PULL_MS = 2000

function presenceColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash << 5) - hash + userId.charCodeAt(i)
    hash |= 0
  }
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length] ?? '#2563eb'
}

function humanError(message: string): Error {
  return new Error(message)
}

function friendlySyncMessage(raw: string): string {
  const msg = raw.toLowerCase()
  if (msg.includes('row-level security') || msg.includes('violates row-level')) {
    return 'Sync blocked — rejoin the project (share code) on this PC.'
  }
  if (
    msg.includes('foreign key') ||
    msg.includes('violates foreign key') ||
    msg.includes('source_node_id') ||
    msg.includes('target_node_id')
  ) {
    return 'Connection sync waited for missing nodes — retrying.'
  }
  if (msg.includes('not authenticated') || msg.includes('jwt')) {
    return 'Session expired — reopen the project to sync.'
  }
  if (msg.includes('project is currently full')) {
    return 'Project is full (3 people max).'
  }
  return raw || 'Could not sync'
}

function outboxRank(item: OutboxItem): number {
  // Nodes before edges; deletes after writes so FKs stay valid.
  if (item.table === 'nodes' && item.op !== 'delete') return 0
  if (item.table === 'edges' && item.op !== 'delete') return 1
  if (item.table === 'edges' && item.op === 'delete') return 2
  return 3
}

/** Last write wins per entity; then order for FK-safe flush. */
function prepareOutbox(items: OutboxItem[]): {
  apply: OutboxItem[]
  discardIds: string[]
} {
  const byKey = new Map<string, OutboxItem>()
  const chronological = [...items].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
  for (const item of chronological) {
    const id = String(item.payload.id ?? '')
    if (!id) continue
    byKey.set(`${item.table}:${id}`, item)
  }
  const apply = [...byKey.values()].sort((a, b) => {
    const rank = outboxRank(a) - outboxRank(b)
    if (rank !== 0) return rank
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })
  const keep = new Set(apply.map((i) => i.id))
  const discardIds = items.filter((i) => !keep.has(i.id)).map((i) => i.id)
  return { apply, discardIds }
}

function isFkError(message: string): boolean {
  const msg = message.toLowerCase()
  return (
    msg.includes('foreign key') ||
    msg.includes('violates foreign key') ||
    msg.includes('source_node_id') ||
    msg.includes('target_node_id')
  )
}

function isRlsError(message: string): boolean {
  const msg = message.toLowerCase()
  return msg.includes('row-level security') || msg.includes('violates row-level')
}

function nodeToPayload(node: ArchitectureNode): Record<string, unknown> {
  return {
    id: node.id,
    project_id: node.projectId,
    type: node.type,
    name: node.name,
    description: node.description ?? '',
    technology: node.technology ?? '',
    color: node.color,
    position_x: node.positionX,
    position_y: node.positionY,
    width: node.width,
    height: node.height,
    z_index: node.zIndex,
    parent_group_id: node.parentGroupId,
    metadata: node.metadata ?? {},
    updated_by: node.updatedBy,
  }
}

function edgeToPayload(edge: ArchitectureEdge): Record<string, unknown> {
  return {
    id: edge.id,
    project_id: edge.projectId,
    source_node_id: edge.sourceNodeId,
    target_node_id: edge.targetNodeId,
    label: edge.label ?? '',
    edge_type: edge.edgeType ?? 'default',
    style: edge.style ?? {},
    updated_by: edge.updatedBy,
  }
}

function newer(a: string, b: string): boolean {
  return new Date(a).getTime() >= new Date(b).getTime()
}

export class SyncEngine {
  private projectId: string | null = null
  private userId: string | null = null
  private displayName = 'Guest'
  private channels: RealtimeChannel[] = []
  private presenceChannel: RealtimeChannel | null = null
  private positionTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private flushing = false
  private pulling = false
  private pullTimer: ReturnType<typeof setInterval> | null = null
  private realtimeReady = false
  /** Local nodes currently being dragged — pull must not snap their positions. */
  private draggingIds = new Set<string>()

  setDraggingIds(ids: string[]): void {
    this.draggingIds = new Set(ids)
  }

  async start(projectId: string, userId: string, displayName: string): Promise<void> {
    await this.stop()
    this.projectId = projectId
    this.userId = userId
    this.displayName = displayName
    this.realtimeReady = false

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session?.access_token) {
      await supabase.realtime.setAuth(session.access_token)
    }

    await this.persistLocalSnapshot()
    this.subscribeRealtime(projectId)
    await this.startPresence(projectId, userId, displayName)
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)
    document.addEventListener('visibilitychange', this.handleVisibility)

    if (!navigator.onLine) {
      useUiStore.getState().setSaveStatus('offline')
    }

    // Immediate pull + periodic poll so peers sync even if WebSockets fail
    void this.pullRemoteState()
    this.pullTimer = setInterval(() => {
      void this.pullRemoteState()
    }, PULL_MS)

    void this.flushOutbox()
  }

  async stop(): Promise<void> {
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
    document.removeEventListener('visibilitychange', this.handleVisibility)
    if (this.pullTimer) {
      clearInterval(this.pullTimer)
      this.pullTimer = null
    }
    for (const ch of this.channels) {
      await supabase.removeChannel(ch)
    }
    this.channels = []
    if (this.presenceChannel) {
      await supabase.removeChannel(this.presenceChannel)
      this.presenceChannel = null
    }
    for (const timer of this.positionTimers.values()) {
      clearTimeout(timer)
    }
    this.positionTimers.clear()
    this.projectId = null
    this.userId = null
    this.realtimeReady = false
  }

  private handleOnline = (): void => {
    void this.flushOutbox()
    void this.pullRemoteState()
  }

  private handleOffline = (): void => {
    useUiStore.getState().setSaveStatus('offline')
  }

  private handleVisibility = (): void => {
    if (document.visibilityState === 'visible') {
      void this.flushOutbox()
      void this.pullRemoteState()
    }
  }

  private subscribeRealtime(projectId: string): void {
    const nodesChannel = supabase
      .channel(`nodes:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'nodes',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          this.realtimeReady = true
          if (payload.eventType === 'DELETE') {
            const old = payload.old as { id?: string }
            if (old.id) useProjectStore.getState().applyRemoteNodeDelete(old.id)
            return
          }
          const row = payload.new
          if (!row || typeof row !== 'object') return
          useProjectStore.getState().applyRemoteNode(mapNode(row as never))
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') this.realtimeReady = true
      })

    const edgesChannel = supabase
      .channel(`edges:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'edges',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          this.realtimeReady = true
          if (payload.eventType === 'DELETE') {
            const old = payload.old as { id?: string }
            if (old.id) useProjectStore.getState().applyRemoteEdgeDelete(old.id)
            return
          }
          const row = payload.new
          if (!row || typeof row !== 'object') return
          useProjectStore.getState().applyRemoteEdge(mapEdge(row as never))
        },
      )
      .subscribe()

    const membersChannel = supabase
      .channel(`members:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_members',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') return
          const row = payload.new
          if (!row || typeof row !== 'object') return
          const member = mapProjectMember(row as never)
          const members = useProjectStore.getState().members
          const idx = members.findIndex((m) => m.id === member.id)
          const next =
            idx === -1
              ? [...members, member]
              : members.map((m) => (m.id === member.id ? member : m))
          useProjectStore.getState().setMembers(next)
        },
      )
      .subscribe()

    this.channels = [nodesChannel, edgesChannel, membersChannel]
  }

  /** REST poll — keeps peers aligned when Realtime WebSockets are blocked. */
  async pullRemoteState(): Promise<void> {
    if (!this.projectId || this.pulling || !navigator.onLine) return
    this.pulling = true
    try {
      const projectId = this.projectId
      const [nodesRes, edgesRes, membersRes, pending] = await Promise.all([
        supabase.from('nodes').select('*').eq('project_id', projectId),
        supabase.from('edges').select('*').eq('project_id', projectId),
        supabase.from('project_members').select('*').eq('project_id', projectId),
        listOutbox(projectId),
      ])

      if (nodesRes.error || edgesRes.error) {
        const message =
          nodesRes.error?.message || edgesRes.error?.message || 'Pull failed'
        useUiStore.getState().setSyncError(message)
        toast(friendlySyncMessage(message), 'error')
        return
      }

      const pendingNodeIds = new Set(
        pending
          .filter((i) => i.table === 'nodes' && i.op !== 'delete')
          .map((i) => String(i.payload.id)),
      )
      const pendingEdgeIds = new Set(
        pending
          .filter((i) => i.table === 'edges' && i.op !== 'delete')
          .map((i) => String(i.payload.id)),
      )
      const pendingDeletes = new Set(
        pending.filter((i) => i.op === 'delete').map((i) => String(i.payload.id)),
      )

      const remoteNodes = (nodesRes.data ?? []).map(mapNode)
      const remoteEdges = (edgesRes.data ?? []).map(mapEdge)
      const state = useProjectStore.getState()

      const nodeMap = new Map(state.nodes.map((n) => [n.id, n]))
      for (const remote of remoteNodes) {
        if (pendingDeletes.has(remote.id)) continue
        const local = nodeMap.get(remote.id)
        if (this.draggingIds.has(remote.id)) continue
        // Pending local writes win until flushed.
        if (pendingNodeIds.has(remote.id) && local) continue
        if (!local || newer(remote.updatedAt, local.updatedAt)) {
          if (local && newer(local.updatedAt, remote.updatedAt)) continue
          nodeMap.set(remote.id, remote)
        }
      }
      for (const id of [...nodeMap.keys()]) {
        if (remoteNodes.some((n) => n.id === id)) continue
        if (pendingNodeIds.has(id)) continue
        if (this.draggingIds.has(id)) continue
        nodeMap.delete(id)
      }

      const edgeMap = new Map(state.edges.map((e) => [e.id, e]))
      for (const remote of remoteEdges) {
        if (pendingDeletes.has(remote.id)) continue
        const local = edgeMap.get(remote.id)
        if (pendingEdgeIds.has(remote.id) && local) continue
        if (!local || newer(remote.updatedAt, local.updatedAt)) {
          if (local && newer(local.updatedAt, remote.updatedAt)) continue
          edgeMap.set(remote.id, remote)
        }
      }
      for (const id of [...edgeMap.keys()]) {
        if (remoteEdges.some((e) => e.id === id)) continue
        if (pendingEdgeIds.has(id)) continue
        edgeMap.delete(id)
      }

      useProjectStore.setState({
        nodes: [...nodeMap.values()],
        edges: [...edgeMap.values()],
      })

      if (!membersRes.error && membersRes.data) {
        useProjectStore.getState().setMembers(membersRes.data.map(mapProjectMember))
      }

      useUiStore.getState().setSyncError(null)
      if (useUiStore.getState().saveStatus === 'saved' || useUiStore.getState().saveStatus === 'live') {
        useUiStore.getState().setSaveStatus(this.realtimeReady ? 'live' : 'saved')
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Pull failed'
      useUiStore.getState().setSyncError(message)
      toast(friendlySyncMessage(message), 'error')
    } finally {
      this.pulling = false
    }
  }

  private async startPresence(
    projectId: string,
    userId: string,
    displayName: string,
  ): Promise<void> {
    const channel = supabase.channel(`presence:${projectId}`, {
      config: { presence: { key: userId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{
          userId: string
          displayName: string
          color: string
          selectedIds?: string[]
        }>()
        const users: PresenceUser[] = []
        for (const key of Object.keys(state)) {
          const metas = state[key]
          if (!metas?.length) continue
          const meta = metas[0]
          if (!meta) continue
          users.push({
            userId: meta.userId ?? key,
            displayName: meta.displayName ?? 'Guest',
            color: meta.color ?? presenceColor(key),
            selectedIds: Array.isArray(meta.selectedIds) ? meta.selectedIds : [],
          })
        }
        useProjectStore.getState().setPresence(users)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId,
            displayName,
            color: presenceColor(userId),
            selectedIds: useUiStore.getState().selectedIds,
          })
        }
      })

    this.presenceChannel = channel
  }

  async trackSelection(selectedIds: string[]): Promise<void> {
    if (!this.presenceChannel || !this.userId) return
    try {
      await this.presenceChannel.track({
        userId: this.userId,
        displayName: this.displayName,
        color: presenceColor(this.userId),
        selectedIds,
      })
    } catch {
      // best-effort
    }
  }

  /**
   * Sync only the delta from an undo/redo — not the whole graph.
   * Pass the graph snapshot *before* undo/redo ran.
   */
  async syncUndoSnapshot(
    beforeNodes: ArchitectureNode[],
    beforeEdges: ArchitectureEdge[],
  ): Promise<void> {
    if (!this.projectId) return
    const { nodes, edges } = useProjectStore.getState()
    const afterNodeIds = new Set(nodes.map((n) => n.id))
    const afterEdgeIds = new Set(edges.map((e) => e.id))
    const beforeNodeMap = new Map(beforeNodes.map((n) => [n.id, n]))
    const beforeEdgeMap = new Map(beforeEdges.map((e) => [e.id, e]))

    for (const n of beforeNodes) {
      if (!afterNodeIds.has(n.id)) await this.deleteNode(n.id)
    }
    for (const e of beforeEdges) {
      if (!afterEdgeIds.has(e.id)) await this.deleteEdge(e.id)
    }

    for (const node of nodes) {
      const prev = beforeNodeMap.get(node.id)
      if (!prev || prev.updatedAt !== node.updatedAt || JSON.stringify(prev) !== JSON.stringify(node)) {
        await this.upsertNode(node)
      }
    }
    for (const edge of edges) {
      const prev = beforeEdgeMap.get(edge.id)
      if (!prev || prev.updatedAt !== edge.updatedAt || JSON.stringify(prev) !== JSON.stringify(edge)) {
        await this.upsertEdge(edge)
      }
    }
  }

  retryFlush(): void {
    void this.flushOutbox()
  }

  async persistLocalSnapshot(): Promise<void> {
    if (!this.projectId) return
    const state = useProjectStore.getState()
    if (!state.project) return
    const snapshot: ProjectSnapshot = {
      project: state.project,
      members: state.members,
      nodes: state.nodes,
      edges: state.edges,
      cachedAt: new Date().toISOString(),
    }
    await saveSnapshot(snapshot)
  }

  private async enqueue(item: Omit<OutboxItem, 'id' | 'createdAt'>): Promise<void> {
    const entry: OutboxItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    await enqueueOutbox(entry)
    useUiStore.getState().setSaveStatus(navigator.onLine ? 'saving' : 'offline')
    void this.persistLocalSnapshot()
    if (navigator.onLine) {
      void this.flushOutbox()
    }
  }

  async upsertNode(node: ArchitectureNode): Promise<void> {
    if (!this.projectId) return
    await this.enqueue({
      projectId: this.projectId,
      table: 'nodes',
      op: 'update',
      payload: nodeToPayload(node),
    })
  }

  scheduleNodePosition(node: ArchitectureNode): void {
    const existing = this.positionTimers.get(node.id)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(() => {
      this.positionTimers.delete(node.id)
      void this.upsertNode(node)
    }, 80)
    this.positionTimers.set(node.id, timer)
  }

  async insertNode(node: ArchitectureNode): Promise<void> {
    if (!this.projectId) return
    await this.enqueue({
      projectId: this.projectId,
      table: 'nodes',
      op: 'insert',
      payload: nodeToPayload({ ...node, updatedBy: this.userId }),
    })
  }

  async deleteNode(id: string): Promise<void> {
    if (!this.projectId) return
    await this.enqueue({
      projectId: this.projectId,
      table: 'nodes',
      op: 'delete',
      payload: { id },
    })
  }

  async upsertEdge(edge: ArchitectureEdge): Promise<void> {
    if (!this.projectId) return
    await this.enqueue({
      projectId: this.projectId,
      table: 'edges',
      op: 'update',
      payload: edgeToPayload(edge),
    })
  }

  async insertEdge(edge: ArchitectureEdge): Promise<void> {
    if (!this.projectId) return
    await this.enqueue({
      projectId: this.projectId,
      table: 'edges',
      op: 'insert',
      payload: edgeToPayload({ ...edge, updatedBy: this.userId }),
    })
  }

  async deleteEdge(id: string): Promise<void> {
    if (!this.projectId) return
    await this.enqueue({
      projectId: this.projectId,
      table: 'edges',
      op: 'delete',
      payload: { id },
    })
  }

  async flushOutbox(): Promise<void> {
    if (!navigator.onLine || this.flushing || !this.projectId) return
    this.flushing = true
    useUiStore.getState().setSaveStatus('saving')

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        throw humanError('Not signed in — reopen the project.')
      }
      if (session.access_token) {
        await supabase.realtime.setAuth(session.access_token)
      }

      const items = await listOutbox(this.projectId)
      const { apply, discardIds } = prepareOutbox(items)
      for (const id of discardIds) await removeOutbox(id)

      const failures: string[] = []
      for (const item of apply) {
        try {
          await this.applyOutboxItem(item)
          await removeOutbox(item.id)
        } catch (e) {
          const raw = e instanceof Error ? e.message : 'Could not sync'
          // Drop poison edge writes that can never succeed (missing endpoints).
          if (item.table === 'edges' && item.op !== 'delete' && isFkError(raw)) {
            const dropped = await this.repairOrDropEdge(item)
            if (dropped) {
              await removeOutbox(item.id)
              continue
            }
          }
          failures.push(friendlySyncMessage(raw))
          // Keep failed item for retry; continue so one bad edge doesn't block nodes.
        }
      }

      if (failures.length) {
        const message = failures[0] ?? 'Could not sync'
        useUiStore.getState().setSyncError(message)
        useUiStore.getState().setSaveStatus('error')
        toast(`${message} — click Live status to retry`, 'error')
      } else {
        useUiStore.getState().setSyncError(null)
        useUiStore.getState().setSaveStatus(this.realtimeReady ? 'live' : 'saved')
      }
      await this.persistLocalSnapshot()
      void this.pullRemoteState()
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Could not sync'
      const message = friendlySyncMessage(raw)
      useUiStore.getState().setSyncError(message)
      useUiStore.getState().setSaveStatus(navigator.onLine ? 'error' : 'offline')
      toast(`${message} — click status to retry`, 'error')
    } finally {
      this.flushing = false
    }
  }

  /** Push endpoint nodes, retry edge once; drop orphan if endpoints gone locally. */
  private async repairOrDropEdge(item: OutboxItem): Promise<boolean> {
    const sourceId = String(item.payload.source_node_id ?? '')
    const targetId = String(item.payload.target_node_id ?? '')
    const edgeId = String(item.payload.id ?? '')
    const state = useProjectStore.getState()
    const source = state.nodes.find((n) => n.id === sourceId)
    const target = state.nodes.find((n) => n.id === targetId)

    if (!source || !target) {
      if (edgeId) state.applyRemoteEdgeDelete(edgeId)
      return true
    }

    const srcPayload = nodeToPayload({ ...source, updatedBy: this.userId ?? source.updatedBy })
    const tgtPayload = nodeToPayload({ ...target, updatedBy: this.userId ?? target.updatedBy })
    const { error: srcErr } = await supabase
      .from('nodes')
      .upsert(srcPayload as never, { onConflict: 'id' })
    if (srcErr) return false
    const { error: tgtErr } = await supabase
      .from('nodes')
      .upsert(tgtPayload as never, { onConflict: 'id' })
    if (tgtErr) return false

    const edgePayload = {
      ...item.payload,
      updated_by: this.userId ?? item.payload.updated_by,
    }
    const { error } = await supabase.from('edges').upsert(edgePayload as never, {
      onConflict: 'id',
    })
    return !error
  }

  private async applyOutboxItem(item: OutboxItem): Promise<void> {
    const payload = item.payload
    if (item.table === 'nodes') {
      if (item.op === 'delete') {
        const id = payload.id as string
        const { error } = await supabase.from('nodes').delete().eq('id', id)
        if (error) throw humanError(error.message || 'Could not sync node removal.')
        return
      }
      const body = {
        ...payload,
        updated_by: this.userId ?? payload.updated_by,
      }
      const { error } = await supabase.from('nodes').upsert(body as never, { onConflict: 'id' })
      if (error) {
        if (isRlsError(error.message)) {
          await supabase.auth.refreshSession()
          const retry = await supabase.from('nodes').upsert(body as never, { onConflict: 'id' })
          if (retry.error) throw humanError(retry.error.message || 'Could not sync node changes.')
          return
        }
        throw humanError(error.message || 'Could not sync node changes.')
      }
      return
    }

    if (item.table === 'edges') {
      if (item.op === 'delete') {
        const id = payload.id as string
        const { error } = await supabase.from('edges').delete().eq('id', id)
        // Already gone remotely (cascade) is fine.
        if (error && !isFkError(error.message)) {
          throw humanError(error.message || 'Could not sync connection removal.')
        }
        return
      }

      // Ensure endpoints exist before the edge write (avoids FK "violates" loops).
      const sourceId = String(payload.source_node_id ?? '')
      const targetId = String(payload.target_node_id ?? '')
      const state = useProjectStore.getState()
      for (const nodeId of [sourceId, targetId]) {
        const node = state.nodes.find((n) => n.id === nodeId)
        if (!node) continue
        const { error: nodeErr } = await supabase
          .from('nodes')
          .upsert(
            nodeToPayload({ ...node, updatedBy: this.userId ?? node.updatedBy }) as never,
            { onConflict: 'id' },
          )
        if (nodeErr) throw humanError(nodeErr.message || 'Could not sync node for connection.')
      }

      const body = {
        ...payload,
        updated_by: this.userId ?? payload.updated_by,
      }
      const { error } = await supabase.from('edges').upsert(body as never, { onConflict: 'id' })
      if (error) {
        if (isRlsError(error.message)) {
          await supabase.auth.refreshSession()
          const retry = await supabase.from('edges').upsert(body as never, { onConflict: 'id' })
          if (retry.error) throw humanError(retry.error.message || 'Could not sync connection.')
          return
        }
        throw humanError(error.message || 'Could not sync connection changes.')
      }
    }
  }
}

export const syncEngine = new SyncEngine()
