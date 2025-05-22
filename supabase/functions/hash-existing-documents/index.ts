import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { create } from 'https://deno.land/std@0.202.0/crypto/mod.ts';

// Initialize Supabase client
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

const DOCUMENTS_BUCKET = 'documents';
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

// Process a single document to generate its hash
async function processDocument(document: any) {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Processing document: ${document.filename} (ID: ${document.id})`);
  
  try {
    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseClient
      .storage
      .from(DOCUMENTS_BUCKET)
      .download(document.storage_path);
      
    if (downloadError || !fileData) {
      console.error(`[${requestId}] Failed to download file:`, downloadError);
      return {
        id: document.id,
        filename: document.filename,
        success: false,
        error: `Download failed: ${downloadError?.message || 'File not found'}`
      };
    }
    
    // Convert blob to Uint8Array and generate hash
    const fileBuffer = new Uint8Array(await fileData.arrayBuffer());
    const contentHash = await generateContentHash(fileBuffer);
    
    console.log(`[${requestId}] Generated hash: ${contentHash}`);
    
    // Update document with the hash
    const { error: updateError } = await supabaseClient
      .from('documents')
      .update({ content_hash: contentHash })
      .eq('id', document.id);
      
    if (updateError) {
      console.error(`[${requestId}] Failed to update document:`, updateError);
      return {
        id: document.id,
        filename: document.filename,
        success: false,
        error: `Database update failed: ${updateError.message}`
      };
    }
    
    console.log(`[${requestId}] Successfully updated document with hash`);
    return {
      id: document.id,
      filename: document.filename,
      success: true,
      hash: contentHash
    };
    
  } catch (error) {
    console.error(`[${requestId}] Error processing document:`, error);
    return {
      id: document.id,
      filename: document.filename,
      success: false,
      error: error.message
    };
  }
}

// Main function handler
Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Hash existing documents request received`);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // Get all documents without content hashes
    const { data: documentsWithoutHash, error: queryError } = await supabaseClient
      .from('documents')
      .select('id, filename, storage_path, content_hash')
      .is('content_hash', null);
      
    if (queryError) {
      throw new Error(`Failed to query documents: ${queryError.message}`);
    }
    
    if (!documentsWithoutHash || documentsWithoutHash.length === 0) {
      console.log(`[${requestId}] No documents without hashes found`);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No documents require hashing',
          processedCount: 0,
          results: []
        }),
        { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS
          }
        }
      );
    }
    
    console.log(`[${requestId}] Found ${documentsWithoutHash.length} documents without hashes`);
    
    // Process each document
    const results = [];
    for (const document of documentsWithoutHash) {
      const result = await processDocument(document);
      results.push(result);
    }
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    console.log(`[${requestId}] Processing complete: ${successCount} successful, ${failureCount} failed`);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${documentsWithoutHash.length} documents`,
        processedCount: documentsWithoutHash.length,
        successCount,
        failureCount,
        results,
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
    console.error(`[${requestId}] Error processing request:`, error.message);
    console.error(`[${requestId}] Error stack:`, error.stack);
    
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