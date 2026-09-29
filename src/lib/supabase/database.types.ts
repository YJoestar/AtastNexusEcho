/**
 * NEXUS — Database Type Definitions
 * Generated from Supabase schema. Update after migrations.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string
          name: string
          code: string
          status: string
          created_at: string
          updated_at: string | null
          started_at: string | null
          completed_at: string | null
          current_node_id: string | null
          current_node_code: string | null
          score: number
          game_started_at: string | null
          game_deadline: string | null
          game_duration_minutes: number
          metadata: Json
        }
        Insert: {
          id?: string
          name: string
          code: string
          status?: string
          created_at?: string
          updated_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          current_node_id?: string | null
          current_node_code?: string | null
          score?: number
          game_started_at?: string | null
          game_deadline?: string | null
          game_duration_minutes?: number
          metadata?: Json
        }
        Update: {
          id?: string
          name?: string
          code?: string
          status?: string
          created_at?: string
          updated_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          current_node_id?: string | null
          current_node_code?: string | null
          score?: number
          game_started_at?: string | null
          game_deadline?: string | null
          game_duration_minutes?: number
          metadata?: Json
        }
        Relationships: []
      }
      players: {
        Row: {
          id: string
          team_id: string
          role: string
          display_name: string
          joined_at: string
          is_connected: boolean
          last_seen_at: string | null
          device_info: Json | null
          status: string
          created_at: string
          login_code_hash: string | null
          auth_user_id: string | null
          device_session_token: string | null
          device_fingerprint_hash: string | null
          login_attempts: number | null
          login_locked_until: string | null
          login_code_expires_at: string | null
        }
        Insert: {
          id?: string
          team_id: string
          role: string
          display_name: string
          joined_at?: string
          is_connected?: boolean
          last_seen_at?: string | null
          device_info?: Json | null
          status?: string
          created_at?: string
          login_code_hash?: string | null
          auth_user_id?: string | null
          device_session_token?: string | null
          device_fingerprint_hash?: string | null
          login_attempts?: number | null
          login_locked_until?: string | null
          login_code_expires_at?: string | null
        }
        Update: {
          id?: string
          team_id?: string
          role?: string
          display_name?: string
          joined_at?: string
          is_connected?: boolean
          last_seen_at?: string | null
          device_info?: Json | null
          status?: string
          created_at?: string
          login_code_hash?: string | null
          auth_user_id?: string | null
          device_session_token?: string | null
          device_fingerprint_hash?: string | null
          login_attempts?: number | null
          login_locked_until?: string | null
          login_code_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'players_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          }
        ]
      }
      admin_users: {
        Row: {
          id: string
          auth_user_id: string
          username: string
          role: string
          created_at: string
          last_login_at: string | null
        }
        Insert: {
          id?: string
          auth_user_id: string
          username: string
          role?: string
          created_at?: string
          last_login_at?: string | null
        }
        Update: {
          id?: string
          auth_user_id?: string
          username?: string
          role?: string
          created_at?: string
          last_login_at?: string | null
        }
        Relationships: []
      }
      login_rate_limits: {
        Row: {
          id: string
          ip_address: string
          created_at: string
        }
        Insert: {
          id?: string
          ip_address: string
          created_at?: string
        }
        Update: {
          id?: string
          ip_address?: string
          created_at?: string
        }
        Relationships: []
      }
      puzzle_nodes: {
        Row: {
          id: string
          code: string
          title: string
          type: string
          difficulty: number
          estimated_minutes: number
          position: Json
          prerequisites: Json
          branches: Json
          content: Json
          rewards: Json
          metadata: Json
        }
        Insert: {
          id?: string
          code: string
          title: string
          type: string
          difficulty: number
          estimated_minutes: number
          position: Json
          prerequisites: Json
          branches: Json
          content: Json
          rewards: Json
          metadata: Json
        }
        Update: {
          id?: string
          code?: string
          title?: string
          type?: string
          difficulty?: number
          estimated_minutes?: number
          position?: Json
          prerequisites?: Json
          branches?: Json
          content?: Json
          rewards?: Json
          metadata?: Json
        }
        Relationships: []
      }
      team_progress: {
        Row: {
          id: string
          team_id: string
          solved_nodes: Json
          current_node_id: string | null
          available_node_ids: Json
          evidence_owned: Json
          inventory_owned: Json
          fragments_owned: Json
          score: number
          hints_used: number
          hints_available: number
          time_elapsed_minutes: number
          time_remaining_minutes: number
          started_at: string | null
          last_activity_at: string
          metadata: Json
        }
        Insert: {
          id?: string
          team_id: string
          solved_nodes?: Json
          current_node_id?: string | null
          available_node_ids?: Json
          evidence_owned?: Json
          inventory_owned?: Json
          fragments_owned?: Json
          score?: number
          hints_used?: number
          hints_available?: number
          time_elapsed_minutes?: number
          time_remaining_minutes?: number
          started_at?: string | null
          last_activity_at?: string
          metadata?: Json
        }
        Update: {
          id?: string
          team_id?: string
          solved_nodes?: Json
          current_node_id?: string | null
          available_node_ids?: Json
          evidence_owned?: Json
          inventory_owned?: Json
          fragments_owned?: Json
          score?: number
          hints_used?: number
          hints_available?: number
          time_elapsed_minutes?: number
          time_remaining_minutes?: number
          started_at?: string | null
          last_activity_at?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'team_progress_team_id_fkey'
            columns: ['team_id']
            isOneToOne: true
            referencedRelation: 'teams'
            referencedColumns: ['id']
          }
        ]
      }
      submissions: {
        Row: {
          id: string
          team_id: string
          player_id: string
          node_id: string
          role: string
          submitted_answer: string
          normalized_answer: string | null
          is_correct: boolean
          attempt_number: number
          submitted_at: string
          response_time_seconds: number
          points_awarded: number
          time_penalty_seconds: number
          metadata: Json
        }
        Insert: {
          id?: string
          team_id: string
          node_id: string
          player_id: string
          role: string
          submitted_answer: string
          normalized_answer?: string | null
          is_correct: boolean
          attempt_number?: number
          submitted_at?: string
          response_time_seconds?: number
          points_awarded?: number
          time_penalty_seconds?: number
          metadata?: Json
        }
        Update: {
          id?: string
          team_id?: string
          node_id?: string
          player_id?: string
          role?: string
          submitted_answer?: string
          normalized_answer?: string | null
          is_correct?: boolean
          attempt_number?: number
          submitted_at?: string
          response_time_seconds?: number
          points_awarded?: number
          time_penalty_seconds?: number
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'submissions_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'submissions_player_id_fkey'
            columns: ['player_id']
            isOneToOne: false
            referencedRelation: 'players'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'submissions_node_id_fkey'
            columns: ['node_id']
            isOneToOne: false
            referencedRelation: 'puzzle_nodes'
            referencedColumns: ['id']
          }
        ]
      }
      evidence: {
        Row: {
          id: string
          code: string
          title: string
          description: string
          type: string
          classification: string
          content: Json
          metadata: Json
        }
        Insert: {
          id?: string
          code: string
          title: string
          description: string
          type: string
          classification: string
          content: Json
          metadata: Json
        }
        Update: {
          id?: string
          code?: string
          title?: string
          description?: string
          type?: string
          classification?: string
          content?: Json
          metadata?: Json
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          id: string
          code: string
          name: string
          description: string
          type: string
          rarity: string
          properties: Json
          uses: Json
          metadata: Json
        }
        Insert: {
          id?: string
          code: string
          name: string
          description: string
          type: string
          rarity: string
          properties: Json
          uses: Json
          metadata: Json
        }
        Update: {
          id?: string
          code?: string
          name?: string
          description?: string
          type?: string
          rarity?: string
          properties?: Json
          uses?: Json
          metadata?: Json
        }
        Relationships: []
      }
      fragments: {
        Row: {
          id: string
          code: string
          label: string
          content: string
          type: string
          puzzle_node_id: string
          role: string
          position: number
          metadata: Json
        }
        Insert: {
          id?: string
          code: string
          label: string
          content: string
          type: string
          puzzle_node_id: string
          role: string
          position: number
          metadata: Json
        }
        Update: {
          id?: string
          code?: string
          label?: string
          content?: string
          type?: string
          puzzle_node_id?: string
          role?: string
          position?: number
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'fragments_puzzle_node_id_fkey'
            columns: ['puzzle_node_id']
            isOneToOne: false
            referencedRelation: 'puzzle_nodes'
            referencedColumns: ['id']
          }
        ]
      }
      qr_nodes: {
        Row: {
          id: string
          code: string
          label: string
          type: string
          puzzle_node_id: string | null
          position: Json
          metadata: Json
        }
        Insert: {
          id?: string
          code: string
          label: string
          type: string
          puzzle_node_id?: string | null
          position: Json
          metadata: Json
        }
        Update: {
          id?: string
          code?: string
          label?: string
          type?: string
          puzzle_node_id?: string | null
          position?: Json
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: 'qr_nodes_puzzle_node_id_fkey'
            columns: ['puzzle_node_id']
            isOneToOne: false
            referencedRelation: 'puzzle_nodes'
            referencedColumns: ['id']
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          team_id: string
          target_roles: Json
          type: string
          title: string
          message: string
          priority: string
          is_read: boolean
          created_at: string
          read_at: string | null
          action_url: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          team_id: string
          target_roles: Json
          type: string
          title: string
          message: string
          priority?: string
          is_read?: boolean
          created_at?: string
          read_at?: string | null
          action_url?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          team_id?: string
          target_roles?: Json
          type?: string
          title?: string
          message?: string
          priority?: string
          is_read?: boolean
          created_at?: string
          read_at?: string | null
          action_url?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          }
        ]
      }
      game_events: {
        Row: {
          id: string
          type: string
          timestamp: string
          team_id: string | null
          player_id: string | null
          node_id: string | null
          payload: Json
          metadata: Json | null
        }
        Insert: {
          id?: string
          type: string
          timestamp?: string
          team_id?: string | null
          player_id?: string | null
          node_id?: string | null
          payload: Json
          metadata?: Json | null
        }
        Update: {
          id?: string
          type?: string
          timestamp?: string
          team_id?: string | null
          player_id?: string | null
          node_id?: string | null
          payload?: Json
          metadata?: Json | null
        }
        Relationships: []
      }
      node_progress: {
        Row: {
          id: string
          team_id: string
          node_id: string
          status: Database["public"]["Enums"]["puzzle_stage"]
          started_at: string | null
          solved_at: string | null
          solved_answer: string | null
          attempts: number
          time_spent_seconds: number
          hints_used: number
          points_awarded: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          node_id: string
          status?: Database["public"]["Enums"]["puzzle_stage"]
          started_at?: string | null
          solved_at?: string | null
          solved_answer?: string | null
          attempts?: number
          time_spent_seconds?: number
          hints_used?: number
          points_awarded?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          node_id?: string
          status?: Database["public"]["Enums"]["puzzle_stage"]
          started_at?: string | null
          solved_at?: string | null
          solved_answer?: string | null
          attempts?: number
          time_spent_seconds?: number
          hints_used?: number
          points_awarded?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'node_progress_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'node_progress_node_id_fkey'
            columns: ['node_id']
            isOneToOne: false
            referencedRelation: 'puzzle_nodes'
            referencedColumns: ['id']
          }
        ]
      }
      audit_log: {
        Row: {
          id: string
          admin_id: string | null
          action_type: Database["public"]["Enums"]["admin_action_type"]
          target_team_id: string | null
          target_player_id: string | null
          target_node_id: string | null
          payload: Json
          reason: string
          ip_address: string | null
          created_at: string
          reverted_at: string | null
          reverted_by: string | null
        }
        Insert: {
          id?: string
          admin_id?: string | null
          action_type: Database["public"]["Enums"]["admin_action_type"]
          target_team_id?: string | null
          target_player_id?: string | null
          target_node_id?: string | null
          payload?: Json
          reason: string
          ip_address?: string | null
          created_at?: string
          reverted_at?: string | null
          reverted_by?: string | null
        }
        Update: {
          id?: string
          admin_id?: string | null
          action_type?: Database["public"]["Enums"]["admin_action_type"]
          target_team_id?: string | null
          target_player_id?: string | null
          target_node_id?: string | null
          payload?: Json
          reason?: string
          ip_address?: string | null
          created_at?: string
          reverted_at?: string | null
          reverted_by?: string | null
        }
        Relationships: []
      }
      game_config: {
        Row: {
          id: string
          key: string
          value: Json
          description: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          key: string
          value: Json
          description?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          description?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      puzzle_stage:
        | 'LOCKED'
        | 'AVAILABLE'
        | 'IN_PROGRESS'
        | 'SOLVED'
      team_status:
        | 'REGISTERED'
        | 'FORMING'
        | 'READY'
        | 'WAITING'
        | 'ACTIVE'
        | 'PAUSED'
        | 'COMPLETED'
        | 'DISQUALIFIED'
        | 'ABANDONED'
        | 'RESET'
      player_role: 'OBSERVER' | 'ANALYST' | 'OPERATOR'
      player_status: 'INVITED' | 'ACTIVE' | 'OFFLINE' | 'REMOVED'
      puzzle_type:
        | 'OBSERVATION'
        | 'BINARY'
        | 'CIPHER'
        | 'PATTERN'
        | 'GRAPH'
        | 'VISUAL'
        | 'AUDIO'
        | 'MEMORY'
        | 'SPATIAL'
        | 'EXTRACTION'
        | 'CROSS_REFERENCE'
        | 'THREE_PHONE'
        | 'DEDUCTION'
        | 'LOGIC'
        | 'NARRATIVE_INVESTIGATION'
        | 'META'
        | 'FINAL'
        | 'FINAL_BOSS'
      submission_result:
        | 'CORRECT'
        | 'INCORRECT'
        | 'PARTIAL'
        | 'ALREADY_SOLVED'
        | 'PREREQUISITE_MISSING'
        | 'RATE_LIMITED'
        | 'INVALID_FORMAT'
        | 'GAME_NOT_ACTIVE'
        | 'ROLE_MISMATCH'
      evidence_type:
        | 'DOCUMENT'
        | 'IMAGE'
        | 'AUDIO'
        | 'VIDEO'
        | 'DATA'
        | 'PHYSICAL'
        | 'DIGITAL'
      evidence_classification: 'PUBLIC' | 'RESTRICTED' | 'CLASSIFIED' | 'TOP_SECRET'
      inventory_type:
        | 'TOOL'
        | 'KEY'
        | 'CODE'
        | 'DEVICE'
        | 'CONSUMABLE'
        | 'ARTIFACT'
        | 'FRAGMENT_CONTAINER'
      inventory_rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
      fragment_type:
        | 'TEXT'
        | 'CIPHER'
        | 'COORDINATE'
        | 'KEYWORD'
        | 'SYMBOL'
        | 'SEQUENCE'
      qr_node_type:
        | 'START'
        | 'PUZZLE'
        | 'EVIDENCE'
        | 'INVENTORY'
        | 'NAVIGATION'
        | 'CHECKPOINT'
        | 'FINAL'
      notification_type:
        | 'SYSTEM'
        | 'PUZZLE_UNLOCKED'
        | 'PUZZLE_SOLVED'
        | 'EVIDENCE_FOUND'
        | 'ITEM_ACQUIRED'
        | 'FRAGMENT_REVEALED'
        | 'HINT_AVAILABLE'
        | 'TIME_WARNING'
        | 'ROLE_ACTION_REQUIRED'
        | 'ADMIN_MESSAGE'
        | 'GAME_PHASE_CHANGE'
        | 'TEAM_STATUS_CHANGE'
      notification_priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'
      game_event_type:
        | 'TEAM_REGISTERED'
        | 'TEAM_STARTED'
        | 'TEAM_PAUSED'
        | 'TEAM_RESUMED'
        | 'TEAM_COMPLETED'
        | 'TEAM_DISQUALIFIED'
        | 'NODE_UNLOCKED'
        | 'NODE_STARTED'
        | 'NODE_SOLVED'
        | 'NODE_FAILED'
        | 'NODE_SKIPPED'
        | 'SUBMISSION_MADE'
        | 'SUBMISSION_VALIDATED'
        | 'EVIDENCE_DISCOVERED'
        | 'EVIDENCE_SHARED'
        | 'ITEM_ACQUIRED'
        | 'ITEM_USED'
        | 'ITEM_TRANSFERRED'
        | 'FRAGMENT_REVEALED'
        | 'HINT_REQUESTED'
        | 'HINT_CONSUMED'
        | 'QR_SCANNED'
        | 'ROLE_ACTION_PERFORMED'
        | 'ADMIN_ACTION'
        | 'GAME_PHASE_CHANGED'
        | 'SYSTEM_ALERT'
      admin_action_type:
        | 'TEAM_CREATE'
        | 'TEAM_UPDATE'
        | 'TEAM_DELETE'
        | 'TEAM_START'
        | 'TEAM_PAUSE'
        | 'TEAM_RESUME'
        | 'TEAM_COMPLETE'
        | 'TEAM_DISQUALIFY'
        | 'ROLE_ASSIGN'
        | 'ROLE_REASSIGN'
        | 'NODE_UNLOCK'
        | 'NODE_LOCK'
        | 'NODE_SKIP'
        | 'SUBMISSION_OVERRIDE'
        | 'SCORE_ADJUST'
        | 'TIME_ADJUST'
        | 'HINT_GRANT'
        | 'EVIDENCE_GRANT'
        | 'ITEM_GRANT'
        | 'FRAGMENT_REVEAL'
        | 'GAME_START'
        | 'GAME_PAUSE'
        | 'GAME_RESUME'
        | 'GAME_END'
        | 'CONFIG_UPDATE'
        | 'ANNOUNCEMENT_SEND'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}