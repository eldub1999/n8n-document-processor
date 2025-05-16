import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadDocument } from '../services/documentService';
import { toaster } from '../services/toast';
import type { DocumentUpload as DocumentUploadType } from '../types/document';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];

const DocumentUpload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  
  const validateFile = (file: File): string | null => {
    if (!file) return 'Please select a file to upload.';
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload a PDF, DOC, DOCX, or TXT file.';
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds the maximum limit of 10MB.';
    }
    
    return null;
  };
  
  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }
    
    setSelectedFile(file);
    setError(null);
    
    // Simulate progress for demo purposes
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      if (progress > 100) {
        clearInterval(interval);
      } else {
        setUploadProgress(progress);
      }
    }, 300);
    
    // Clear interval after 3 seconds
    setTimeout(() => {
      clearInterval(interval);
      setUploadProgress(0);
    }, 3000);
  };
  
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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };
  
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };
  
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }
    
    try {
      setUploading(true);
      setError(null);
      
      const documentData: DocumentUploadType = {
        file: selectedFile,
        description: description.trim() || undefined,
      };
      
      await uploadDocument(documentData);
      
      toaster.create({
        title: 'Success',
        description: 'Document uploaded successfully',
      });
      
      navigate('/documents');
    } catch (err) {
      console.error('Error uploading document:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload document');
      toaster.create({
        title: 'Error',
        description: 'Failed to upload document. Please try again.',
      });
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="bg-white shadow-md rounded-lg p-6">
        <div 
          className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-zinc-300 hover:border-blue-400'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileInput}
          />
          
          {!selectedFile ? (
            <>
              <div className="text-zinc-500 mb-2">
                <svg className="w-12 h-12 mx-auto text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-lg font-medium text-zinc-700">
                Drag and drop your file here or click to browse
              </p>
              <p className="text-sm text-zinc-500 mt-2">
                Supported formats: PDF, DOC, DOCX, TXT (Max size: 10MB)
              </p>
            </>
          ) : (
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-zinc-700">
                {selectedFile.name}
              </p>
              <p className="text-sm text-zinc-500 mt-1">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <button 
                className="mt-4 text-sm text-blue-600 hover:text-blue-800"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                Change File
              </button>
            </div>
          )}
          
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mt-4">
              <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-zinc-500 mt-1">
                Processing file...
              </p>
            </div>
          )}
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        <div className="mt-6">
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Description (Optional)
          </label>
          <textarea 
            className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Add a description for this document"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="mr-4 px-4 py-2 text-zinc-600 border border-zinc-300 rounded-md hover:bg-zinc-50 transition-colors"
            onClick={() => navigate('/documents')}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`px-6 py-2 bg-blue-600 text-white rounded-md transition-colors
              ${!selectedFile || uploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
            disabled={!selectedFile || uploading}
            onClick={handleUpload}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentUpload; 