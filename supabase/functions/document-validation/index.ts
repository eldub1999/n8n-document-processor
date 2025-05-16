import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { createHash } from 'https://deno.land/std@0.202.0/crypto/mod.ts';

// Initialize Supabase client with environment variables
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
)

const DOCUMENTS_BUCKET = 'documents';
const TEMP_BUCKET = 'temp-uploads';

interface ValidationRequest {
  fileId: string;      // The temporary file ID in the temp-uploads bucket
  userId: string;      // The user ID who uploaded the file
  filename: string;    // Original filename
  contentType: string; // MIME type
}

interface ValidationResult {
  valid: boolean;
  reasons?: string[];
  metadata?: Record<string, any>;
  contentHash?: string;
  isDuplicate?: boolean;
  duplicateDocumentId?: string;
}

// Generate SHA-256 hash of file content
async function generateContentHash(fileData: Uint8Array): Promise<string> {
  const hashBuffer = await createHash('sha256').update(fileData).digest();
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Check if document with the same content hash already exists
async function checkForDuplicates(contentHash: string): Promise<{ isDuplicate: boolean, documentId?: string }> {
  const { data, error } = await supabaseClient
    .from('documents')
    .select('id')
    .eq('content_hash', contentHash)
    .eq('is_latest', true)
    .limit(1);
  
  if (error) {
    console.error('Error checking for duplicates:', error);
    return { isDuplicate: false };
  }
  
  if (data && data.length > 0) {
    return { isDuplicate: true, documentId: data[0].id };
  }
  
  return { isDuplicate: false };
}

// Validate a document based on its content type and content
async function validateDocument(
  fileData: Uint8Array, 
  contentType: string, 
  filename: string
): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    reasons: [],
    metadata: {
      validation_timestamp: new Date().toISOString()
    }
  };

  // Check file size
  if (fileData.length === 0) {
    result.valid = false;
    result.reasons?.push('File is empty');
    return result;
  }

  // Generate content hash for deduplication
  try {
    const contentHash = await generateContentHash(fileData);
    result.contentHash = contentHash;
    
    // Check for duplicates
    const { isDuplicate, documentId } = await checkForDuplicates(contentHash);
    if (isDuplicate) {
      result.valid = false;
      result.isDuplicate = true;
      result.duplicateDocumentId = documentId;
      result.reasons?.push('Document with identical content already exists');
      return result;
    }
  } catch (error) {
    console.error('Error generating content hash:', error);
  }

  // Basic content validation based on content type
  if (contentType === 'text/plain') {
    // Validate plain text files
    try {
      const text = new TextDecoder().decode(fileData);
      
      // Check if the file is actually text (this is a simple check)
      if (/[\x00-\x08\x0E-\x1F]/.test(text)) {
        result.valid = false;
        result.reasons?.push('File contains invalid characters for text file');
      }
      
      // Store some basic metadata
      if (result.valid) {
        result.metadata = {
          ...result.metadata,
          line_count: text.split('\n').length,
          character_count: text.length
        };
      }
    } catch (error) {
      result.valid = false;
      result.reasons?.push(`Error decoding text file: ${error.message}`);
    }
  } 
  // Add other file type validations here (PDF, DOCX, etc.)
  else if (contentType.startsWith('application/pdf')) {
    // Basic PDF validation
    // Check for PDF signature at the start of file
    if (fileData.length < 5 || 
        fileData[0] !== 0x25 || // %
        fileData[1] !== 0x50 || // P
        fileData[2] !== 0x44 || // D
        fileData[3] !== 0x46 || // F
        fileData[4] !== 0x2D) { // -
      result.valid = false;
      result.reasons?.push('Invalid PDF file format');
    }
  }
  // Add more content type validations here
  
  return result;
}

// Process the validation request and move valid files to the permanent storage
async function processValidation(request: ValidationRequest): Promise<Record<string, any>> {
  console.log(`Starting validation for file: ${request.filename}`);
  
  try {
    // 1. Download the file from the temporary bucket
    const { data: fileData, error: downloadError } = await supabaseClient
      .storage
      .from(TEMP_BUCKET)
      .download(request.fileId);
      
    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message || 'File not found'}`);
    }
    
    // 2. Validate the file
    const fileArrayBuffer = await fileData.arrayBuffer();
    const fileUint8Array = new Uint8Array(fileArrayBuffer);
    const validationResult = await validateDocument(
      fileUint8Array, 
      request.contentType, 
      request.filename
    );
    
    // Check for duplicates first
    if (validationResult.isDuplicate) {
      console.log(`Duplicate document detected: ${request.filename}`);
      return { 
        success: true, 
        valid: false, 
        isDuplicate: true,
        duplicateDocumentId: validationResult.duplicateDocumentId,
        reasons: validationResult.reasons
      };
    }
    
    // 3. If valid, move to permanent storage
    if (validationResult.valid) {
      // Generate a unique path for the file
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExt = request.filename.split('.').pop();
      const permanentPath = `${timestamp}_${randomString}.${fileExt}`;
      
      // Upload to permanent storage
      const { error: uploadError } = await supabaseClient
        .storage
        .from(DOCUMENTS_BUCKET)
        .upload(permanentPath, fileData);
        
      if (uploadError) {
        throw new Error(`Failed to upload to permanent storage: ${uploadError.message}`);
      }
      
      // 4. Insert record into documents table
      const { data: document, error: insertError } = await supabaseClient
        .from('documents')
        .insert({
          filename: request.filename,
          storage_path: permanentPath,
          content_type: request.contentType,
          size_bytes: fileUint8Array.length,
          created_by: request.userId,
          metadata: validationResult.metadata,
          content_hash: validationResult.contentHash,
          version: 1,
          is_latest: true
        })
        .select()
        .single();
        
      if (insertError) {
        throw new Error(`Failed to create document record: ${insertError.message}`);
      }
      
      // 5. Delete the temporary file
      const { error: deleteError } = await supabaseClient
        .storage
        .from(TEMP_BUCKET)
        .remove([request.fileId]);
        
      if (deleteError) {
        console.warn(`Warning: Failed to delete temporary file: ${deleteError.message}`);
      }
      
      console.log(`Successfully validated and processed document: ${request.filename}`);
      return { 
        success: true, 
        valid: true,
        documentId: document.id,
        metadata: validationResult.metadata,
        contentHash: validationResult.contentHash
      };
    } else {
      // If invalid, return validation errors
      console.log(`Validation failed for document: ${request.filename}`);
      return { 
        success: true, 
        valid: false, 
        reasons: validationResult.reasons
      };
    }
    
  } catch (error) {
    console.error(`Error processing validation for ${request.filename}:`, error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// Set up beforeunload event listener
globalThis.addEventListener('beforeunload', (ev) => {
  console.log('Document validation function is shutting down:', ev.detail?.reason);
});

// Serve HTTP requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }
  
  // Only accept POST requests for actual processing
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }
  
  try {
    // Get the JWT token from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header' }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      );
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the token and get the user
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token', details: userError?.message }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      );
    }

    // Continue with regular request processing
    const validationRequest = await req.json();
    
    // Use the user's ID from the verified token instead of trusting the request body
    validationRequest.userId = userData.user.id;
    
    // Validate request parameters
    if (!validationRequest.fileId || !validationRequest.filename || !validationRequest.contentType) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request. Required fields: fileId, filename, contentType' 
        }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      );
    }
    
    // Start processing as a background task
    EdgeRuntime.waitUntil(processValidation(validationRequest));
    
    // Respond immediately with acknowledgment
    return new Response(
      JSON.stringify({ 
        message: 'Document validation started',
        fileId: validationRequest.fileId,
        requestId: crypto.randomUUID() // Return a unique ID for this request
      }),
      { 
        status: 202, 
        headers: { 
          'Content-Type': 'application/json',
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
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }
}); 