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
 */
export async function getDocumentsWithProcessingStatus(documentIds: string[]): Promise<DocumentWithProcessingStatus[]> {
  if (documentIds.length === 0) return [];

  // Get documents
  const { data: documents, error: docError } = await supabase
    .from('documents')
    .select('*')
    .in('id', documentIds);

  if (docError) {
    throw new Error(`Failed to get documents: ${docError.message}`);
  }

  // Get processing statuses
  const { data: statuses, error: statusError } = await supabase
    .from('document_processing_status')
    .select('*')
    .in('document_id', documentIds);

  if (statusError) {
    console.warn('Failed to get processing statuses:', statusError);
  }

  // Combine documents with their processing status
  const statusMap = new Map<string, DocumentProcessingStatus>();
  statuses?.forEach(status => {
    statusMap.set(status.document_id, status);
  });

  return documents.map(doc => {
    const status = statusMap.get(doc.id);
    return {
      ...doc,
      processing_status: status,
      is_ready_for_chat: status?.status === 'completed'
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
 * Send a query to the RAG system
 */
export async function sendRAGQuery(request: RAGQueryRequest): Promise<RAGQueryResponse> {
  try {
    // Temporarily use the simple test function that works
    const { data, error } = await supabase.functions.invoke('simple-rag-test', {
      body: { query: request.query }
    });

    if (error) {
      console.error('RAG query error:', error);
      throw new Error(`Query failed: ${error.message}`);
    }

    // Transform the simple test response to match our expected format
    const testResponse = data;
    if (testResponse.success) {
      return {
        success: true,
        response: `Based on the documents, here's what I found about "${request.query}":\n\n` +
                 testResponse.results.map((result: any, index: number) => 
                   `${index + 1}. From ${result.document_title}: ${result.chunk_text}`
                 ).join('\n\n') +
                 `\n\nFound ${testResponse.results_count} relevant sections.`,
        sources: testResponse.results.map((result: any) => ({
          document_id: 'test-id',
          document_title: result.document_title,
          chunk_text: result.chunk_text,
          similarity: result.similarity
        })),
        conversationId: request.conversationId || 'temp-conversation'
      };
    } else {
      throw new Error('Search failed');
    }
  } catch (error) {
    console.error('Error calling RAG query:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to process query: ${message}`);
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