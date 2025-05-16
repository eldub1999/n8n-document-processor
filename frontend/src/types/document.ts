import type { Tables } from '../services/supabase';

export type Document = Tables<'documents'>;

export type DocumentUpload = {
  file: File;
  description?: string;
};

export type DocumentSearchParams = {
  sortBy?: 'created_at' | 'updated_at' | 'filename' | 'size_bytes';
  sortOrder?: 'asc' | 'desc';
  filterText?: string;
  limit?: number;
  offset?: number;
}; 