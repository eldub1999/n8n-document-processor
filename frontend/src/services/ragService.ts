import { supabase } from './supabase';
import type {
  ProcessDocumentRequest,
  ProcessDocumentResponse,
  RAGQueryRequest,
  RAGQueryResponse,
  DocumentProcessingStatus,
  ChatConversation,
  ChatMessage,
  DocumentWithProcessingStatus,
  ProcessingProgress
} from '../types/rag';
import type { Document } from '../types/document';

/**
 * Document Processing Functions
 */

/**
 * Trigger document processing via Edge Function
 */
export async function processDocument(documentId: string): Promise<ProcessDocumentResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('document-processor', {
      body: { documentId } as ProcessDocumentRequest
    });

    if (error) {
      console.error('Document processing error:', error);
      throw new Error(`Processing failed: ${error.message}`);
    }

    return data as ProcessDocumentResponse;
  } catch (error) {
    console.error('Error calling document processor:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to process document: ${message}`);
  }
}

/**
 * Get processing status for a document
 */
export async function getDocumentProcessingStatus(documentId: string): Promise<DocumentProcessingStatus | null> {
  const { data, error } = await supabase
    .from('document_processing_status')
    .select('*')
    .eq('document_id', documentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No status found - document hasn't been processed yet
      return null;
    }
    throw new Error(`Failed to get processing status: ${error.message}`);
  }

  return data;
}

/**
 * Get processing status for multiple documents
 * Optimized to use a single JOIN query instead of N+1 queries
 */
export async function getDocumentsWithProcessingStatus(documentIds: string[]): Promise<DocumentWithProcessingStatus[]> {
  if (documentIds.length === 0) return [];

  // Single optimized query with LEFT JOIN to get documents and their processing status
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      document_processing_status (
        document_id,
        status,
        stage,
        progress_percentage,
        error_message,
        created_at,
        updated_at
      )
    `)
    .in('id', documentIds);

  if (error) {
    throw new Error(`Failed to get documents with processing status: ${error.message}`);
  }

  // Transform the joined result
  return data.map(doc => {
    // Get the processing status (there should be 0 or 1 records due to the relationship)
    const processingStatus = doc.document_processing_status && doc.document_processing_status.length > 0 
      ? doc.document_processing_status[0] 
      : null;

    // Remove the joined data and return clean document with processing status
    const { document_processing_status, ...cleanDoc } = doc;
    
    return {
      ...cleanDoc,
      processing_status: processingStatus,
      is_ready_for_chat: processingStatus?.status === 'completed'
    };
  });
}

/**
 * Subscribe to processing status updates for a document
 * Now with debouncing to reduce realtime query frequency
 */
export function subscribeToProcessingStatus(
  documentId: string,
  callback: (status: DocumentProcessingStatus | null) => void
) {
  let debounceTimeout: NodeJS.Timeout | null = null;
  
  const debouncedCallback = (status: DocumentProcessingStatus | null) => {
    // Clear existing timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    
    // For completed/failed states, call immediately
    if (status?.status === 'completed' || status?.status === 'failed' || status === null) {
      callback(status);
      return;
    }
    
    // For processing updates, debounce to reduce frequency
    debounceTimeout = setTimeout(() => {
      callback(status);
    }, 1000); // 1 second debounce for progress updates
  };
  
  const subscription = supabase
    .channel(`processing_status_${documentId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'document_processing_status',
        filter: `document_id=eq.${documentId}`
      },
      (payload) => {
        if (payload.eventType === 'DELETE') {
          debouncedCallback(null);
        } else {
          debouncedCallback(payload.new as DocumentProcessingStatus);
        }
      }
    )
    .subscribe();

  return () => {
    // Clean up debounce timeout
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    supabase.removeChannel(subscription);
  };
}

/**
 * Chat Functions
 */

/**
 * Send a RAG query with automatic fallback to text search on rate limits
 * Enhanced with exponential backoff retry logic
 */
export async function sendRAGQuery(request: RAGQueryRequest): Promise<RAGQueryResponse> {
  try {
    // First try to generate embedding with retry logic
    console.log('Attempting to generate embedding for query...');
    const embedding = await generateEmbeddingWithRetry(request.query);
    
    if (embedding) {
      // Try vector search first with the generated embedding
      console.log('Using vector search with generated embedding');
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          ...request,
          embedding: embedding // Pass the pre-generated embedding
        })
      });

      if (response.ok) {
        return await response.json();
      }
    }

    // Fallback to text search if embedding generation failed or vector search failed
    console.log('Falling back to text-based search...');
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/simple-rag-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        query: request.query,
        document_context: request.documentContext
      })
    });

    if (!response.ok) {
      throw new Error(`RAG query failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    // Transform the simple search result to match RAGQueryResponse format
    return {
      success: true,
      response: result.answer || result.response || 'I found some relevant information but couldn\'t generate a comprehensive answer.',
      sources: result.sources || [],
      conversationId: request.conversationId,
      details: 'Used text search fallback due to Voyage AI rate limits'
    };
  } catch (error) {
    console.error('RAG query error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
      conversationId: request.conversationId
    };
  }
}

/**
 * Get all conversations for the current user
 */
export async function getConversations(): Promise<ChatConversation[]> {
  const { data, error } = await supabase
    .from('chat_conversations')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get conversations: ${error.message}`);
  }

  return data;
}

/**
 * Get a specific conversation by ID
 */
export async function getConversation(conversationId: string): Promise<ChatConversation | null> {
  const { data, error } = await supabase
    .from('chat_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to get conversation: ${error.message}`);
  }

  return data;
}

/**
 * Get messages for a conversation
 */
export async function getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to get messages: ${error.message}`);
  }

  return data;
}

/**
 * Create a new conversation
 */
export async function createConversation(
  title: string,
  documentContext: string[] = []
): Promise<ChatConversation> {
  const { data, error } = await supabase
    .from('chat_conversations')
    .insert({
      title,
      document_context: documentContext
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create conversation: ${error.message}`);
  }

  return data;
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<ChatConversation> {
  const { data, error } = await supabase
    .from('chat_conversations')
    .update({ title })
    .eq('id', conversationId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update conversation: ${error.message}`);
  }

  return data;
}

/**
 * Delete a conversation and all its messages
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_conversations')
    .delete()
    .eq('id', conversationId);

  if (error) {
    throw new Error(`Failed to delete conversation: ${error.message}`);
  }
}

/**
 * Subscribe to new messages in a conversation
 */
export function subscribeToConversationMessages(
  conversationId: string,
  callback: (message: ChatMessage) => void
) {
  const subscription = supabase
    .channel(`messages_${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        callback(payload.new as ChatMessage);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}

/**
 * Utility Functions
 */

/**
 * Get processing status summary for all documents
 */
export async function getProcessingStatusSummary(): Promise<{
  status: string;
  count: number;
  avg_progress: number;
}[]> {
  const { data, error } = await supabase.rpc('get_processing_status_summary');

  if (error) {
    throw new Error(`Failed to get processing summary: ${error.message}`);
  }

  return data || [];
}

/**
 * Get documents ready for chat (completed processing)
 */
export async function getDocumentsReadyForChat(): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      document_processing_status!inner(status)
    `)
    .eq('document_processing_status.status', 'completed')
    .eq('is_latest', true);

  if (error) {
    throw new Error(`Failed to get chat-ready documents: ${error.message}`);
  }

  // Remove the nested processing status from the result
  return data.map(doc => {
    const { document_processing_status, ...cleanDoc } = doc;
    return cleanDoc as Document;
  });
}

/**
 * Check if a document is ready for chat
 */
export async function isDocumentReadyForChat(documentId: string): Promise<boolean> {
  const status = await getDocumentProcessingStatus(documentId);
  return status?.status === 'completed';
}

/**
 * Trigger processing for all unprocessed documents
 */
export async function processAllUnprocessedDocuments(): Promise<ProcessingProgress[]> {
  // Get all documents without processing status or with failed status
  const { data: documents, error } = await supabase
    .from('documents')
    .select(`
      id,
      filename,
      document_processing_status(status)
    `)
    .eq('is_latest', true);

  if (error) {
    throw new Error(`Failed to get documents: ${error.message}`);
  }

  const unprocessedDocs = documents.filter(doc => 
    !doc.document_processing_status || 
    doc.document_processing_status.length === 0 ||
    doc.document_processing_status[0]?.status === 'failed'
  );

  const results: ProcessingProgress[] = [];

  for (const doc of unprocessedDocs) {
    try {
      await processDocument(doc.id);
      results.push({
        documentId: doc.id,
        progress: 0,
        stage: 'text_extraction',
        status: 'pending'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      results.push({
        documentId: doc.id,
        progress: 0,
        stage: 'text_extraction',
        status: 'failed',
        error: message
      });
    }
  }

  return results;
}

/**
 * Enhanced embedding generation with exponential backoff for rate limits
 * Implements Voyage AI best practices for handling 429 errors
 */
async function generateEmbeddingWithRetry(text: string, maxRetries: number = 3): Promise<number[] | null> {
  let attempt = 0;
  let lastError: any = null;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ 
          query: text,
          generateEmbeddingOnly: true // Flag to only generate embedding, not search
        })
      });

      if (response.status === 429) {
        // Rate limit hit - implement exponential backoff
        const waitTime = Math.min(Math.pow(2, attempt) * 1000 + Math.random() * 1000, 60000);
        console.log(`Rate limit hit, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        attempt++;
        continue;
      }

      if (!response.ok) {
        throw new Error(`Embedding generation failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result.embedding || null;
    } catch (error: unknown) {
      lastError = error;
      
      // Check if it's a rate limit error via status code
      if (error instanceof Error && error.message.includes('429')) {
        const waitTime = Math.min(Math.pow(2, attempt) * 1000 + Math.random() * 1000, 60000);
        console.log(`Voyage AI rate limit hit, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        attempt++;
        continue;
      }
      
      // For non-rate-limit errors, break immediately
      console.error('Embedding generation error:', error);
      break;
    }
  }

  console.warn(`Failed to generate embedding after ${maxRetries} attempts. Using text search fallback.`);
  return null;
} 