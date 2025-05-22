import { supabase } from './supabase';
import type { DocumentSearchParams, DocumentUpload, Document } from '../types/document';

const DOCUMENTS_BUCKET = 'documents';
const TEMP_UPLOADS_BUCKET = 'temp-uploads';

// Interface for Edge Function response
interface ValidationResponse {
  success: boolean;
  error?: string;
  errorCode?: string;
  duplicateFile?: {
    id: string;
    filename: string;
    uploadedAt: string;
    uploadedBy: string;
  };
  data?: {
    contentHash: string;
    storagePath: string;
    filename: string;
    size: number;
    userId: string;
    metadata: any;
    isUnique: boolean;
  };
  requestId?: string;
}

/**
 * Upload a document with deduplication checking
 */
export async function uploadDocument(document: DocumentUpload): Promise<Document> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('User must be logged in to upload documents');
  }
  
  const file = document.file;
  const fileExt = file.name.split('.').pop();
  const tempFileId = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
  
  try {
    // Step 1: Upload file to temporary storage
    const { error: tempUploadError } = await supabase.storage
      .from(TEMP_UPLOADS_BUCKET)
      .upload(tempFileId, file, {
        contentType: file.type,
        upsert: false
      });
      
    if (tempUploadError) {
      throw new Error(`Failed to upload file to temporary storage: ${tempUploadError.message}`);
    }
    
    // Step 2: Call validation Edge Function with deduplication checking
    const { data: validationData, error: functionError } = await supabase.functions.invoke('document-validation', {
      body: {
        fileId: tempFileId,
        userId: user.id,
        filename: file.name,
        metadata: {
          description: document.description,
          originalSize: file.size,
          contentType: file.type
        }
      }
    });
    

    
    if (functionError) {
      // Clean up temp file on function error
      await supabase.storage.from(TEMP_UPLOADS_BUCKET).remove([tempFileId]);
      console.error('Edge Function error details:', functionError);
      
      // Check if this is a 409 conflict (duplicate detection) with response body
      if (functionError.context?.res?.status === 409 && functionError.context?.res?.body) {
        try {
          const duplicateResponse = functionError.context.res.body;
          if (duplicateResponse.errorCode === 'DUPLICATE_DOCUMENT' && duplicateResponse.duplicateFile) {
            const duplicateInfo = duplicateResponse.duplicateFile;
            const uploadDate = new Date(duplicateInfo.uploadedAt).toLocaleDateString();
            throw new Error(`This document already exists in the system. Original file "${duplicateInfo.filename}" was uploaded on ${uploadDate}.`);
          }
        } catch (parseError) {
          console.warn('Failed to parse duplicate response:', parseError);
        }
      }
      
      throw new Error(`Validation failed: ${functionError.message} (Code: ${functionError.code || 'unknown'})`);
    }
    
    const response: ValidationResponse = validationData;
    
    if (!response.success) {
      // Clean up temp file on validation failure
      await supabase.storage.from(TEMP_UPLOADS_BUCKET).remove([tempFileId]);
      
      if (response.errorCode === 'DUPLICATE_DOCUMENT' && response.duplicateFile) {
        const duplicateInfo = response.duplicateFile;
        const uploadDate = new Date(duplicateInfo.uploadedAt).toLocaleDateString();
        throw new Error(`This document already exists in the system. Original file "${duplicateInfo.filename}" was uploaded on ${uploadDate}.`);
      }
      
      throw new Error(response.error || 'Document validation failed');
    }
    
    // Step 3: Create document metadata in database
    if (!response.data) {
      throw new Error('Validation succeeded but no document data returned');
    }
    
    const { data: dbData, error: dbError } = await supabase
      .from('documents')
      .insert({
        filename: file.name,
        storage_path: response.data.storagePath,
        content_type: file.type,
        size_bytes: file.size,
        created_by: user.id,
        description: document.description,
        content_hash: response.data.contentHash,
        version: 1,
        is_latest: true
      })
      .select()
      .single();
      
    if (dbError) {
      // If database insert fails, try to clean up the moved file
      await supabase.storage.from(DOCUMENTS_BUCKET).remove([response.data.storagePath]);
      throw new Error(`Failed to create document record: ${dbError.message}`);
    }
    
    return dbData;
    
  } catch (error) {
    // Ensure temp file is cleaned up on any error
    await supabase.storage.from(TEMP_UPLOADS_BUCKET).remove([tempFileId]);
    throw error;
  }
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
    .eq('is_latest', true) // Only show latest versions
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