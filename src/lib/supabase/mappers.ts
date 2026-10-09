import type {
  ArchitectureEdge,
  ArchitectureNode,
  NodeType,
  Project,
  ProjectMember,
} from '@/types'
import type { Tables } from './database'

type ProjectRow = Tables<'projects'>
type ProjectMemberRow = Tables<'project_members'>
type NodeRow = Tables<'nodes'>
type EdgeRow = Tables<'edges'>

export function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    joinCode: row.join_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapProjectMember(row: ProjectMemberRow): ProjectMember {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    displayName: row.display_name,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
  }
}

export function mapNode(row: NodeRow): ArchitectureNode {
  return {
    id: row.id,
    projectId: row.project_id,
    type: row.type as NodeType,
    name: row.name,
    description: row.description,
    technology: row.technology,
    color: row.color,
    positionX: row.position_x,
    positionY: row.position_y,
    width: row.width,
    height: row.height,
    zIndex: row.z_index,
    parentGroupId: row.parent_group_id,
    metadata: row.metadata as Record<string, unknown>,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapEdge(row: EdgeRow): ArchitectureEdge {
  return {
    id: row.id,
    projectId: row.project_id,
    sourceNodeId: row.source_node_id,
    targetNodeId: row.target_node_id,
    label: row.label,
    edgeType: row.edge_type,
    style: row.style as Record<string, unknown>,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
