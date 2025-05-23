import { useState } from 'react';
import { supabase } from '../services/supabase';

interface Document {
  id: string;
  filename: string;
}

interface DocumentProcessingTriggerProps {
  documents: Document[];
  onProcessingStarted?: () => void;
}

const DocumentProcessingTrigger: React.FC<DocumentProcessingTriggerProps> = ({ 
  documents, 
  onProcessingStarted 
}) => {
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<{ [key: string]: string }>({});

  const triggerProcessing = async (documentId: string, filename: string) => {
    setProcessing(true);
    setResults(prev => ({ ...prev, [documentId]: 'Starting...' }));

    try {
      console.log(`Triggering processing for document: ${filename} (${documentId})`);

      // Call the document-processor Edge Function directly
      const { data, error } = await supabase.functions.invoke('document-processor', {
        body: { 
          documentId,
          action: 'process'
        }
      });

      if (error) {
        console.error('Processing error:', error);
        setResults(prev => ({ 
          ...prev, 
          [documentId]: `Error: ${error.message}` 
        }));
      } else {
        console.log('Processing response:', data);
        setResults(prev => ({ 
          ...prev, 
          [documentId]: 'Processing started successfully!' 
        }));
        onProcessingStarted?.();
      }
    } catch (err) {
      console.error('Failed to trigger processing:', err);
      setResults(prev => ({ 
        ...prev, 
        [documentId]: `Failed: ${err instanceof Error ? err.message : 'Unknown error'}` 
      }));
    } finally {
      setProcessing(false);
    }
  };

  const triggerAllProcessing = async () => {
    for (const doc of documents) {
      await triggerProcessing(doc.id, doc.filename);
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  if (documents.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
        <p className="text-gray-600">No documents found that need processing.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
      <h3 className="font-medium text-yellow-800 mb-3">
        Manual Document Processing
      </h3>
      <p className="text-sm text-yellow-700 mb-4">
        These documents were uploaded but processing was never triggered. 
        Click below to start processing manually.
      </p>

      <div className="space-y-3">
        <button
          onClick={triggerAllProcessing}
          disabled={processing}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? 'Processing...' : `Process All ${documents.length} Documents`}
        </button>

        <div className="space-y-2">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-2 bg-white rounded border">
              <div className="flex-1">
                <span className="text-sm font-medium">{doc.filename}</span>
                <span className="ml-2 text-xs text-gray-500">({doc.id.substring(0, 8)}...)</span>
              </div>
              <div className="flex items-center space-x-2">
                {results[doc.id] && (
                  <span className={`text-xs px-2 py-1 rounded ${
                    results[doc.id].includes('Error') || results[doc.id].includes('Failed') 
                      ? 'bg-red-100 text-red-700'
                      : results[doc.id].includes('successfully')
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {results[doc.id]}
                  </span>
                )}
                <button
                  onClick={() => triggerProcessing(doc.id, doc.filename)}
                  disabled={processing}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Process
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DocumentProcessingTrigger; 