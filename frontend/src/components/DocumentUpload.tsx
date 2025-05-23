import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadDocument } from '../services/documentService';
import { toaster } from '../services/toast';
import { getCountiesByJurisdiction, hasCountyData } from '../services/countyService';
import type { DocumentUpload as DocumentUploadType } from '../types/document';
import { US_JURISDICTIONS, DOCUMENT_TYPES } from '../types/document';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];

const DocumentUpload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [selectedCounties, setSelectedCounties] = useState<string[]>([]);
  const [documentType, setDocumentType] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [countyDropdownOpen, setCountyDropdownOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const countyDropdownRef = useRef<HTMLDivElement>(null);
  
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
    
    // Validate required metadata fields
    if (!jurisdiction) {
      setError('Please select a jurisdiction.');
      return;
    }
    
    if (!documentType) {
      setError('Please select a document type.');
      return;
    }
    
    if (jurisdiction !== 'national' && selectedCounties.length === 0) {
      setError('Please select at least one county for the selected jurisdiction.');
      return;
    }
    
    try {
      setUploading(true);
      setError(null);
      
      const documentData: DocumentUploadType = {
        file: selectedFile,
        description: description.trim() || undefined,
        jurisdiction: jurisdiction || undefined,
        county: selectedCounties.length > 0 ? (
          allCountiesSelected ? 'all' : selectedCounties.join(',')
        ) : undefined,
        document_type: documentType || undefined,
      };
      
      await uploadDocument(documentData);
      
      toaster.create({
        title: 'Success',
        description: 'Document uploaded successfully',
      });
      
      navigate('/documents');
    } catch (err) {
      console.error('Error uploading document:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload document';
      setError(errorMessage);
      
      // Show different toast messages based on error type
      if (errorMessage.includes('already exists in the system')) {
        toaster.create({
          title: 'Duplicate Document',
          description: 'This document is already in the system.',
        });
      } else {
        toaster.create({
          title: 'Upload Failed',
          description: 'Failed to upload document. Please try again.',
        });
      }
    } finally {
      setUploading(false);
    }
  };
  
  // Get available counties for the selected jurisdiction
  const availableCounties = jurisdiction && jurisdiction !== 'national' 
    ? getCountiesByJurisdiction(jurisdiction).filter(county => county.value !== 'all') // Remove the 'all' option since we handle it with checkbox
    : [];

  // Check if all individual counties are selected
  const allCountiesSelected = availableCounties.length > 0 && selectedCounties.length === availableCounties.length;

  // Handle county selection
  const handleCountyToggle = (countyValue: string) => {
    setSelectedCounties(prev => {
      if (prev.includes(countyValue)) {
        // Remove county
        return prev.filter(c => c !== countyValue);
      } else {
        // Add county
        const newSelection = [...prev, countyValue];
        return newSelection;
      }
    });
  };

  // Handle select all counties
  const handleSelectAllCounties = (checked: boolean) => {
    if (checked) {
      setSelectedCounties(availableCounties.map(county => county.value));
    } else {
      setSelectedCounties([]);
    }
  };

  // Get display text for selected counties
  const getSelectedCountiesText = () => {
    if (selectedCounties.length === 0) return 'Select counties...';
    if (allCountiesSelected) return `All counties (${selectedCounties.length})`;
    if (selectedCounties.length === 1) {
      const county = availableCounties.find(c => c.value === selectedCounties[0]);
      return county?.label || selectedCounties[0];
    }
    return `${selectedCounties.length} counties selected`;
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countyDropdownRef.current && !countyDropdownRef.current.contains(event.target as Node)) {
        setCountyDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
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
        
        {/* Metadata Fields */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Jurisdiction *
            </label>
            <select 
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={jurisdiction}
              onChange={(e) => {
                setJurisdiction(e.target.value);
                setSelectedCounties([]);
              }}
              required
            >
              <option value="">Select a jurisdiction</option>
              {US_JURISDICTIONS.map((jur) => (
                <option key={jur.value} value={jur.value}>
                  {jur.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* County Field - Only show if not National */}
          {jurisdiction !== 'national' && availableCounties.length > 0 && (
            <div className="space-y-3">
              {/* Select All Counties Checkbox */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="selectAllCounties"
                  checked={allCountiesSelected}
                  onChange={(e) => handleSelectAllCounties(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="selectAllCounties" className="text-sm font-medium text-gray-700">
                  Select all counties in {US_JURISDICTIONS.find(j => j.value === jurisdiction)?.label}
                </label>
              </div>

              {/* Custom Multiselect Dropdown */}
              <div className="relative" ref={countyDropdownRef}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Counties <span className="text-red-500">*</span>
                </label>
                
                {/* Dropdown Button */}
                <button
                  type="button"
                  onClick={() => setCountyDropdownOpen(!countyDropdownOpen)}
                  className="w-full px-3 py-2 text-left border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <span className="block truncate text-gray-900">
                    {getSelectedCountiesText()}
                  </span>
                  <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3z" clipRule="evenodd" />
                    </svg>
                  </span>
                </button>

                {/* Dropdown Options */}
                {countyDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
                    {availableCounties.map((county) => (
                      <div
                        key={county.value}
                        className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50"
                        onClick={() => handleCountyToggle(county.value)}
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedCounties.includes(county.value)}
                            onChange={() => {}} // Handled by parent onClick
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="font-normal text-gray-900">
                            {county.label}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selected Counties Display */}
                {selectedCounties.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedCounties.map((countyValue) => {
                      const county = availableCounties.find(c => c.value === countyValue);
                      return (
                        <span
                          key={countyValue}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {county?.label || countyValue}
                          <button
                            type="button"
                            onClick={() => handleCountyToggle(countyValue)}
                            className="ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none"
                          >
                            <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                              <path strokeLinecap="round" strokeWidth="1.5" d="m1 1 6 6m0-6L1 7" />
                            </svg>
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Validation Message */}
                {selectedCounties.length === 0 && (
                  <p className="mt-1 text-sm text-gray-500">
                    Please select at least one county for this jurisdiction.
                  </p>
                )}
              </div>
            </div>
          )}
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Document Type *
            </label>
            <select 
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              required
            >
              <option value="">Select a document type</option>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

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