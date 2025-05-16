import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

// Types to match our frontend types
interface Document {
  id: string;
  filename: string;
  storage_path: string;
  content_type: string;
  size_bytes: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  description: string | null;
  metadata?: Record<string, any>;
}

// Initialize Supabase client with environment variables
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
)

const DOCUMENTS_BUCKET = 'documents';

// Function to extract metadata from a document based on its type
async function extractMetadata(file: Uint8Array, contentType: string): Promise<Record<string, any>> {
  const metadata: Record<string, any> = {
    processed_at: new Date().toISOString()
  };

  // Basic text extraction for text files
  if (contentType === 'text/plain') {
    const text = new TextDecoder().decode(file);
    const lines = text.split('\n');
    
    metadata.line_count = lines.length;
    metadata.word_count = text.split(/\s+/).filter(word => word.length > 0).length;
    metadata.character_count = text.length;
    
    // Extract potential title (first non-empty line)
    for (const line of lines) {
      if (line.trim().length > 0) {
        metadata.title = line.trim();
        break;
      }
    }
  }
  
  // Add more content type handlers for PDFs, DOCs, etc.
  // This would require additional libraries for parsing

  return metadata;
}

// Main function to process the document
async function processDocument(documentId: string) {
  console.log(`Starting processing for document: ${documentId}`);
  
  try {
    // 1. Get document metadata from the database
    const { data: document, error: fetchError } = await supabaseClient
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();
    
    if (fetchError || !document) {
      throw new Error(`Failed to fetch document: ${fetchError?.message || 'Document not found'}`);
    }
    
    // 2. Download the file from Storage
    const { data: fileData, error: downloadError } = await supabaseClient
      .storage
      .from(DOCUMENTS_BUCKET)
      .download(document.storage_path);
      
    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message || 'File not found'}`);
    }
    
    // 3. Extract metadata based on file type
    const fileArrayBuffer = await fileData.arrayBuffer();
    const fileUint8Array = new Uint8Array(fileArrayBuffer);
    const metadata = await extractMetadata(fileUint8Array, document.content_type);
    
    // 4. Update the document record with the extracted metadata
    const { error: updateError } = await supabaseClient
      .from('documents')
      .update({ 
        metadata: metadata,
        updated_at: new Date().toISOString() 
      })
      .eq('id', documentId);
      
    if (updateError) {
      throw new Error(`Failed to update document with metadata: ${updateError.message}`);
    }
    
    console.log(`Successfully processed document ${documentId}`);
    return { success: true, documentId, metadata };
    
  } catch (error) {
    console.error(`Error processing document ${documentId}:`, error);
    return { success: false, documentId, error: error.message };
  }
}

// Set up beforeunload event listener to log when the function is about to shut down
globalThis.addEventListener('beforeunload', (ev) => {
  console.log('Document processing function is shutting down:', ev.detail?.reason);
});

// Serve HTTP requests
Deno.serve(async (req) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  try {
    const { documentId } = await req.json();
    
    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'Document ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Start document processing as a background task
    EdgeRuntime.waitUntil(processDocument(documentId));
    
    // Respond immediately while processing continues in the background
    return new Response(
      JSON.stringify({ 
        message: 'Document processing started',
        documentId 
      }),
      { 
        status: 202, 
        headers: { 
          'Content-Type': 'application/json',
          // Add CORS headers to allow browser requests
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        } 
      }
    );
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}); 