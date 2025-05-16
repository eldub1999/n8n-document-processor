import { supabase } from './supabase';
import type { DocumentSearchParams, DocumentUpload, Document } from '../types/document';

const DOCUMENTS_BUCKET = 'documents';

/**
 * Upload a document to Supabase Storage and add its metadata to the database
 */
export async function uploadDocument(document: DocumentUpload): Promise<Document> {
  const user = supabase.auth.getUser();
  if (!user) {
    throw new Error('User must be logged in to upload documents');
  }
  
  const file = document.file;
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
  const filePath = `${fileName}`;
  
  // Upload file to Supabase Storage
  const { error: uploadError, data: uploadData } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(filePath, file);
    
  if (uploadError) {
    throw new Error(`Error uploading file: ${uploadError.message}`);
  }
  
  // Create document metadata in the database
  const { error: dbError, data: dbData } = await supabase
    .from('documents')
    .insert({
      filename: file.name,
      storage_path: filePath,
      content_type: file.type,
      size_bytes: file.size,
      created_by: (await user).data.user?.id,
      description: document.description
    })
    .select()
    .single();
    
  if (dbError) {
    // If database insert fails, try to delete the uploaded file
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([filePath]);
    throw new Error(`Error creating document record: ${dbError.message}`);
  }
  
  return dbData;
}

/**
 * Get all documents for the current user with pagination and sorting
 */
export async function getDocuments(params: DocumentSearchParams = {}): Promise<Document[]> {
  const { 
    sortBy = 'created_at', 
    sortOrder = 'desc',
    limit = 20,
    offset = 0,
    filterText = '' 
  } = params;
  
  let query = supabase
    .from('documents')
    .select('*')
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);
    
  if (filterText) {
    query = query.ilike('filename', `%${filterText}%`);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Error fetching documents: ${error.message}`);
  }
  
  return data;
}

/**
 * Get a single document by ID
 */
export async function getDocumentById(id: string): Promise<Document> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) {
    throw new Error(`Error fetching document: ${error.message}`);
  }
  
  return data;
}

/**
 * Delete a document and its file
 */
export async function deleteDocument(id: string): Promise<void> {
  // First get the document to get the storage path
  const document = await getDocumentById(id);
  
  // Delete the document record from the database
  const { error: dbError } = await supabase
    .from('documents')
    .delete()
    .eq('id', id);
    
  if (dbError) {
    throw new Error(`Error deleting document record: ${dbError.message}`);
  }
  
  // Delete the file from storage
  const { error: storageError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .remove([document.storage_path]);
    
  if (storageError) {
    console.error(`Failed to delete file from storage: ${storageError.message}`);
  }
}

/**
 * Get a download URL for a document
 */
export async function getDocumentUrl(document: Document): Promise<string> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(document.storage_path, 60 * 60); // 1 hour expiry
    
  if (error || !data?.signedUrl) {
    throw new Error(`Error generating download URL: ${error?.message || 'Unknown error'}`);
  }
  
  return data.signedUrl;
}

/**
 * Update a document's metadata
 */
export async function updateDocument(id: string, updates: { description?: string }): Promise<Document> {
  const { data, error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
    
  if (error) {
    throw new Error(`Error updating document: ${error.message}`);
  }
  
  return data;
} 