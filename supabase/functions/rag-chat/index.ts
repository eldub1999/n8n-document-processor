// UPDATED: Using latest Claude Sonnet 4 for enhanced legal RAG capabilities
// - Hybrid reasoning: Fast responses + extended thinking for complex legal queries
// - Superior coding and reasoning performance for legal document analysis  
// - Enhanced instruction following for precise legal research
// - Better context handling for complex legal terminology
// - STANDARDIZED: Using voyage-3-large for both document and query embeddings
// - FIXED: Corrected API key name from voyage_api_key to voyage_ai_api_key

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface RAGQueryRequest {
  query: string;
  conversationId?: string;
  jurisdictions?: string[];
  documentTypes?: string[];
  maxResults?: number;
}

interface RAGQueryResponse {
  success: boolean;
  response?: string;
  sources?: any[];
  conversationId?: string;
  error?: string;
  details?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get API key from Supabase vault
async function getApiKey(keyName: string): Promise<string> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data, error } = await supabase.rpc('get_api_key', { key_name: keyName });
  if (error) {
    throw new Error(`Failed to retrieve API key: ${error.message}`);
  }
  return data;
}

// Enhanced semantic search with metadata filtering
async function semanticSearch(
  query: string, 
  supabase: any, 
  jurisdictions?: string[],
  documentTypes?: string[],
  maxResults: number = 10
) {
  try {
    console.log('🔍 Performing semantic search with filters:', { jurisdictions, documentTypes });
    
    // Generate embedding for the query using Voyage AI (FIXED: corrected API key name)
    const voyageApiKey = await getApiKey('voyage_ai_api_key');
    
    const embeddingResponse = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${voyageApiKey}`,
      },
      body: JSON.stringify({
        input: [query],
        model: 'voyage-3-large'
      })
    });
    
    if (!embeddingResponse.ok) {
      throw new Error(`Voyage AI embedding failed: ${embeddingResponse.status}`);
    }
    
    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;
    
    // Perform vector similarity search with metadata filters
    // TODO: Ensure the 'search_similar_embeddings' RPC can handle these new filters
    // or create/update a new RPC/database function.
    const { data: searchResults, error } = await supabase.rpc('search_similar_embeddings', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5, 
      match_count: maxResults,
      filter_jurisdictions: jurisdictions,
      filter_document_types: documentTypes,
      include_national: true
    });
    
    if (error) {
      console.error('Vector search error:', error);
      throw new Error(`Vector search failed: ${error.message}`);
    }
    
    // Transform the results to match expected format
    const transformedResults = searchResults?.map(result => ({
      document_id: result.document_id,
      chunk_text: result.content,
      chunk_index: result.chunk_index,
      documents: {
        id: result.document_id,
        filename: result.filename,
        jurisdiction: null, // Not available in current function
        county: null, // Not available in current function
        document_type: null // Not available in current function
      },
      similarity: result.similarity
    })) || [];
    
    console.log(`✅ Found ${transformedResults.length} relevant chunks`);
    return transformedResults;
    
  } catch (error) {
    console.error('Semantic search failed:', error);
    // Fallback to text search
    return await textSearch(query, supabase, jurisdictions, documentTypes, maxResults);
  }
}

// Fallback text search with metadata filtering
async function textSearch(
  query: string,
  supabase: any,
  jurisdictions?: string[],
  documentTypes?: string[],
  maxResults: number = 10
) {
  console.log('📝 Falling back to text search with filters:', { jurisdictions, documentTypes });
  
  let queryBuilder = supabase
    .from('document_embeddings')
    .select(`
      chunk_text,
      chunk_index,
      documents!inner(
        id,
        filename,
        jurisdiction,
        county,
        document_type
      )
    `)
    .textSearch('chunk_text', query)
    .limit(maxResults);
  
  if (documentTypes && documentTypes.length > 0) {
    queryBuilder = queryBuilder.in('documents.document_type', documentTypes);
  }

  if (jurisdictions && jurisdictions.length > 0) {
    // Filter for selected states OR 'national'
    queryBuilder = queryBuilder.or(`jurisdiction.in.(${jurisdictions.map(j => `"${j}"`).join(',')}),jurisdiction.eq.national`, { referencedTable: 'documents' });
  } else {
    // If no specific jurisdictions, only include 'national'
    queryBuilder = queryBuilder.eq('documents.jurisdiction', 'national');
  }
  
  const { data, error } = await queryBuilder;
  
  if (error) {
    console.error('Text search error:', error);
    return [];
  }
  
  console.log(`✅ Text search found ${data?.length || 0} relevant chunks`);
  return data || [];
}

// Get Google Cloud access token and project ID using service account
async function getGoogleCloudCredentials(): Promise<{accessToken: string, projectId: string}> {
  try {
    const serviceAccountJson = await getApiKey('google_service_account_json');
    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id; // Extract project_id

    if (!projectId) {
      throw new Error('Project ID not found in service account JSON.');
    }

    // Create JWT for Google Cloud authentication
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: serviceAccount.private_key_id
    };
    
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600
    };
    
    // Use Web Crypto API to sign JWT
    const encoder = new TextEncoder();
    const keyData = serviceAccount.private_key
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\s/g, '');
    
    const binaryKey = atob(keyData);
    const keyArray = new Uint8Array(binaryKey.length);
    for (let i = 0; i < binaryKey.length; i++) {
      keyArray[i] = binaryKey.charCodeAt(i);
    }
    
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      keyArray,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const headerB64 = btoa(JSON.stringify(header)).replace(/[+/=]/g, (m) => ({'+': '-', '/': '_', '=': ''}[m] || m));
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/[+/=]/g, (m) => ({'+': '-', '/': '_', '=': ''}[m] || m));
    const signatureInput = `${headerB64}.${payloadB64}`;
    
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      encoder.encode(signatureInput)
    );
    
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/[+/=]/g, (m) => ({'+': '-', '/': '_', '=': ''}[m] || m));
    
    const jwt = `${signatureInput}.${signatureB64}`;
    
    // Exchange JWT for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });
    
    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }
    
    const tokenData = await tokenResponse.json();
    return { accessToken: tokenData.access_token, projectId }; // Return projectId

  } catch (error) {
    console.error('Failed to get Google Cloud credentials:', error);
    throw new Error(`Authentication or project ID retrieval failed: ${error.message}`);
  }
}

// TEMPORARY: Using Gemini 1.5 Flash for testing LLM response generation via Vertex AI
async function generateLLMResponse_GeminiTest(query: string, context: any[]): Promise<string> {
  console.log('🤖 Generating Gemini 1.5 Flash response...');
  
  if (!context || context.length === 0) {
    return "I apologize, but I couldn't find any relevant information in the available legal documents to answer your question. Please try rephrasing your query or check if documents for your jurisdiction are available.";
  }
  
  const formattedContext = context.map((chunk, index) => {
    const doc = chunk.documents || chunk.document;
    return `[Document ${index + 1}: ${doc?.filename || 'Unknown'} - ${doc?.jurisdiction || 'Unknown'} ${doc?.county ? `County: ${doc.county}` : ''}]\n${chunk.chunk_text}`;
  }).join('\n\n---\n\n');
  
  // Simplified combined prompt for Gemini
  const combinedPrompt = `You are an expert legal research assistant. Based on the following legal documents, please answer this question: "${query}"

**Available Context:**
${formattedContext}

Please provide a comprehensive response based on the available information, citing specific sources where appropriate. Focus on accuracy and clarity.`;

  try {
    const { accessToken, projectId } = await getGoogleCloudCredentials();

    const geminiApiUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-1.5-flash-latest:generateContent`;
    
    const requestBody = {
      contents: [
        {
          role: "user", 
          parts: [
            { text: combinedPrompt }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2, // Adjust as needed
        maxOutputTokens: 4096 // Adjust as needed
      },
      // Basic safety settings - adjust as per requirements
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ]
    };

    const response = await fetch(geminiApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API failed: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    // Extract text from Gemini response
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                  "I apologize, but I couldn't generate a response from Gemini at this time.";
    
    const content = "GEMINI_RESPONSE_PREFIX_TEST: " + rawContent;

    console.log('✅ Gemini response generated successfully with prefix.');
    return content;
    
  } catch (error) {
    console.error('Gemini response generation failed:', error);
    return `I apologize, but I'm experiencing technical difficulties generating a response. Please try again in a moment. Error: ${error.message}`;
  }
}

// Store conversation and messages
async function storeConversation(
  supabase: any,
  query: string,
  response: string,
  sources: any[],
  conversationId?: string
) {
  try {
    let conversation;
    
    if (conversationId) {
      // Get existing conversation
      const { data } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();
      conversation = data;
    }
    
    if (!conversation) {
      // Create new conversation
      const { data, error } = await supabase
        .from('chat_conversations')
        .insert({
          title: query.substring(0, 50) + (query.length > 50 ? '...' : ''),
          document_context: sources.map(s => s.document_id || s.documents?.id).filter(Boolean),
          conversation_metadata: {
            created_from: 'rag_chat',
            source_count: sources.length
          }
        })
        .select()
        .single();
        
      if (error) throw error;
      conversation = data;
    }
    
    // Store user message
    await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversation.id,
        role: 'user',
        content: query,
        message_metadata: {},
        document_sources: sources.map(s => s.document_id || s.documents?.id).filter(Boolean),
        embedding_sources: []
      });
    
    // Store assistant message
    await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversation.id,
        role: 'assistant',
        content: response,
        message_metadata: {
          model: 'gemini-1.5-flash-latest',
          source_count: sources.length
        },
        document_sources: sources.map(s => s.document_id || s.documents?.id).filter(Boolean),
        embedding_sources: []
      });
    
    return conversation.id;
    
  } catch (error) {
    console.error('Failed to store conversation:', error);
    return conversationId;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { query, conversationId, jurisdictions, documentTypes, maxResults }: RAGQueryRequest = await req.json();

    if (!query?.trim()) {
      throw new Error('Query is required');
    }

    console.log('🚀 Processing RAG query:', query);
    console.log('📍 Filters:', { jurisdictions, documentTypes });

    // Perform semantic search with metadata filtering
    const searchResults = await semanticSearch(
      query,
      supabase,
      jurisdictions,
      documentTypes,
      maxResults || 10
    );

    // Generate response using LLM (now Gemini for testing)
    const llmResponse = await generateLLMResponse_GeminiTest(query, searchResults);

    // Store conversation
    const finalConversationId = await storeConversation(
      supabase,
      query,
      llmResponse,
      searchResults,
      conversationId
    );

    const result: RAGQueryResponse = {
      success: true,
      response: llmResponse,
      sources: searchResults.map(chunk => ({
        document_id: chunk.document_id || chunk.documents?.id,
        filename: chunk.documents?.filename || chunk.document?.filename,
        jurisdiction: chunk.documents?.jurisdiction || chunk.document?.jurisdiction,
        county: chunk.documents?.county || chunk.document?.county,
        document_type: chunk.documents?.document_type || chunk.document?.document_type,
        chunk_text: chunk.chunk_text.substring(0, 200) + '...',
        chunk_index: chunk.chunk_index
      })),
      conversationId: finalConversationId,
      details: `Processed with Gemini 1.5 Flash. Found ${searchResults.length} relevant sources.`
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('RAG query error:', error);
    
    const errorResponse: RAGQueryResponse = {
      success: false,
      error: error.message,
      details: 'Failed to process RAG query'
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}); 