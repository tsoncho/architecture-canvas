import { defaultNodeSize } from '@/lib/node-types'
import { normalizeJoinCode } from '@/lib/join-code'
import { getDeviceCredentials } from '@/lib/device-auth'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import {
  mapEdge,
  mapNode,
  mapProject,
  mapProjectMember,
} from '@/lib/supabase/mappers'
import type { Json } from '@/lib/supabase/database'
import type {
  ArchitectureEdge,
  ArchitectureNode,
  Project,
  ProjectSnapshot,
} from '@/types'
import type { ProjectTemplate } from './templates'

function humanError(message: string): Error {
  return new Error(message)
}

export async function ensureAuth(): Promise<string> {
  if (!isSupabaseConfigured) {
    throw humanError('Cloud sync is not configured. Add Supabase environment variables.')
  }
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (session?.user?.id) return session.user.id

  const anonymous = await supabase.auth.signInAnonymously()
  if (!anonymous.error && anonymous.data.user?.id) {
    return anonymous.data.user.id
  }

  const { installationId, email, password, displayName } = getDeviceCredentials()
  const { error: ensureError } = await supabase.rpc('ensure_device_user', {
    p_installation_id: installationId,
    p_email: email,
    p_password: password,
    p_display_name: displayName,
  })
  if (ensureError) {
    throw humanError('Could not create a local identity. Check your connection and try again.')
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) {
    throw humanError('Could not sign in. Check your connection and try again.')
  }
  return data.user.id
}

export async function createProject(name: string, displayName: string) {
  await ensureAuth()
  const trimmed = name.trim()
  if (!trimmed) throw humanError('Enter a project name.')
  const { data, error } = await supabase.rpc('create_project', {
    p_name: trimmed,
    p_display_name: displayName.trim() || 'Guest',
  })
  if (error || !data) {
    throw humanError('Could not create the project. Try again in a moment.')
  }
  return mapProject(data)
}

export async function joinProject(code: string, displayName: string) {
  await ensureAuth()
  const normalized = normalizeJoinCode(code)
  if (normalized.length < 6) {
    throw humanError('Enter a valid project code.')
  }
  const { data, error } = await supabase.rpc('join_project', {
    p_code: normalized,
    p_display_name: displayName.trim() || 'Guest',
  })
  if (error || !data) {
    throw humanError('Could not join with that code. Check the code and try again.')
  }
  return mapProject(data)
}

export async function loadProject(projectId: string): Promise<ProjectSnapshot> {
  await ensureAuth()
  const [projectRes, membersRes, nodesRes, edgesRes] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).single(),
    supabase.from('project_members').select('*').eq('project_id', projectId),
    supabase.from('nodes').select('*').eq('project_id', projectId),
    supabase.from('edges').select('*').eq('project_id', projectId),
  ])

  if (projectRes.error || !projectRes.data) {
    throw humanError('Project not found or you do not have access.')
  }
  if (membersRes.error) {
    throw humanError('Could not load collaborators.')
  }
  if (nodesRes.error || edgesRes.error) {
    throw humanError('Could not load diagram data.')
  }

  return {
    project: mapProject(projectRes.data),
    members: (membersRes.data ?? []).map(mapProjectMember),
    nodes: (nodesRes.data ?? []).map(mapNode),
    edges: (edgesRes.data ?? []).map(mapEdge),
    cachedAt: new Date().toISOString(),
  }
}

export async function renameProject(projectId: string, name: string): Promise<Project> {
  await ensureAuth()
  const trimmed = name.trim()
  if (!trimmed) throw humanError('Enter a project name.')
  const { data, error } = await supabase
    .from('projects')
    .update({ name: trimmed })
    .eq('id', projectId)
    .select('*')
    .single()
  if (error || !data) {
    throw humanError('Could not rename the project.')
  }
  return mapProject(data)
}

export async function touchMember(projectId: string): Promise<void> {
  const userId = await ensureAuth()
  const { error } = await supabase
    .from('project_members')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('project_id', projectId)
    .eq('user_id', userId)
  if (error) {
    throw humanError('Could not update your presence.')
  }
}

export async function insertTemplateContent(
  projectId: string,
  userId: string,
  template: ProjectTemplate,
): Promise<{ nodes: ArchitectureNode[]; edges: ArchitectureEdge[] }> {
  const now = new Date().toISOString()
  const nodeIds = template.nodes.map(() => crypto.randomUUID())

  const nodes: ArchitectureNode[] = template.nodes.map((draft, index) => {
    const size = defaultNodeSize(draft.type)
    return {
      id: nodeIds[index]!,
      projectId,
      type: draft.type,
      name: draft.name,
      description: '',
      technology: draft.technology,
      color: draft.color,
      positionX: draft.x,
      positionY: draft.y,
      width: size.width,
      height: size.height,
      zIndex: 0,
      parentGroupId: null,
      metadata: {},
      updatedBy: userId,
      createdAt: now,
      updatedAt: now,
    }
  })

  const edges: ArchitectureEdge[] = template.edges.map((draft) => ({
    id: crypto.randomUUID(),
    projectId,
    sourceNodeId: nodeIds[draft.sourceIndex]!,
    targetNodeId: nodeIds[draft.targetIndex]!,
    label: draft.label,
    edgeType: 'default',
    style: {},
    updatedBy: userId,
    createdAt: now,
    updatedAt: now,
  }))

  const nodeRows = nodes.map((n) => ({
    id: n.id,
    project_id: n.projectId,
    type: n.type,
    name: n.name,
    description: n.description,
    technology: n.technology,
    color: n.color,
    position_x: n.positionX,
    position_y: n.positionY,
    width: n.width,
    height: n.height,
    z_index: n.zIndex,
    parent_group_id: n.parentGroupId,
    metadata: n.metadata as Json,
    updated_by: n.updatedBy,
  }))

  const edgeRows = edges.map((e) => ({
    id: e.id,
    project_id: e.projectId,
    source_node_id: e.sourceNodeId,
    target_node_id: e.targetNodeId,
    label: e.label,
    edge_type: e.edgeType,
    style: e.style as Json,
    updated_by: e.updatedBy,
  }))

  const { error: nodeError } = await supabase.from('nodes').insert(nodeRows)
  if (nodeError) {
    throw humanError('Could not apply the template.')
  }
  const { error: edgeError } = await supabase.from('edges').insert(edgeRows)
  if (edgeError) {
    throw humanError('Could not apply template connections.')
  }

  return { nodes, edges }
}
