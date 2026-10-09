export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          join_code: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          join_code: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          join_code?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          display_name: string
          created_at: string
          last_seen_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          display_name: string
          created_at?: string
          last_seen_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          display_name?: string
          created_at?: string
          last_seen_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'project_members_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      nodes: {
        Row: {
          id: string
          project_id: string
          type: string
          name: string
          description: string
          technology: string
          color: string
          position_x: number
          position_y: number
          width: number
          height: number
          z_index: number
          parent_group_id: string | null
          metadata: Json
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          type: string
          name?: string
          description?: string
          technology?: string
          color?: string
          position_x?: number
          position_y?: number
          width?: number
          height?: number
          z_index?: number
          parent_group_id?: string | null
          metadata?: Json
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          type?: string
          name?: string
          description?: string
          technology?: string
          color?: string
          position_x?: number
          position_y?: number
          width?: number
          height?: number
          z_index?: number
          parent_group_id?: string | null
          metadata?: Json
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'nodes_parent_group_id_fkey'
            columns: ['parent_group_id']
            isOneToOne: false
            referencedRelation: 'nodes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'nodes_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      edges: {
        Row: {
          id: string
          project_id: string
          source_node_id: string
          target_node_id: string
          label: string
          edge_type: string
          style: Json
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          source_node_id: string
          target_node_id: string
          label?: string
          edge_type?: string
          style?: Json
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          source_node_id?: string
          target_node_id?: string
          label?: string
          edge_type?: string
          style?: Json
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'edges_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'edges_source_node_id_fkey'
            columns: ['source_node_id']
            isOneToOne: false
            referencedRelation: 'nodes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'edges_target_node_id_fkey'
            columns: ['target_node_id']
            isOneToOne: false
            referencedRelation: 'nodes'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      create_project: {
        Args: {
          p_name: string
          p_display_name: string
        }
        Returns: Database['public']['Tables']['projects']['Row']
      }
      join_project: {
        Args: {
          p_code: string
          p_display_name: string
        }
        Returns: Database['public']['Tables']['projects']['Row']
      }
      generate_join_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_project_member: {
        Args: {
          p_project_id: string
        }
        Returns: boolean
      }
      ensure_device_user: {
        Args: {
          p_installation_id: string
          p_email: string
          p_password: string
          p_display_name: string
        }
        Returns: string
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
