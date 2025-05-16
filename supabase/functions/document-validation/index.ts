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
  const requestStart = new Date();
  console.log(`Request received: ${req.method} ${new URL(req.url).pathname} at ${requestStart.toISOString()}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info'
      }
    });
  }

  // Only accept POST requests
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

  let requestId: string | undefined;
  
  try {
    console.log('Parsing request body...');
    
    // Debug headers
    const headers = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log('Request headers:', JSON.stringify(headers, null, 2));
    
    // Get the request data
    const requestData = await req.json();
    requestId = requestData.requestId;
    const { fileId, userId, filename, contentType } = requestData;
    
    // Log details for debugging
    console.log(`Processing document validation:
      RequestID: ${requestId || 'Not provided'}
      FileID: ${fileId}
      UserID: ${userId}
      Filename: ${filename}
      ContentType: ${contentType}
    `);
    
    // Log auth token for debugging specific request
    if (requestId === 'b742794a-e58b-4f43-b057-f56499f7d95c') {
      const authHeader = req.headers.get('Authorization');
      console.log(`Target request ID found! Auth header: ${authHeader}`);
    }

    // Check required parameters
    if (!fileId || !userId || !filename || !contentType) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters',
          requiredParams: ['fileId', 'userId', 'filename', 'contentType'],
          requestId
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

    try {
      // Get the file from temporary storage
      console.log(`Fetching file ${fileId} from temporary storage...`);
      const { data: fileData, error: fileError } = await supabaseClient
        .storage
        .from(TEMP_BUCKET)
        .download(fileId);

      if (fileError) {
        console.error('Error fetching file:', fileError);
        throw new Error(`Failed to fetch file: ${fileError.message}`);
      }
      
      if (!fileData) {
        throw new Error('File not found in temporary storage');
      }

      // Generate a hash of the file content for deduplication
      console.log('Computing file hash for deduplication...');
      const fileBuffer = await fileData.arrayBuffer();
      const contentHash = await generateContentHash(new Uint8Array(fileBuffer));
      console.log(`File hash: ${contentHash}`);

      // Check if this hash already exists in the database (deduplication)
      console.log('Checking for duplicates...');
      const { data: existingDocs, error: queryError } = await supabaseClient
        .from('documents')
        .select('id, filename')
        .eq('content_hash', contentHash)
        .limit(1);

      if (queryError) {
        console.error('Database query error:', queryError);
        throw new Error(`Database error: ${queryError.message}`);
      }

      // If duplicate found, return error with details
      if (existingDocs && existingDocs.length > 0) {
        console.log(`Duplicate found: ${existingDocs[0].id} - ${existingDocs[0].filename}`);
        return new Response(
          JSON.stringify({
            success: false,
            isDuplicate: true,
            existingDocumentId: existingDocs[0].id,
            existingFilename: existingDocs[0].filename,
            message: `This file already exists as "${existingDocs[0].filename}"`,
            requestId
          }),
          { 
            status: 409, // Conflict
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        );
      }

      // File validated successfully, no duplicates found
      console.log('Validation successful, no duplicates found');
      const requestEnd = new Date();
      const processingTime = requestEnd.getTime() - requestStart.getTime();
      
      return new Response(
        JSON.stringify({
          success: true,
          fileId,
          contentHash,
          message: 'File validated successfully',
          requestId,
          processingTimeMs: processingTime
        }),
        { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    } catch (error) {
      return handleError(error, 500, requestId);
    }
  } catch (error) {
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return handleError(new Error('Invalid JSON in request body'), 400, requestId);
    }
    
    return handleError(error, 500, requestId);
  }
});

// Helper to log and format error responses
function handleError(error: Error, status = 500, requestId?: string): Response {
  console.error(`Document validation error [${requestId || 'unknown'}]:`, error);
  return new Response(
    JSON.stringify({ 
      error: error.message,
      success: false,
      requestId: requestId
    }),
    { 
      status: status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    }
  );
} 