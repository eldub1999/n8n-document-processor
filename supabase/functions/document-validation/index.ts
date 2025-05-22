// Minimal version that just uses the supabase client
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { create } from 'https://deno.land/std@0.202.0/crypto/mod.ts';

// Initialize Supabase client
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

// Constants
const DOCUMENTS_BUCKET = 'documents';
const TEMP_UPLOADS_BUCKET = 'temp-uploads';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info'
};

// Generate hash from file content
async function generateContentHash(fileData: Uint8Array): Promise<string> {
  const hash = await create("sha256").update(fileData).digest();
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Check for duplicates in database
async function checkForDuplicates(contentHash: string) {
  const { data, error } = await supabaseClient
    .from('documents')
    .select('id, filename, created_at, created_by')
    .eq('content_hash', contentHash)
    .eq('is_latest', true)
    .limit(1);
    
  if (error) {
    console.error('Database error in checkForDuplicates:', error);
    throw new Error(`Database error: ${error.message}`);
  }
  
  return { 
    isDuplicate: data.length > 0, 
    existingFile: data[0] || null 
  };
}

// Validate file type and size
function validateFile(filename: string, fileSize: number) {
  const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];
  const maxSize = 50 * 1024 * 1024; // 50MB
  
  const fileExtension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  
  if (!allowedTypes.includes(fileExtension)) {
    throw new Error(`File type ${fileExtension} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }
  
  if (fileSize > maxSize) {
    throw new Error(`File size ${Math.round(fileSize / (1024 * 1024))}MB exceeds maximum size of ${maxSize / (1024 * 1024)}MB`);
  }
}

// Move file from temp to permanent storage
async function moveToDocumentStorage(fileId: string, finalPath: string, fileData: Uint8Array) {
  // Upload to documents bucket
  const { error: uploadError } = await supabaseClient
    .storage
    .from(DOCUMENTS_BUCKET)
    .upload(finalPath, fileData, {
      contentType: 'application/octet-stream',
      upsert: false
    });
    
  if (uploadError) {
    console.error('Error uploading to documents bucket:', uploadError);
    throw new Error(`Failed to move file to permanent storage: ${uploadError.message}`);
  }
  
  // Remove from temp storage
  const { error: deleteError } = await supabaseClient
    .storage
    .from(TEMP_UPLOADS_BUCKET)
    .remove([fileId]);
    
  if (deleteError) {
    console.warn('Warning: Failed to cleanup temp file:', deleteError.message);
  }
  
  console.log(`File successfully moved from temp to documents storage: ${finalPath}`);
}

// Main function handler
Deno.serve(async (req) => {
  // Generate unique request ID for tracking
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Processing document validation request`);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // Parse request
    const { fileId, userId, filename, metadata = {} } = await req.json();
    
    if (!fileId || !userId || !filename) {
      throw new Error('Missing required parameters: fileId, userId, and filename are required');
    }
    
    console.log(`[${requestId}] Processing file: ${filename} for user: ${userId}`);
    
    // Download file from temporary storage
    const { data: fileData, error: downloadError } = await supabaseClient
      .storage
      .from(TEMP_UPLOADS_BUCKET)
      .download(fileId);
      
    if (downloadError || !fileData) {
      console.error(`[${requestId}] File download failed:`, downloadError);
      throw new Error(`File download failed: ${downloadError?.message || 'File not found'}`);
    }
    
    // Convert blob to Uint8Array
    const fileBuffer = new Uint8Array(await fileData.arrayBuffer());
    
    // Validate file
    validateFile(filename, fileBuffer.length);
    console.log(`[${requestId}] File validation passed: ${filename} (${Math.round(fileBuffer.length / 1024)}KB)`);
    
    // Generate content hash
    const contentHash = await generateContentHash(fileBuffer);
    console.log(`[${requestId}] Content hash generated: ${contentHash}`);
    
    // Check for duplicates
    const { isDuplicate, existingFile } = await checkForDuplicates(contentHash);
    
    if (isDuplicate) {
      console.log(`[${requestId}] Duplicate file detected: ${existingFile.filename} (ID: ${existingFile.id})`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Duplicate document detected',
          errorCode: 'DUPLICATE_DOCUMENT',
          duplicateFile: {
            id: existingFile.id,
            filename: existingFile.filename,
            uploadedAt: existingFile.created_at,
            uploadedBy: existingFile.created_by
          },
          requestId
        }),
        { 
          status: 409, // Conflict status code
          headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS
          }
        }
      );
    }
    
    // Generate final storage path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const finalPath = `${userId}/${timestamp}-${filename}`;
    
    // Move file to permanent storage
    await moveToDocumentStorage(fileId, finalPath, fileBuffer);
    
    console.log(`[${requestId}] Document validation and processing completed successfully`);
    
    // Return success with metadata
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Document validated and processed successfully',
        data: {
          contentHash,
          storagePath: finalPath,
          filename,
          size: fileBuffer.length,
          userId,
          metadata,
          isUnique: true
        },
        requestId
      }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS
        }
      }
    );
    
  } catch (error) {
    // Log error details
    console.error(`[${requestId}] Error processing request:`, error.message);
    console.error(`[${requestId}] Error stack:`, error.stack);
    
    // Return error response
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        requestId
      }),
      { 
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS
        }
      }
    );
  }
}); 