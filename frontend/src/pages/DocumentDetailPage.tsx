import React from 'react';
import { useParams } from 'react-router-dom';

const DocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-blue-600 mb-4">Document Details</h1>
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Document ID: <span className="text-blue-500">{id}</span>
          </h2>
          <div className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-600">
            Placeholder
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-4">
          <p className="text-gray-600 mb-4">
            This is a placeholder for the Document Detail page. The actual component implementation will include 
            document metadata, content preview, and actions.
          </p>
          <div className="flex gap-3 mt-6">
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors">
              Download
            </button>
            <button className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded transition-colors">
              Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentDetailPage; 