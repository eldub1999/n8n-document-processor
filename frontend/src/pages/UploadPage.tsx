import React from 'react';
import DocumentUpload from '../components/DocumentUpload';
import AuthStatus from '../components/AuthStatus';

const UploadPage: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-blue-600 mb-6">Upload Document</h1>
      <div className="space-y-6">
        <AuthStatus />
        <DocumentUpload />
      </div>
    </div>
  );
};

export default UploadPage; 