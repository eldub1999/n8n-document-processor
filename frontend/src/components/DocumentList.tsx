import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDocuments, deleteDocument, getDocumentUrl } from '../services/documentService';
import { 
  getDocumentsWithProcessingStatus, 
  processDocument, 
  subscribeToProcessingStatus 
} from '../services/ragService';
import { toaster } from '../services/toast';
import type { Document, DocumentSearchParams } from '../types/document';
import type { DocumentWithProcessingStatus } from '../types/rag';

const DocumentList = () => {
  const [documents, setDocuments] = useState<DocumentWithProcessingStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingDocuments, setProcessingDocuments] = useState<Set<string>>(new Set());
  const [searchParams, setSearchParams] = useState<DocumentSearchParams>({
    sortBy: 'created_at',
    sortOrder: 'desc',
    limit: 20,
    offset: 0,
    filterText: '',
  });
  
  // Track active subscriptions to prevent leaks
  const subscriptionsRef = useRef<Map<string, () => void>>(new Map());
  
  const navigate = useNavigate();
  
  // Cleanup function for all subscriptions
  const cleanupSubscriptions = () => {
    subscriptionsRef.current.forEach((unsubscribe) => {
      unsubscribe();
    });
    subscriptionsRef.current.clear();
  };
  
  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanupSubscriptions();
    };
  }, []);
  
  useEffect(() => {
    loadDocuments();
  }, [searchParams]);
  
  const loadDocuments = async () => {
    try {
      setLoading(true);
      
      // Cleanup existing subscriptions before loading new ones
      cleanupSubscriptions();
      
      const docs = await getDocuments(searchParams);
      
      // Get processing status for all documents
      const docsWithStatus = await getDocumentsWithProcessingStatus(docs.map(d => d.id));
      setDocuments(docsWithStatus);
      setError(null);
      
      // Only subscribe to documents that are actively processing
      const processingDocs = docsWithStatus.filter(doc => 
        doc.processing_status?.status === 'processing'
      );
      
      // If no documents are processing, use polling as fallback for better performance
      if (processingDocs.length === 0) {
        console.log('No processing documents, skipping realtime subscriptions');
        return;
      }
      
      console.log(`Setting up realtime subscriptions for ${processingDocs.length} processing documents`);
      
      // Subscribe to status updates ONLY for processing documents
      processingDocs.forEach(doc => {
        const unsubscribe = subscribeToProcessingStatus(doc.id, (status) => {
          setDocuments(prev => prev.map(d => 
            d.id === doc.id 
              ? { ...d, processing_status: status || undefined, is_ready_for_chat: status?.status === 'completed' || false } as DocumentWithProcessingStatus
              : d
          ));
          
          // Auto-cleanup subscription when processing completes
          if (status?.status === 'completed' || status?.status === 'failed') {
            const unsubscribeFunc = subscriptionsRef.current.get(doc.id);
            if (unsubscribeFunc) {
              unsubscribeFunc();
              subscriptionsRef.current.delete(doc.id);
              console.log(`Cleaned up subscription for completed document: ${doc.id}`);
            }
          }
        });
        
        // Store unsubscribe function for cleanup
        subscriptionsRef.current.set(doc.id, unsubscribe);
      });
      
    } catch (err) {
      console.error('Error loading documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
      toaster.create({
        title: 'Error',
        description: 'Failed to load documents. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleDownload = async (doc: DocumentWithProcessingStatus) => {
    try {
      // Cast to Document type for getDocumentUrl
      const docForDownload: Document = {
        ...doc,
        description: doc.description || null,
        content_hash: doc.content_hash || null,
        jurisdiction: doc.jurisdiction || null,
        county: doc.county || null,
        document_type: doc.document_type || null
      };
      const url = await getDocumentUrl(docForDownload);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Error getting document URL:', err);
      toaster.create({
        title: 'Error',
        description: 'Failed to download document. Please try again.',
      });
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await deleteDocument(id);
      toaster.create({
        title: 'Success',
        description: 'Document deleted successfully',
      });
      loadDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
      toaster.create({
        title: 'Error',
        description: 'Failed to delete document. Please try again.',
      });
    }
  };
  
  const handleViewDetails = (id: string) => {
    navigate(`/documents/${id}`);
  };
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParams({
      ...searchParams,
      filterText: e.target.value,
      offset: 0, // Reset pagination when searching
    });
  };
  
  const handleSort = (sortBy: DocumentSearchParams['sortBy']) => {
    setSearchParams({
      ...searchParams,
      sortBy,
      sortOrder: 
        searchParams.sortBy === sortBy && searchParams.sortOrder === 'asc' 
          ? 'desc' 
          : 'asc',
      offset: 0, // Reset pagination when sorting
    });
  };
  
  const getSortIndicator = (column: DocumentSearchParams['sortBy']) => {
    if (searchParams.sortBy !== column) return null;
    return searchParams.sortOrder === 'asc' ? '↑' : '↓';
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const handleProcessDocument = async (documentId: string) => {
    try {
      setProcessingDocuments(prev => new Set(prev).add(documentId));
      await processDocument(documentId);
      
      toaster.create({
        title: 'Processing Started',
        description: 'Document processing has been initiated. Check status for progress.',
      });
      
      // Reload documents to get updated status
      setTimeout(() => loadDocuments(), 1000);
      
    } catch (error) {
      console.error('Error processing document:', error);
      toaster.create({
        title: 'Processing Failed',
        description: 'Failed to start document processing. Please try again.',
      });
    } finally {
      setProcessingDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  };

  const handleChatWithDocument = (documentId: string, filename: string) => {
    // Navigate to chat with this document pre-selected
    navigate(`/chat?doc=${documentId}&title=${encodeURIComponent(filename)}`);
  };
  
  if (loading && documents.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error && documents.length === 0) {
    return (
      <div className="rounded-md bg-red-50 p-4 my-4">
        <div className="flex">
          <div className="text-red-700">
            <p className="font-medium">Error loading documents</p>
            <p className="text-sm">{error}</p>
            <button 
              onClick={loadDocuments}
              className="mt-3 text-sm font-medium text-red-700 hover:text-red-600"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search documents..."
            className="pl-10 pr-4 py-2 w-full border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchParams.filterText}
            onChange={handleSearch}
          />
          <div className="absolute left-3 top-2.5 text-zinc-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <button
          onClick={() => navigate('/upload')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Upload New Document
        </button>
      </div>
      
      {documents.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-zinc-600 mb-4">No documents found.</p>
          <button
            onClick={() => navigate('/upload')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Upload Your First Document
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow-md">
            <thead>
              <tr className="bg-zinc-50 text-left text-zinc-500 border-b">
                <th className="px-6 py-3 font-medium text-sm cursor-pointer" onClick={() => handleSort('filename')}>
                  Filename {getSortIndicator('filename')}
                </th>
                <th className="px-6 py-3 font-medium text-sm">
                  Processing Status
                </th>
                <th className="px-6 py-3 font-medium text-sm cursor-pointer" onClick={() => handleSort('size_bytes')}>
                  Size {getSortIndicator('size_bytes')}
                </th>
                <th className="px-6 py-3 font-medium text-sm cursor-pointer" onClick={() => handleSort('created_at')}>
                  Date Added {getSortIndicator('created_at')}
                </th>
                <th className="px-6 py-3 font-medium text-sm cursor-pointer" onClick={() => handleSort('updated_at')}>
                  Last Modified {getSortIndicator('updated_at')}
                </th>
                <th className="px-6 py-3 font-medium text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-zinc-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="text-zinc-800 font-medium truncate max-w-[200px]">
                        {doc.filename}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {doc.processing_status ? (
                      <div className="space-y-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          doc.processing_status.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : doc.processing_status.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : doc.processing_status.status === 'processing'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {doc.processing_status.status.charAt(0).toUpperCase() + doc.processing_status.status.slice(1)}
                        </span>
                        {doc.processing_status.status === 'processing' && (
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div 
                              className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                              style={{ width: `${doc.processing_status.progress_percentage}%` }}
                            ></div>
                          </div>
                        )}
                        {doc.processing_status.status === 'completed' && (
                          <div className="text-xs text-green-600">
                            Ready for chat
                          </div>
                        )}
                        {doc.processing_status.status === 'failed' && doc.processing_status.error_message && (
                          <div className="text-xs text-red-600" title={doc.processing_status.error_message}>
                            Error: {doc.processing_status.error_message.substring(0, 30)}...
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Not processed
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-zinc-600">
                    {formatFileSize(doc.size_bytes)}
                  </td>
                  <td className="px-6 py-4 text-zinc-600">
                    {formatDate(doc.created_at)}
                  </td>
                  <td className="px-6 py-4 text-zinc-600">
                    {formatDate(doc.updated_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {/* Chat button - only show if processed */}
                      {doc.is_ready_for_chat && (
                        <button
                          onClick={() => handleChatWithDocument(doc.id, doc.filename)}
                          className="text-purple-600 hover:text-purple-800"
                          title="Chat with AI about this document"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </button>
                      )}
                      
                      {/* Process button - only show if not processed or failed */}
                      {(!doc.processing_status || doc.processing_status.status === 'failed') && (
                        <button
                          onClick={() => handleProcessDocument(doc.id)}
                          disabled={processingDocuments.has(doc.id)}
                          className="text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Process document for AI chat"
                        >
                          {processingDocuments.has(doc.id) ? (
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          )}
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleViewDetails(doc.id)}
                        className="text-blue-600 hover:text-blue-800"
                        title="View Details"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="text-green-600 hover:text-green-800"
                        title="Download"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DocumentList; 