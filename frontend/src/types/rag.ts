// RAG System Types

// Document Processing Status
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
export type ProcessingStage = 'text_extraction' | 'chunking' | 'embedding_generation' | 'storage';

export interface DocumentProcessingStatus {
  id: string;
  document_id: string;
  status: ProcessingStatus;
  stage?: ProcessingStage;
  progress_percentage: number;
  total_chunks: number;
  processed_chunks: number;
  error_message?: string;
  processing_metadata: Record<string, any>;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

// Chat System Types
export interface ChatConversation {
  id: string;
  user_id?: string;
  title: string;
  document_context: string[];
  conversation_metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  message_metadata: Record<string, any>;
  document_sources: string[];
  embedding_sources: string[];
  processing_time_ms?: number;
  token_count?: number;
  created_at: string;
}

// Source Information
export interface DocumentSource {
  embedding_id: string;
  document_id: string;
  chunk_text: string;
  chunk_index: number;
  similarity: number;
  document_title: string;
  document_metadata: Record<string, any>;
}

// Edge Function Request/Response Types
export interface ProcessDocumentRequest {
  documentId: string;
}

export interface ProcessDocumentResponse {
  success: boolean;
  message?: string;
  documentId?: string;
  error?: string;
  details?: string;
}

export interface RAGQueryRequest {
  query: string;
  conversationId?: string;
  documentContext?: string[];
  maxResults?: number;
}

export interface RAGQueryResponse {
  success: boolean;
  response?: string;
  sources?: DocumentSource[];
  conversationId?: string;
  error?: string;
  details?: string;
}

// Frontend State Types
export interface ProcessingState {
  isProcessing: boolean;
  documentStatuses: Map<string, DocumentProcessingStatus>;
  error?: string;
}

export interface ChatState {
  conversations: ChatConversation[];
  currentConversation?: ChatConversation;
  messages: ChatMessage[];
  isLoading: boolean;
  error?: string;
}

// Utility Types
export interface ProcessingProgress {
  documentId: string;
  progress: number;
  stage: ProcessingStage;
  status: ProcessingStatus;
  error?: string;
}

export interface DocumentWithProcessingStatus {
  id: string;
  filename: string;
  storage_path: string;
  content_type: string;
  size_bytes: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  description?: string;
  content_hash?: string;
  version: number;
  is_latest: boolean;
  jurisdiction?: string;
  county?: string;
  document_type?: string;
  // Processing status
  processing_status?: DocumentProcessingStatus;
  is_ready_for_chat: boolean;
} 