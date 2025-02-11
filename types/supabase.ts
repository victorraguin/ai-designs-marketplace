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
          subscription_id: string | null
          generations_used: number
          last_generation_reset: string
          address: string | null
          is_admin: boolean
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          subscription_id?: string | null
          generations_used?: number
          last_generation_reset?: string
          address?: string | null
          is_admin?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          subscription_id?: string | null
          generations_used?: number
          last_generation_reset?: string
          address?: string | null
          is_admin?: boolean
          created_at?: string
        }
      }
      designs: {
        Row: {
          id: string
          creator_id: string | null
          image_url: string
          prompt: string
          status: string
          likes_count: number
          views_count: number
          impressions_count: number
          created_at: string
          canvas_json: Json | null
          style_id: string | null
          category: string | null
        }
        Insert: {
          id?: string
          creator_id?: string | null
          image_url: string
          prompt: string
          status?: string
          likes_count?: number
          views_count?: number
          impressions_count?: number
          created_at?: string
          canvas_json?: Json | null
          style_id?: string | null
          category?: string | null
        }
        Update: {
          id?: string
          creator_id?: string | null
          image_url?: string
          prompt?: string
          status?: string
          likes_count?: number
          views_count?: number
          impressions_count?: number
          created_at?: string
          canvas_json?: Json | null
          style_id?: string | null
          category?: string | null
        }
      }
    }
  }
}