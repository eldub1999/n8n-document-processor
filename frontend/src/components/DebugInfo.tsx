import { useState, useEffect } from 'react';
import { getDocuments } from '../services/documentService';
import { getDocumentsWithProcessingStatus, getDocumentsReadyForChat } from '../services/ragService';
import { useAuth } from '../hooks/useAuth';
import DocumentProcessingTrigger from './DocumentProcessingTrigger';
import type { Document } from '../types/document';
import type { DocumentWithProcessingStatus } from '../types/rag';

const DebugInfo = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentsWithStatus, setDocumentsWithStatus] = useState<DocumentWithProcessingStatus[]>([]);
  const [chatReadyDocs, setChatReadyDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDebugInfo = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);

    try {
      console.log('Loading debug info...');
      
      // Load basic documents
      const docs = await getDocuments({ sortBy: 'created_at', sortOrder: 'desc', limit: 10, offset: 0 });
      console.log('Basic documents:', docs);
      setDocuments(docs);

      // Load documents with processing status
      if (docs.length > 0) {
        const docsWithStatus = await getDocumentsWithProcessingStatus(docs.map(d => d.id));
        console.log('Documents with processing status:', docsWithStatus);
        setDocumentsWithStatus(docsWithStatus);
      }

      // Load chat-ready documents
      const chatDocs = await getDocumentsReadyForChat();
      console.log('Chat-ready documents:', chatDocs);
      setChatReadyDocs(chatDocs);

    } catch (err) {
      console.error('Debug info error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load debug info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadDebugInfo();
    }
  }, [user]);

  // Find documents that need processing (have no processing status)
  const documentsNeedingProcessing = documents.filter(doc => {
    const hasStatus = documentsWithStatus.find(dws => dws.id === doc.id);
    return !hasStatus || !hasStatus.processing_status;
  });

  if (!user) {
    return (
      <div className="p-4 bg-gray-100 border border-gray-300 rounded-md">
        <h3 className="font-medium text-gray-900">Debug Info</h3>
        <p className="text-gray-600 text-sm">Not authenticated - cannot load document info</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-100 border border-gray-300 rounded-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">Debug Info</h3>
          <button
            onClick={loadDebugInfo}
            disabled={loading}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            Error: {error}
          </div>
        )}

        <div className="space-y-4 text-sm">
          <div>
            <strong>User ID:</strong> {user.id}
          </div>

          <div>
            <strong>Basic Documents ({documents.length}):</strong>
            {documents.length === 0 ? (
              <p className="text-gray-600 ml-2">No documents found</p>
            ) : (
              <ul className="ml-4 mt-1 space-y-1">
                {documents.map(doc => (
                  <li key={doc.id} className="text-xs">
                    📄 {doc.filename} (ID: {doc.id.substring(0, 8)}...)
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <strong>Documents with Processing Status ({documentsWithStatus.length}):</strong>
            {documentsWithStatus.length === 0 ? (
              <p className="text-gray-600 ml-2">No documents with status found</p>
            ) : (
              <ul className="ml-4 mt-1 space-y-1">
                {documentsWithStatus.map(doc => (
                  <li key={doc.id} className="text-xs">
                    📄 {doc.filename} - Status: {doc.processing_status?.status || 'No status'} 
                    {doc.processing_status?.progress_percentage && ` (${doc.processing_status.progress_percentage}%)`}
                    {doc.is_ready_for_chat && ' ✅ Ready for chat'}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <strong>Chat-Ready Documents ({chatReadyDocs.length}):</strong>
            {chatReadyDocs.length === 0 ? (
              <p className="text-red-600 ml-2">No documents ready for chat</p>
            ) : (
              <ul className="ml-4 mt-1 space-y-1">
                {chatReadyDocs.map(doc => (
                  <li key={doc.id} className="text-xs text-green-700">
                    ✅ {doc.filename} (ID: {doc.id.substring(0, 8)}...)
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="pt-2 border-t border-gray-300">
            <p className="text-xs text-gray-600">
              <strong>Issue Analysis:</strong><br/>
              • Chat disabled: {chatReadyDocs.length === 0 ? '❌ No documents ready for chat' : '✅ Documents available'}<br/>
              • Upload processing: {documentsWithStatus.some(d => d.processing_status?.status === 'processing') ? '⏳ Documents processing' : 'No documents currently processing'}<br/>
              • Failed processing: {documentsWithStatus.some(d => d.processing_status?.status === 'failed') ? '❌ Some documents failed' : 'No failed documents'}
            </p>
          </div>
        </div>
      </div>

      {/* Processing Trigger Component */}
      {documentsNeedingProcessing.length > 0 && (
        <DocumentProcessingTrigger 
          documents={documentsNeedingProcessing.map(doc => ({
            id: doc.id,
            filename: doc.filename
          }))}
          onProcessingStarted={loadDebugInfo}
        />
      )}
    </div>
  );
};

export default DebugInfo; 