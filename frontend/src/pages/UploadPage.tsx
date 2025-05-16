import React, { useState } from 'react';

const UploadPage: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Placeholder for file handling logic
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-blue-600 mb-6">Upload Document</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <div 
          className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('fileInput')?.click()}
        >
          <input 
            type="file" 
            id="fileInput" 
            className="hidden" 
            accept=".pdf,.doc,.docx,.txt"
          />
          <div className="text-gray-500 mb-2">
            <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-700">
            Drag and drop your file here or click to browse
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Supported formats: PDF, DOC, DOCX, TXT (Max size: 10MB)
          </p>
        </div>
        
        <div className="mt-6">
          <p className="text-gray-600 mb-4">
            This is a placeholder for the Upload page. The actual component implementation will include file validation, upload progress, and metadata form fields.
          </p>
          <button 
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled
          >
            Upload Document
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadPage; 