import React from 'react';
import DocumentList from '../components/DocumentList';

const DocumentsPage: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-blue-600 mb-6">Documents</h1>
      <DocumentList />
    </div>
  );
};

export default DocumentsPage; 