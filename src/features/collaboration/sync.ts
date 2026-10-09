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

function nodeToPayload(node: ArchitectureNode): Record<string, unknown> {
  return {
    id: node.id,
    project_id: node.projectId,
    type: node.type,
    name: node.name,
    description: node.description,
    technology: node.technology,
    color: node.color,
    position_x: node.positionX,
    position_y: node.positionY,
    width: node.width,
    height: node.height,
    z_index: node.zIndex,
    parent_group_id: node.parentGroupId,
    metadata: node.metadata,
    updated_by: node.updatedBy,
  }
}

function edgeToPayload(edge: ArchitectureEdge): Record<string, unknown> {
  return {
    id: edge.id,
    project_id: edge.projectId,
    source_node_id: edge.sourceNodeId,
    target_node_id: edge.targetNodeId,
    label: edge.label,
    edge_type: edge.edgeType,
    style: edge.style,
    updated_by: edge.updatedBy,
  }
}

export class SyncEngine {
  private projectId: string | null = null
  private channels: RealtimeChannel[] = []
  private presenceChannel: RealtimeChannel | null = null
  private positionTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private flushing = false

  async start(projectId: string, userId: string, displayName: string): Promise<void> {
    await this.stop()
    this.projectId = projectId
    await this.persistLocalSnapshot()
    this.subscribeRealtime(projectId)
    await this.startPresence(projectId, userId, displayName)
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)
    if (!navigator.onLine) {
      useUiStore.getState().setSaveStatus('offline')
    }
    void this.flushOutbox()
  }

  async stop(): Promise<void> {
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
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
  }

  private handleOnline = (): void => {
    void this.flushOutbox()
  }

  private handleOffline = (): void => {
    useUiStore.getState().setSaveStatus('offline')
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
          if (payload.eventType === 'DELETE') {
            const old = payload.old as { id?: string }
            if (old.id) {
              useProjectStore.getState().applyRemoteNodeDelete(old.id)
            }
            return
          }
          const row = payload.new
          if (!row || typeof row !== 'object') return
          useProjectStore.getState().applyRemoteNode(mapNode(row as never))
        },
      )
      .subscribe()

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
          if (payload.eventType === 'DELETE') {
            const old = payload.old as { id?: string }
            if (old.id) {
              useProjectStore.getState().applyRemoteEdgeDelete(old.id)
            }
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
          })
        }
      })

    this.presenceChannel = channel
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
      payload: nodeToPayload(node),
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
      payload: edgeToPayload(edge),
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
      const items = await listOutbox(this.projectId)
      for (const item of items) {
        await this.applyOutboxItem(item)
        await removeOutbox(item.id)
      }
      useUiStore.getState().setSaveStatus('saved')
      await this.persistLocalSnapshot()
    } catch {
      useUiStore.getState().setSaveStatus(navigator.onLine ? 'error' : 'offline')
    } finally {
      this.flushing = false
    }
  }

  private async applyOutboxItem(item: OutboxItem): Promise<void> {
    const payload = item.payload
    if (item.table === 'nodes') {
      if (item.op === 'delete') {
        const id = payload.id as string
        const { error } = await supabase.from('nodes').delete().eq('id', id)
        if (error) throw humanError('Could not sync node removal.')
        return
      }
      const { error } = await supabase.from('nodes').upsert(payload as never)
      if (error) throw humanError('Could not sync node changes.')
      return
    }

    if (item.table === 'edges') {
      if (item.op === 'delete') {
        const id = payload.id as string
        const { error } = await supabase.from('edges').delete().eq('id', id)
        if (error) throw humanError('Could not sync connection removal.')
        return
      }
      const { error } = await supabase.from('edges').upsert(payload as never)
      if (error) throw humanError('Could not sync connection changes.')
    }
  }
}

export const syncEngine = new SyncEngine()
