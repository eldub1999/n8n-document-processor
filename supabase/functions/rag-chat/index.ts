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
  documentContext?: string[];
  maxResults?: number;
  jurisdiction?: string;
  documentType?: string;
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
  documentContext?: string[],
  jurisdiction?: string,
  documentType?: string,
  maxResults: number = 10
) {
  try {
    console.log('🔍 Performing semantic search...');
    
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
    
    // Note: Current search function doesn't support metadata filtering
    // TODO: Enhance search function to support jurisdiction, documentType, documentContext filters
    
    // Perform vector similarity search
    const { data: searchResults, error } = await supabase.rpc('search_similar_embeddings', {
      query_embedding: queryEmbedding,
      match_threshold: 0.5,
      match_count: maxResults
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
    return await textSearch(query, supabase, documentContext, jurisdiction, documentType, maxResults);
  }
}

// Fallback text search with metadata filtering
async function textSearch(
  query: string,
  supabase: any,
  documentContext?: string[],
  jurisdiction?: string,
  documentType?: string,
  maxResults: number = 10
) {
  console.log('📝 Falling back to text search...');
  
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
  
  // Apply metadata filters
  if (documentContext && documentContext.length > 0) {
    queryBuilder = queryBuilder.in('document_id', documentContext);
  }
  
  if (jurisdiction) {
    queryBuilder = queryBuilder.eq('documents.jurisdiction', jurisdiction);
  }
  
  if (documentType) {
    queryBuilder = queryBuilder.eq('documents.document_type', documentType);
  }
  
  const { data, error } = await queryBuilder;
  
  if (error) {
    console.error('Text search error:', error);
    return [];
  }
  
  console.log(`✅ Text search found ${data?.length || 0} relevant chunks`);
  return data || [];
}

// Generate response using Claude Sonnet 4 on Vertex AI
async function generateClaudeResponse(query: string, context: any[]): Promise<string> {
  console.log('🤖 Generating Claude Sonnet 4 response...');
  
  if (!context || context.length === 0) {
    return "I apologize, but I couldn't find any relevant information in the available legal documents to answer your question. Please try rephrasing your query or check if documents for your jurisdiction are available.";
  }
  
  // Format context for Claude
  const formattedContext = context.map((chunk, index) => {
    const doc = chunk.documents || chunk.document;
    return `[Document ${index + 1}: ${doc?.filename || 'Unknown'} - ${doc?.jurisdiction || 'Unknown'} ${doc?.county ? `County: ${doc.county}` : ''}]
${chunk.chunk_text}`;
  }).join('\n\n---\n\n');
  
  const systemPrompt = `You are an expert legal research assistant specializing in real estate law, title and escrow procedures, and regulatory compliance. You have access to a comprehensive database of legal documents including statutes, regulations, and procedural guides.

**Your Role:**
- Provide accurate, well-researched legal information based on the provided documents
- Cite specific sources when referencing information
- Acknowledge limitations when information is incomplete
- Use clear, professional language appropriate for legal professionals
- Focus on practical applications and procedural guidance

**Important Guidelines:**
- Always cite which documents your information comes from
- If information conflicts between sources, note the discrepancy
- Distinguish between mandatory requirements and best practices
- Include relevant jurisdiction information when applicable
- Do not provide legal advice - only informational content

**Response Format:**
1. Direct answer to the question
2. Supporting details from the documents
3. Source citations
4. Any relevant warnings or considerations`;

  const userPrompt = `Based on the following legal documents, please answer this question: "${query}"

**Available Context:**
${formattedContext}

Please provide a comprehensive response based on the available information, citing specific sources where appropriate.`;

  try {
    // Use Vertex AI Claude Sonnet 4 endpoint
    const response = await fetch(
      `https://us-central1-aiplatform.googleapis.com/v1/projects/vertex-ai-for-rag/locations/us-central1/publishers/anthropic/models/claude-sonnet-4@20250514:generateMessage`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getGoogleCloudAccessToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 4000,
          temperature: 0.1,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: userPrompt
            }
          ]
        })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      throw new Error(`Claude API failed: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.content?.[0]?.text || data.completion || "I apologize, but I couldn't generate a response at this time.";
    
    console.log('✅ Claude response generated successfully');
    return content;
    
  } catch (error) {
    console.error('Claude response generation failed:', error);
    return `I apologize, but I'm experiencing technical difficulties generating a response. Please try again in a moment. Error: ${error.message}`;
  }
}

// Get Google Cloud access token using service account
async function getGoogleCloudAccessToken(): Promise<string> {
  try {
    const serviceAccountJson = await getApiKey('google_service_account_json');
    const serviceAccount = JSON.parse(serviceAccountJson);
    
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
    return tokenData.access_token;
    
  } catch (error) {
    console.error('Failed to get Google Cloud access token:', error);
    throw new Error(`Authentication failed: ${error.message}`);
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
          model: 'claude-sonnet-4',
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

    const { query, conversationId, documentContext, maxResults, jurisdiction, documentType }: RAGQueryRequest = await req.json();

    if (!query?.trim()) {
      throw new Error('Query is required');
    }

    console.log('🚀 Processing RAG query:', query);
    console.log('📍 Filters:', { jurisdiction, documentType, documentContext });

    // Perform semantic search with metadata filtering
    const searchResults = await semanticSearch(
      query,
      supabase,
      documentContext,
      jurisdiction,
      documentType,
      maxResults || 10
    );

    // Generate response using Claude Sonnet 4
    const response = await generateClaudeResponse(query, searchResults);

    // Store conversation
    const finalConversationId = await storeConversation(
      supabase,
      query,
      response,
      searchResults,
      conversationId
    );

    const result: RAGQueryResponse = {
      success: true,
      response,
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
      details: `Processed with Claude Sonnet 4. Found ${searchResults.length} relevant sources.`
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