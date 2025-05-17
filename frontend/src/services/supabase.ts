import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be defined in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string;
          filename: string;
          storage_path: string;
          content_type: string;
          size_bytes: number;
          created_by: string;
          created_at: string;
          updated_at: string;
          description: string | null;
          content_hash: string | null;
          version: number;
          is_latest: boolean;
          jurisdiction: string | null;
          county: string | null;
          document_type: string | null;
        };
        Insert: {
          id?: string;
          filename: string;
          storage_path: string;
          content_type: string;
          size_bytes: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          description?: string | null;
          content_hash?: string | null;
          version?: number;
          is_latest?: boolean;
          jurisdiction?: string | null;
          county?: string | null;
          document_type?: string | null;
        };
        Update: {
          id?: string;
          filename?: string;
          storage_path?: string;
          content_type?: string;
          size_bytes?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          description?: string | null;
          content_hash?: string | null;
          version?: number;
          is_latest?: boolean;
          jurisdiction?: string | null;
          county?: string | null;
          document_type?: string | null;
        };
      };
      document_versions: {
        Row: {
          id: string;
          document_id: string;
          version_number: number;
          storage_path: string;
          created_at: string;
          created_by: string | null;
          expiry_date: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          version_number: number;
          storage_path: string;
          created_at?: string;
          created_by?: string | null;
          expiry_date: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          version_number?: number;
          storage_path?: string;
          created_at?: string;
          created_by?: string | null;
          expiry_date?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']; 