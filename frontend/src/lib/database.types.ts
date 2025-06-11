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
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          is_admin: boolean
          time_balance_minutes: number
          subscription_status: 'free' | 'active' | 'cancelled' | 'past_due'
          subscription_tier: 'basic' | 'premium' | 'enterprise'
          stripe_customer_id: string | null
          max_concurrent_sessions: number
          total_bytes_used: number
          last_activity_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          is_admin?: boolean
          time_balance_minutes?: number
          subscription_status?: 'free' | 'active' | 'cancelled' | 'past_due'
          subscription_tier?: 'basic' | 'premium' | 'enterprise'
          stripe_customer_id?: string | null
          max_concurrent_sessions?: number
          total_bytes_used?: number
          last_activity_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          is_admin?: boolean
          time_balance_minutes?: number
          subscription_status?: 'free' | 'active' | 'cancelled' | 'past_due'
          subscription_tier?: 'basic' | 'premium' | 'enterprise'
          stripe_customer_id?: string | null
          max_concurrent_sessions?: number
          total_bytes_used?: number
          last_activity_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      proxy_sessions: {
        Row: {
          id: string
          user_id: string
          target_domain: string
          session_url: string
          proxy_server: string | null
          status: 'active' | 'expired' | 'terminated' | 'error'
          started_at: string
          ended_at: string | null
          last_activity_at: string
          bytes_transferred: number
          requests_count: number
          user_agent: string | null
          client_ip: string | null
          error_message: string | null
          metadata: Json
        }
        Insert: {
          id?: string
          user_id: string
          target_domain: string
          session_url: string
          proxy_server?: string | null
          status?: 'active' | 'expired' | 'terminated' | 'error'
          started_at?: string
          ended_at?: string | null
          last_activity_at?: string
          bytes_transferred?: number
          requests_count?: number
          user_agent?: string | null
          client_ip?: string | null
          error_message?: string | null
          metadata?: Json
        }
        Update: {
          id?: string
          user_id?: string
          target_domain?: string
          session_url?: string
          proxy_server?: string | null
          status?: 'active' | 'expired' | 'terminated' | 'error'
          started_at?: string
          ended_at?: string | null
          last_activity_at?: string
          bytes_transferred?: number
          requests_count?: number
          user_agent?: string | null
          client_ip?: string | null
          error_message?: string | null
          metadata?: Json
        }
      }
      usage_logs: {
        Row: {
          id: string
          user_id: string
          session_id: string | null
          event_type: 'session_start' | 'session_end' | 'page_request' | 'data_transfer' | 'error' | 'payment'
          target_url: string | null
          bytes_transferred: number
          response_time_ms: number | null
          status_code: number | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_id?: string | null
          event_type: 'session_start' | 'session_end' | 'page_request' | 'data_transfer' | 'error' | 'payment'
          target_url?: string | null
          bytes_transferred?: number
          response_time_ms?: number | null
          status_code?: number | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string | null
          event_type?: 'session_start' | 'session_end' | 'page_request' | 'data_transfer' | 'error' | 'payment'
          target_url?: string | null
          bytes_transferred?: number
          response_time_ms?: number | null
          status_code?: number | null
          metadata?: Json
          created_at?: string
        }
      }
      payment_transactions: {
        Row: {
          id: string
          user_id: string
          stripe_payment_intent_id: string | null
          amount_cents: number
          currency: string
          status: 'pending' | 'succeeded' | 'failed' | 'cancelled'
          time_minutes_purchased: number
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_payment_intent_id?: string | null
          amount_cents: number
          currency?: string
          status?: 'pending' | 'succeeded' | 'failed' | 'cancelled'
          time_minutes_purchased: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_payment_intent_id?: string | null
          amount_cents?: number
          currency?: string
          status?: 'pending' | 'succeeded' | 'failed' | 'cancelled'
          time_minutes_purchased?: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_start_proxy_session: {
        Args: {
          user_id: string
        }
        Returns: boolean
      }
      start_proxy_session: {
        Args: {
          target_domain: string
        }
        Returns: {
          session_id: string
          session_url: string
        }
      }
      terminate_proxy_session: {
        Args: {
          session_id: string
        }
        Returns: boolean
      }
      add_time_balance: {
        Args: {
          user_email: string
          minutes_to_add: number
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
