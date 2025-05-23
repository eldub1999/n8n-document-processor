// UPDATED: Using latest Gemini 2.5 Flash Preview (05-20) for enhanced document processing
// - Improved multimodal capabilities with thinking mode
// - Better document understanding and markdown generation
// - Enhanced legal document structure preservation
// - January 2025 knowledge cutoff for current legal standards

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { VoyageAIClient, VoyageAIError } from "https://esm.sh/voyageai@0.0.3";

// Types
interface DocumentChunk {
  index: number;
  text: string;
  tokens: number;
}

interface ProcessingUpdate {
  documentId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  stage?: 'text_extraction' | 'chunking' | 'embedding_generation' | 'storage';
  progress?: number;
  processedChunks?: number;
  totalChunks?: number;
  errorMessage?: string;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration constants
const MAX_BATCH_TOKENS = 50000; // Much more conservative - half of my previous estimate
const CHUNK_MAX_TOKENS = 800; // Smaller chunks
const CHUNK_OVERLAP_TOKENS = 80;
const MAX_BATCH_SIZE = 32; // Smaller batch size

// Helper function to get API keys from vault
async function getApiKey(keyName: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_api_key', { key_name: keyName });
  if (error) {
    throw new Error(`Failed to retrieve API key: ${error.message}`);
  }
  return data;
}

// Helper function to update processing status
async function updateProcessingStatus(update: ProcessingUpdate): Promise<void> {
  const { error } = await supabase.rpc('update_processing_progress', {
    doc_id: update.documentId,
    new_status: update.status,
    new_stage: update.stage || null,
    progress_pct: update.progress || null,
    processed_count: update.processedChunks || null,
    total_count: update.totalChunks || null,
    error_msg: update.errorMessage || null
  });
  
  if (error) {
    console.error('Failed to update processing status:', error);
  }
}

// More accurate token counting function
function countTokens(text: string): number {
  // Much more conservative approximation: 2.5 characters per token
  // This accounts for legal terminology being more token-dense
  // and provides a significant safety margin
  return Math.ceil(text.length / 2.5);
}

// Clean text to handle Unicode issues
function cleanText(text: string): string {
  return text
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/[\uFEFF\uFFFE\uFFFF]/g, '') // Remove BOM and other problematic Unicode
    .replace(/\u00A0/g, ' ') // Replace non-breaking space with regular space
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
    .trim();
}

// Get Google Cloud access token using service account JSON
async function getGoogleCloudAccessToken(): Promise<string> {
  try {
    // Get service account JSON from vault
    const serviceAccountJson = await getApiKey('google_service_account_json');
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    // Create JWT for Google OAuth2
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600; // Token expires in 1 hour
    
    // JWT header
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };
    
    // JWT payload
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: exp
    };
    
    // Encode header and payload
    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    // Create signature using Web Crypto API
    const textToSign = `${encodedHeader}.${encodedPayload}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(textToSign);
    
    // Import the private key
    const privateKeyPem = serviceAccount.private_key;
    const privateKeyDer = pemToDer(privateKeyPem);
    
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      privateKeyDer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256'
      },
      false,
      ['sign']
    );
    
    // Sign the JWT
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, data);
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    const jwt = `${textToSign}.${encodedSignature}`;
    
    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
    }
    
    const tokenData = await tokenResponse.json();
    console.log('Successfully obtained Google Cloud access token');
    return tokenData.access_token;
    
  } catch (error) {
    console.error('Failed to get Google Cloud access token:', error);
    throw new Error(`Google Cloud authentication failed: ${error.message}`);
  }
}

// Helper function to convert PEM to DER format
function pemToDer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Extract text using Google Vertex AI multimodal capabilities
async function extractTextWithVertexAI(fileData: Uint8Array, mimeType: string): Promise<string> {
  try {
    const accessToken = await getGoogleCloudAccessToken();
    const projectId = Deno.env.get('GOOGLE_CLOUD_PROJECT') || 'vertex-ai-for-rag';
    
    // Convert file to base64 with better memory handling
    let base64Data: string;
    try {
      // Use chunks for larger files to avoid stack overflow
      if (fileData.length > 100000) { // 100KB threshold
        const chunks: string[] = [];
        const chunkSize = 8192; // 8KB chunks
        for (let i = 0; i < fileData.length; i += chunkSize) {
          const chunk = fileData.slice(i, i + chunkSize);
          chunks.push(String.fromCharCode(...chunk));
        }
        base64Data = btoa(chunks.join(''));
      } else {
        base64Data = btoa(String.fromCharCode(...fileData));
      }
    } catch (error) {
      console.error('Base64 encoding failed:', error);
      throw new Error('Failed to encode file for processing');
    }
    
    // Use latest Gemini 2.5 Flash with enhanced document processing capabilities
    const vertexAIUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash-preview-05-20:generateContent`;
    
    const requestBody = {
      contents: [{
        role: "user",
        parts: [
          {
            text: `Please analyze this document and convert it to clean, well-structured markdown suitable for RAG (Retrieval-Augmented Generation). Focus on:

1. **Legal Document Structure**: Preserve section numbers, headings, and hierarchical organization
2. **Content Accuracy**: Extract all text content without hallucination 
3. **Markdown Formatting**: Use proper headers (# ## ###), lists, tables, and emphasis
4. **Legal Citations**: Preserve exact legal citations, case references, and statutory references
5. **Key Information**: Highlight important legal concepts, definitions, and procedures
6. **Clean Output**: Remove headers, footers, page numbers, and navigation elements
7. **Logical Flow**: Ensure content flows logically for search and retrieval

The output should be production-ready markdown that legal professionals can easily search through and reference.`
          },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data
            }
          }
        ]
      }],
      generationConfig: {
        maxOutputTokens: 32768,  // Increased for longer documents
        temperature: 0.1,  // Low temperature for accuracy
        topP: 0.95,
        topK: 40
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH", 
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };
    
    console.log(`Sending ${mimeType} document to Vertex AI for text extraction...`);
    
    const response = await fetch(vertexAIUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Vertex AI API error: ${response.status} - ${errorText}`);
      throw new Error(`Vertex AI API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    
    if (result.candidates && result.candidates[0] && result.candidates[0].content) {
      const extractedText = result.candidates[0].content.parts[0].text;
      
      if (!extractedText || extractedText.trim().length < 50) {
        throw new Error('Vertex AI returned insufficient text content');
      }
      
      console.log(`Vertex AI successfully extracted ${extractedText.length} characters of text`);
      return cleanText(extractedText);
    } else {
      console.error('Unexpected Vertex AI response format:', JSON.stringify(result, null, 2));
      throw new Error('Unexpected response format from Vertex AI');
    }
    
  } catch (error) {
    console.error('Vertex AI extraction failed:', error);
    throw new Error(`Document processing failed: ${error.message}`);
  }
}

// Text extraction function using multimodal AI
async function extractTextFromDocument(filePath: string, contentType: string): Promise<string> {
  try {
    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(filePath);
    
    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    let text = '';
    
    // Convert to text based on content type
    switch (contentType) {
      case 'text/plain':
        text = await fileData.text();
        break;
      
      case 'application/pdf':
      case 'image/jpeg':
      case 'image/png':
      case 'image/webp':
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        // Use Vertex AI multimodal for all complex document types
        const arrayBuffer = await fileData.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        text = await extractTextWithVertexAI(uint8Array, contentType);
        break;
      
      default:
        throw new Error(`Unsupported content type: ${contentType}`);
    }

    // Clean and validate the extracted text
    text = cleanText(text);
    
    if (!text.trim()) {
      throw new Error('No readable text content found in document');
    }
    
    if (text.length < 50) {
      throw new Error('Extracted text is too short to be meaningful');
    }
    
    console.log(`Successfully extracted ${text.length} characters of clean text`);
    return text;
    
  } catch (error) {
    console.error('Text extraction error:', error);
    throw new Error(`Text extraction failed: ${error.message}`);
  }
}

// Enhanced legal-aware text chunking with proper token limits
function chunkTextForLegal(text: string, maxTokens: number = CHUNK_MAX_TOKENS, overlap: number = CHUNK_OVERLAP_TOKENS): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  
  // Note: text is already cleaned in extractTextFromDocument, no need to clean again
  // Split text into paragraphs first to preserve legal structure
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  let currentChunk = '';
  let chunkIndex = 0;
  
  for (const paragraph of paragraphs) {
    const paragraphTokens = countTokens(paragraph);
    const currentChunkTokens = countTokens(currentChunk);
    
    // If adding this paragraph would exceed token limit, save current chunk
    if (currentChunkTokens + paragraphTokens > maxTokens && currentChunk.trim().length > 0) {
      chunks.push({
        index: chunkIndex++,
        text: currentChunk.trim(), // Remove redundant cleanText call
        tokens: currentChunkTokens
      });
      
      // Start new chunk with overlap from previous chunk
      const words = currentChunk.split(/\s+/);
      const overlapWords = Math.min(Math.floor(overlap / 1.3), words.length);
      currentChunk = words.slice(-overlapWords).join(' ') + ' ' + paragraph;
    } else {
      // Add paragraph to current chunk
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
    
    // If a single paragraph is larger than max tokens, split it further
    if (paragraphTokens > maxTokens) {
      const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim().length > 0);
      currentChunk = '';
      
      for (const sentence of sentences) {
        const sentenceWithPunctuation = sentence.trim() + '. ';
        const sentenceTokens = countTokens(sentenceWithPunctuation);
        const currentTokens = countTokens(currentChunk);
        
        if (currentTokens + sentenceTokens > maxTokens && currentChunk.trim().length > 0) {
          chunks.push({
            index: chunkIndex++,
            text: currentChunk.trim(), // Remove redundant cleanText call
            tokens: currentTokens
          });
          currentChunk = sentenceWithPunctuation;
        } else {
          currentChunk += sentenceWithPunctuation;
        }
      }
    }
  }
  
  // Add the last chunk if it has content
  if (currentChunk.trim().length > 50) {
    chunks.push({
      index: chunkIndex++,
      text: currentChunk.trim(), // Remove redundant cleanText call
      tokens: countTokens(currentChunk)
    });
  }
  
  return chunks.filter(chunk => chunk.tokens > 10); // Filter out very small chunks
}

// Generate embeddings with intelligent batching and retry logic
async function generateEmbeddings(chunks: DocumentChunk[], documentId: string): Promise<number[][]> {
  try {
    const voyageApiKey = await getApiKey('voyage_ai_api_key');
    const client = new VoyageAIClient({ apiKey: voyageApiKey });
    
    const allEmbeddings: number[][] = [];
    let processedChunks = 0;
    
    // Create batches based on token count, not just chunk count
    const batches: DocumentChunk[][] = [];
    let currentBatch: DocumentChunk[] = [];
    let currentBatchTokens = 0;
    
    for (const chunk of chunks) {
      // Check if adding this chunk would exceed limits (use stricter limits)
      if ((currentBatchTokens + chunk.tokens > MAX_BATCH_TOKENS) || 
          (currentBatch.length >= MAX_BATCH_SIZE)) {
        
        if (currentBatch.length > 0) {
          batches.push([...currentBatch]);
          currentBatch = [];
          currentBatchTokens = 0;
        }
      }
      
      currentBatch.push(chunk);
      currentBatchTokens += chunk.tokens;
    }
    
    // Add the last batch
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }
    
    console.log(`Processing ${chunks.length} chunks in ${batches.length} batches for document ${documentId}`);
    
    // Process each batch with retry logic
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchTexts = batch.map(chunk => chunk.text);
      const batchTokenCount = batch.reduce((sum, chunk) => sum + chunk.tokens, 0);
      
      console.log(`Processing batch ${batchIndex + 1}/${batches.length}: ${batch.length} chunks, ${batchTokenCount} estimated tokens`);
      
      // Retry logic for batch processing
      let retryCount = 0;
      const maxRetries = 3;
      let currentBatchTexts = [...batchTexts];
      
      while (retryCount <= maxRetries) {
        try {
          const response = await client.embed({
            input: currentBatchTexts,
            model: "voyage-3-large"
          });
          
          if (response.data) {
            allEmbeddings.push(...response.data.map(item => item.embedding));
            processedChunks += currentBatchTexts.length;
            
            // Update progress
            await updateProcessingStatus({
              documentId,
              status: 'processing',
              stage: 'embedding_generation',
              progress: 50 + Math.floor((processedChunks / chunks.length) * 25),
              processedChunks,
              totalChunks: chunks.length
            });
            
            console.log(`Successfully processed batch ${batchIndex + 1} with ${currentBatchTexts.length} chunks`);
            break; // Success, move to next batch
          } else {
            throw new Error('No embeddings returned from Voyage AI');
          }
        } catch (batchError) {
          retryCount++;
          
          // Check if it's a token limit error
          if (batchError.message && batchError.message.includes('max allowed tokens')) {
            console.log(`Batch ${batchIndex + 1} exceeded token limit (attempt ${retryCount}), splitting batch...`);
            
            if (currentBatchTexts.length <= 1) {
              // Single chunk is too large, truncate it
              const truncatedText = currentBatchTexts[0].substring(0, Math.floor(currentBatchTexts[0].length * 0.7));
              currentBatchTexts = [truncatedText];
              console.log(`Truncated single chunk to ${truncatedText.length} characters`);
            } else {
              // Split the batch in half
              const halfSize = Math.floor(currentBatchTexts.length / 2);
              const firstHalf = currentBatchTexts.slice(0, halfSize);
              const secondHalf = currentBatchTexts.slice(halfSize);
              
              // Process first half
              currentBatchTexts = firstHalf;
              console.log(`Split batch into chunks of ${firstHalf.length} and ${secondHalf.length}`);
              
              // Add second half back to batches to process later
              if (secondHalf.length > 0) {
                batches.splice(batchIndex + 1, 0, batch.slice(halfSize));
              }
            }
            
            if (retryCount <= maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
              continue; // Retry with modified batch
            }
          } else {
            // Different error, don't retry
            console.error(`Batch ${batchIndex + 1} failed with non-token error:`, batchError.message);
            throw new Error(`Batch processing failed: ${batchError.message}`);
          }
          
          // Max retries exceeded
          throw new Error(`Batch processing failed after ${maxRetries} retries: ${batchError.message}`);
        }
      }
      
      // Rate limiting: delay between batches
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Longer delay
      }
    }
    
    console.log(`Successfully generated ${allEmbeddings.length} embeddings for ${chunks.length} chunks`);
    return allEmbeddings;
    
  } catch (error) {
    if (error instanceof VoyageAIError) {
      throw new Error(`Voyage AI error: Status code: ${error.statusCode}\nBody: ${JSON.stringify(error.response, null, 2)} (Status: ${error.statusCode})`);
    }
    throw new Error(`Embedding generation failed: ${error.message}`);
  }
}

// Store embeddings in database
async function storeEmbeddings(
  documentId: string,
  chunks: DocumentChunk[],
  embeddings: number[][]
): Promise<void> {
  const embeddingRows = chunks.map((chunk, index) => ({
    document_id: documentId,
    chunk_index: chunk.index,
    chunk_text: chunk.text, // Text is already cleaned
    chunk_tokens: chunk.tokens,
    embedding: embeddings[index], // Use array directly
    metadata: {
      processing_timestamp: new Date().toISOString(),
      model: 'voyage-3-large',
      text_length: chunk.text.length
    }
  }));
  
  // Insert in smaller batches to avoid memory issues
  const batchSize = 25; // Reduced batch size for safer processing
  for (let i = 0; i < embeddingRows.length; i += batchSize) {
    const batch = embeddingRows.slice(i, i + batchSize);
    
    try {
      const { error } = await supabase
        .from('document_embeddings')
        .insert(batch);
      
      if (error) {
        console.error(`Embedding storage error for batch ${Math.floor(i/batchSize) + 1}:`, error);
        throw new Error(`Failed to store embeddings batch ${Math.floor(i/batchSize) + 1}: ${error.message}`);
      }
      
      console.log(`Successfully stored batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(embeddingRows.length/batchSize)} (${batch.length} embeddings)`);
    } catch (batchError) {
      console.error(`Batch ${Math.floor(i/batchSize) + 1} storage failed:`, batchError);
      throw batchError;
    }
  }
  
  console.log(`Successfully stored all ${embeddingRows.length} embeddings for document ${documentId}`);
}

// Main processing function
async function processDocument(documentId: string): Promise<void> {
  try {
    // Update status to processing
    await updateProcessingStatus({
      documentId,
      status: 'processing',
      stage: 'text_extraction',
      progress: 0
    });
    
    // Get document info
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('storage_path, content_type, filename, size_bytes')
      .eq('id', documentId)
      .single();
    
    if (docError || !document) {
      throw new Error(`Document not found: ${docError?.message}`);
    }
    
    console.log(`Processing ${document.filename} (${Math.round(document.size_bytes/1024)}KB)`);
    
    // Extract text
    console.log(`Extracting text from ${document.storage_path}`);
    const text = await extractTextFromDocument(document.storage_path, document.content_type);
    
    if (!text.trim()) {
      throw new Error('No text content found in document');
    }
    
    // Store the full RAG-optimized markdown
    try {
      const { error: markdownStoreError } = await supabase
        .from('processed_markdown_documents') // ASSUMPTION: This table exists
        .insert({
          document_id: documentId,
          markdown_content: text,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      if (markdownStoreError) {
        // Log error but attempt to continue processing with the extracted text
        console.warn(`[${documentId}] Failed to store full markdown: ${markdownStoreError.message}. Proceeding with in-memory text.`);
        // Optionally, you could re-throw if storing full markdown is critical:
        // throw new Error(`Failed to store full markdown: ${markdownStoreError.message}`);
      } else {
        console.log(`[${documentId}] Full markdown stored successfully.`);
      }
    } catch (e) {
      console.warn(`[${documentId}] Exception storing full markdown: ${e.message}. Proceeding with in-memory text.`);
    }

    const textTokens = countTokens(text);
    console.log(`Extracted ${text.length} characters (~${textTokens} tokens) from ${document.filename}`);
    
    // Update progress
    await updateProcessingStatus({
      documentId,
      status: 'processing',
      stage: 'chunking',
      progress: 25
    });
    
    // Chunk text with proper token management
    console.log(`Chunking text (${text.length} characters, ~${textTokens} tokens)`);
    const chunks = chunkTextForLegal(text);
    
    if (chunks.length === 0) {
      throw new Error('No valid chunks created from document text');
    }
    
    const totalChunkTokens = chunks.reduce((sum, chunk) => sum + chunk.tokens, 0);
    console.log(`Created ${chunks.length} chunks with ${totalChunkTokens} total tokens (avg: ${Math.round(totalChunkTokens/chunks.length)} tokens/chunk)`);
    
    // Update progress
    await updateProcessingStatus({
      documentId,
      status: 'processing',
      stage: 'embedding_generation',
      progress: 50,
      totalChunks: chunks.length
    });
    
    // Generate embeddings with intelligent batching
    console.log('Generating embeddings with batch processing...');
    const embeddings = await generateEmbeddings(chunks, documentId);
    
    // Update progress
    await updateProcessingStatus({
      documentId,
      status: 'processing',
      stage: 'storage',
      progress: 75
    });
    
    // Store embeddings
    console.log('Storing embeddings in database...');
    await storeEmbeddings(documentId, chunks, embeddings);
    
    // Mark as completed
    await updateProcessingStatus({
      documentId,
      status: 'completed',
      progress: 100,
      processedChunks: chunks.length,
      totalChunks: chunks.length
    });
    
    console.log(`Document processing completed: ${document.filename} (${chunks.length} chunks, ${totalChunkTokens} tokens)`);
    
  } catch (error) {
    console.error(`Document processing failed for ${documentId}:`, error);
    
    await updateProcessingStatus({
      documentId,
      status: 'failed',
      errorMessage: error.message
    });
    
    throw error;
  }
}

// Edge Function handler
Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    });
  }
  
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
    const { documentId } = await req.json();
    
    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'documentId is required' }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }
    
    // Process the document
    await processDocument(documentId);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Document processing completed successfully',
        documentId 
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
    console.error('Edge function error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Document processing failed',
        details: error.message 
      }),
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