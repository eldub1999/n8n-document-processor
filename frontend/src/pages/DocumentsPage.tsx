import React from 'react';

const DocumentsPage: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-blue-600 mb-6">Documents</h1>
      <div className="bg-white shadow-md rounded-lg p-6">
        <p className="text-gray-600 mb-4">
          This is a placeholder for the Documents page. The actual component implementation will include a list of documents with filtering and sorting capabilities.
        </p>
        <div className="mt-6 p-4 bg-gray-100 rounded-md">
          <p className="text-sm text-gray-500">Coming soon...</p>
        </div>
      </div>
    </div>
  );
};

export default DocumentsPage; 