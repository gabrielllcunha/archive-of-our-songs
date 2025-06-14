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
      users: {
        Row: {
          id: string
          lastfm_username: string
          created_at: string
        }
        Insert: {
          id?: string
          lastfm_username: string
          created_at?: string
        }
        Update: {
          id?: string
          lastfm_username?: string
          created_at?: string
        }
      }
      yearly_data: {
        Row: {
          id: string
          user_id: string
          year: number
          type: 'albums' | 'artists' | 'songs'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          year: number
          type: 'albums' | 'artists' | 'songs'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          year?: number
          type?: 'albums' | 'artists' | 'songs'
          created_at?: string
        }
      }
      monthly_entries: {
        Row: {
          id: string
          yearly_data_id: string
          month: string
          name: string
          artist: string | null
          image_url: string
          scrobbles: number
          created_at: string
        }
        Insert: {
          id?: string
          yearly_data_id: string
          month: string
          name: string
          artist?: string | null
          image_url: string
          scrobbles: number
          created_at?: string
        }
        Update: {
          id?: string
          yearly_data_id?: string
          month?: string
          name?: string
          artist?: string | null
          image_url?: string
          scrobbles?: number
          created_at?: string
        }
      }
    }
  }
} 