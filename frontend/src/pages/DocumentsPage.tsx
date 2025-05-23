import React from 'react';
import DocumentList from '../components/DocumentList';
import DebugInfo from '../components/DebugInfo';

const DocumentsPage: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-blue-600 mb-6">Documents</h1>
      <div className="space-y-6">
        <DebugInfo />
        <DocumentList />
      </div>
    </div>
  );
};

export default DocumentsPage; 