import React from 'react';
import DocumentUpload from '../components/DocumentUpload';

const UploadPage: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-blue-600 mb-6">Upload Document</h1>
      <DocumentUpload />
    </div>
  );
};

export default UploadPage; 