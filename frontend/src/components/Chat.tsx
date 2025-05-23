import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  sendRAGQuery, 
  getConversations, 
  getConversationMessages, 
  createConversation,
  deleteConversation,
  getDocumentsReadyForChat,
  subscribeToConversationMessages
} from '../services/ragService';
import type { 
  ChatConversation, 
  ChatMessage, 
  DocumentSource, 
  RAGQueryRequest 
} from '../types/rag';
import type { Document } from '../types/document';
import { toaster } from '../services/toast';

const Chat = () => {
  const [searchParams] = useSearchParams();
  
  // State management
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Memoized functions for performance
  const loadConversations = useCallback(async () => {
    try {
      const convs = await getConversations();
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, []);

  const loadAvailableDocuments = useCallback(async () => {
    try {
      const docs = await getDocumentsReadyForChat();
      setAvailableDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  }, []);

  const loadConversationMessages = useCallback(async (conversationId: string) => {
    try {
      const msgs = await getConversationMessages(conversationId);
      setMessages(msgs);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setError('Failed to load conversation messages');
    }
  }, []);

  // Load initial data
  useEffect(() => {
    loadConversations();
    loadAvailableDocuments();
  }, [loadConversations, loadAvailableDocuments]);

  // Handle URL parameters for document pre-selection
  useEffect(() => {
    const docId = searchParams.get('doc');
    if (docId && availableDocuments.length > 0) {
      const doc = availableDocuments.find(d => d.id === docId);
      if (doc) {
        setSelectedDocuments([docId]);
        // Optionally set a default query based on document title
        const title = searchParams.get('title');
        if (title) {
          setQuery(`Tell me about ${decodeURIComponent(title)}`);
        }
      }
    }
  }, [searchParams, availableDocuments]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Subscribe to real-time message updates
  useEffect(() => {
    if (!currentConversation) return;

    const unsubscribe = subscribeToConversationMessages(
      currentConversation.id,
      (newMessage) => {
        setMessages(prev => [...prev, newMessage]);
      }
    );

    return unsubscribe;
  }, [currentConversation]);

  const handleNewConversation = useCallback(async () => {
    try {
      const title = 'New Conversation';
      const newConv = await createConversation(title, selectedDocuments);
      setConversations(prev => [newConv, ...prev]);
      setCurrentConversation(newConv);
      setMessages([]);
      setError(null);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      setError('Failed to create new conversation');
    }
  }, [selectedDocuments]);

  const handleSelectConversation = useCallback(async (conversation: ChatConversation) => {
    setCurrentConversation(conversation);
    setSelectedDocuments(conversation.document_context);
    await loadConversationMessages(conversation.id);
    setError(null);
  }, [loadConversationMessages]);

  const handleDeleteConversation = useCallback(async (conversationId: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return;
    
    try {
      await deleteConversation(conversationId);
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
      
      toaster.create({
        title: 'Success',
        description: 'Conversation deleted successfully',
      });
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      toaster.create({
        title: 'Error',
        description: 'Failed to delete conversation',
      });
    }
  }, [currentConversation]);

  const handleDocumentSelection = useCallback((documentId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!query.trim() || isLoading) return;
    
    const userMessage = query.trim();
    setQuery('');
    setIsLoading(true);
    setError(null);
    
    try {
      // Create conversation if none exists
      let conversation = currentConversation;
      if (!conversation) {
        conversation = await createConversation('New Conversation', selectedDocuments);
        setCurrentConversation(conversation);
        setConversations(prev => [conversation!, ...prev]);
      }
      
      // Add user message to state immediately for better UX
      const tempUserMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: conversation.id,
        role: 'user',
        content: userMessage,
        created_at: new Date().toISOString(),
        message_metadata: {},
        document_sources: selectedDocuments,
        embedding_sources: [],
        processing_time_ms: undefined,
        token_count: undefined
      };
      
      setMessages(prev => [...prev, tempUserMessage]);
      
      // Send query to RAG system
      const request: RAGQueryRequest = {
        query: userMessage,
        conversationId: conversation.id,
        documentContext: selectedDocuments,
        maxResults: 10
      };
      
      const response = await sendRAGQuery(request);
      
      if (response.success) {
        // The assistant message should be added via real-time subscription
        // But we'll also refetch to ensure consistency
        setTimeout(() => loadConversationMessages(conversation!.id), 500);
      } else {
        throw new Error('Query failed');
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
      toaster.create({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [query, isLoading, currentConversation, selectedDocuments, loadConversationMessages]);

  // Memoized computed values for performance
  const selectedDocumentNames = useMemo(() => {
    return availableDocuments
      .filter(doc => selectedDocuments.includes(doc.id))
      .map(doc => doc.filename);
  }, [availableDocuments, selectedDocuments]);

  const hasSelectedDocuments = useMemo(() => {
    return selectedDocuments.length > 0;
  }, [selectedDocuments.length]);

  const canSendMessage = useMemo(() => {
    return query.trim().length > 0 && !isLoading;
  }, [query, isLoading]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderMessageSources = (message: ChatMessage) => {
    if (message.role !== 'assistant' || !message.document_sources?.length) {
      return null;
    }

    const sourceDocuments = availableDocuments.filter(doc => 
      message.document_sources.includes(doc.id)
    );

    if (sourceDocuments.length === 0) return null;

    return (
      <div className="mt-3 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
        <div className="text-xs font-medium text-gray-600 mb-2">
          Sources ({sourceDocuments.length} documents):
        </div>
        <div className="space-y-1">
          {sourceDocuments.map(doc => (
            <div key={doc.id} className="text-xs text-gray-700">
              📄 {doc.filename}
              {doc.jurisdiction && (
                <span className="ml-2 text-gray-500">
                  ({doc.jurisdiction}{doc.county && doc.county !== 'all' ? `, ${doc.county}` : ''})
                </span>
              )}
            </div>
          ))}
        </div>
        {message.processing_time_ms && (
          <div className="text-xs text-gray-500 mt-2">
            Response time: {message.processing_time_ms}ms
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${showSidebar ? 'w-80' : 'w-0'} overflow-hidden transition-all duration-300 bg-white border-r border-gray-200 flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">AI Chat</h2>
            <button
              onClick={() => setShowSidebar(false)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <button
            onClick={handleNewConversation}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            + New Conversation
          </button>
        </div>

        {/* Document Selection */}
        <div className="p-4 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document Context
          </label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedDocuments.length === 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedDocuments([]);
                  }
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-600">All documents</span>
            </label>
            {availableDocuments.map(doc => (
              <label key={doc.id} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedDocuments.includes(doc.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedDocuments(prev => [...prev, doc.id]);
                    } else {
                      setSelectedDocuments(prev => prev.filter(id => id !== doc.id));
                    }
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 truncate">{doc.filename}</span>
              </label>
            ))}
          </div>
          {availableDocuments.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">
              No documents ready for chat. Please upload and process documents first.
            </p>
          )}
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Conversations</h3>
            <div className="space-y-2">
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  className={`p-3 rounded-lg cursor-pointer group ${
                    currentConversation?.id === conv.id 
                      ? 'bg-blue-50 border-blue-200 border' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleSelectConversation(conv)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {conv.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(conv.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(conv.id);
                      }}
                      className="ml-2 p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {!showSidebar && (
                <button
                  onClick={() => setShowSidebar(true)}
                  className="mr-3 p-1 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
              <h1 className="text-xl font-semibold text-gray-900">
                {currentConversation ? currentConversation.title : 'Document Q&A'}
              </h1>
            </div>
            {selectedDocuments.length > 0 && (
              <div className="text-sm text-gray-600">
                Context: {selectedDocuments.length} document(s)
              </div>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!currentConversation && messages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h3>
              <p className="text-gray-600 mb-4">Ask questions about your documents using AI-powered search.</p>
              <p className="text-sm text-gray-500">
                Select documents from the sidebar or leave unselected to search all documents.
              </p>
            </div>
          )}

          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-900'
              }`}>
                <div className="whitespace-pre-wrap">{message.content}</div>
                <div className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {formatMessageTime(message.created_at)}
                </div>
                {renderMessageSources(message)}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-gray-600">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex space-x-3">
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question about your documents..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
                disabled={isLoading || availableDocuments.length === 0}
              />
              {availableDocuments.length === 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  No documents available for chat. Please upload and process documents first.
                </p>
              )}
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!query.trim() || isLoading || availableDocuments.length === 0}
              className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Send'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat; 