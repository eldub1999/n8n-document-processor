import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadDocument } from '../services/documentService';
import { processDocument, subscribeToProcessingStatus } from '../services/ragService';
import type { DocumentProcessingStatus } from '../types/rag';
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
  
  // RAG processing state
  const [processingStatus, setProcessingStatus] = useState<DocumentProcessingStatus | null>(null);
  const [showProcessingStatus, setShowProcessingStatus] = useState(false);
  
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
      
      // Upload the document
      const uploadedDocument = await uploadDocument(documentData);
      
      toaster.create({
        title: 'Success',
        description: 'Document uploaded successfully. Processing for AI search...',
      });
      
      // Start RAG processing
      setShowProcessingStatus(true);
      
      try {
        // Subscribe to processing status updates
        const unsubscribe = subscribeToProcessingStatus(uploadedDocument.id, (status) => {
          setProcessingStatus(status);
          
          if (status?.status === 'completed') {
            toaster.create({
              title: 'Processing Complete',
              description: 'Document is now ready for AI-powered search and chat!',
            });
            // Auto-navigate after a short delay to let user see the completion message
            setTimeout(() => navigate('/documents'), 2000);
          } else if (status?.status === 'failed') {
            toaster.create({
              title: 'Processing Failed',
              description: 'Document uploaded but AI processing failed. You can retry processing later.',
            });
          }
        });
        
        // Trigger processing
        await processDocument(uploadedDocument.id);
        
        // Clean up subscription when component unmounts or processing completes
        return unsubscribe;
        
      } catch (processingError) {
        console.error('Error starting document processing:', processingError);
        toaster.create({
          title: 'Processing Error',
          description: 'Document uploaded but AI processing could not be started.',
        });
        // Still navigate to documents page since upload succeeded
        setTimeout(() => navigate('/documents'), 1000);
      }
      
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

  // Handle county selection with proper state management
  const handleCountyChange = (countyValue: string, checked: boolean) => {
    setSelectedCounties(prev => {
      if (checked) {
        // Add county if not already selected
        return prev.includes(countyValue) ? prev : [...prev, countyValue];
      } else {
        // Remove county
        return prev.filter(c => c !== countyValue);
      }
    });
  };

  // Handle select all counties with proper state management
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
        <div className="mt-6 space-y-6">
          {/* Row 1: Jurisdiction and Document Type - Always side by side on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="jurisdiction" className="block text-sm font-medium text-gray-700">
                Jurisdiction <span className="text-red-500">*</span>
              </label>
              <select 
                id="jurisdiction"
                name="jurisdiction"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            
            <div className="space-y-2">
              <label htmlFor="documentType" className="block text-sm font-medium text-gray-700">
                Document Type <span className="text-red-500">*</span>
              </label>
              <select 
                id="documentType"
                name="documentType"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          
          {/* Row 2: County Selection - Full width when shown */}
          {jurisdiction !== 'national' && availableCounties.length > 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Counties <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-gray-500">
                  Select the counties where this document applies
                </p>
              </div>
              
              {/* Select All Counties Option */}
              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                <input
                  type="checkbox"
                  id="selectAllCounties"
                  checked={allCountiesSelected}
                  onChange={(e) => handleSelectAllCounties(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <label htmlFor="selectAllCounties" className="text-sm font-medium text-gray-900 cursor-pointer">
                    Apply to all counties in {US_JURISDICTIONS.find(j => j.value === jurisdiction)?.label}
                  </label>
                  <p className="text-xs text-gray-600 mt-1">
                    Check this for state-wide regulations and laws
                  </p>
                </div>
              </div>

              {/* Individual County Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Or select specific counties:</span>
                  {selectedCounties.length > 0 && !allCountiesSelected && (
                    <button
                      type="button"
                      onClick={() => setSelectedCounties([])}
                      className="text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                
                {/* Custom Multiselect Dropdown */}
                <div className="relative" ref={countyDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setCountyDropdownOpen(!countyDropdownOpen)}
                    disabled={allCountiesSelected}
                    className={`w-full px-3 py-2 text-left border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      allCountiesSelected 
                        ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed' 
                        : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'
                    }`}
                    aria-haspopup="listbox"
                    aria-expanded={countyDropdownOpen}
                  >
                    <span className="block truncate">
                      {allCountiesSelected 
                        ? `All counties selected (${availableCounties.length})`
                        : getSelectedCountiesText()
                      }
                    </span>
                    <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <svg 
                        className={`h-5 w-5 text-gray-400 transform transition-transform ${countyDropdownOpen ? 'rotate-180' : ''}`} 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </button>

                  {/* Dropdown Options */}
                  {countyDropdownOpen && !allCountiesSelected && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
                      <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-200">
                        Select Counties ({selectedCounties.length} selected)
                      </div>
                      
                      {availableCounties.map((county) => {
                        const isSelected = selectedCounties.includes(county.value);
                        return (
                          <label
                            key={county.value}
                            className="flex items-center px-3 py-2 hover:bg-blue-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleCountyChange(county.value, e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                            />
                            <span className={`text-sm flex-1 ${isSelected ? 'font-medium text-blue-900' : 'text-gray-900'}`}>
                              {county.label}
                            </span>
                            {isSelected && (
                              <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </label>
                        );
                      })}
                      
                      {/* Dropdown Actions */}
                      <div className="border-t border-gray-200 px-3 py-2 flex justify-between items-center bg-gray-50">
                        <span className="text-xs text-gray-500">
                          {selectedCounties.length} of {availableCounties.length} selected
                        </span>
                        <button
                          type="button"
                          onClick={() => setCountyDropdownOpen(false)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-500"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected Counties Display */}
                {selectedCounties.length > 0 && !allCountiesSelected && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900">
                        Selected Counties ({selectedCounties.length})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedCounties.map((countyValue) => {
                        const county = availableCounties.find(c => c.value === countyValue);
                        return (
                          <span
                            key={countyValue}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300"
                          >
                            {county?.label || countyValue}
                            <button
                              type="button"
                              onClick={() => handleCountyChange(countyValue, false)}
                              className="ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-400 hover:bg-blue-200 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              aria-label={`Remove ${county?.label || countyValue}`}
                            >
                              <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                                <path strokeLinecap="round" strokeWidth="1.5" d="m1 1 6 6m0-6L1 7" />
                              </svg>
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Validation Message */}
                {selectedCounties.length === 0 && !allCountiesSelected && (
                  <p className="mt-2 text-sm text-gray-500">
                    Please select at least one county or choose "Apply to all counties"
                  </p>
                )}
              </div>
            </div>
          )}
          
          {/* Row 3: Description - Full width */}
          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description <span className="text-gray-400">(Optional)</span>
            </label>
            <textarea 
              id="description"
              name="description"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Add a description for this document..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Provide context about this document, its purpose, or relevant details
            </p>
          </div>
        </div>
        
        {/* Processing Status Display */}
        {showProcessingStatus && processingStatus && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-blue-900">
                AI Processing Status
              </h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                processingStatus.status === 'completed' 
                  ? 'bg-green-100 text-green-800'
                  : processingStatus.status === 'failed'
                  ? 'bg-red-100 text-red-800'
                  : processingStatus.status === 'processing'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {processingStatus.status.charAt(0).toUpperCase() + processingStatus.status.slice(1)}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-blue-700 mb-1">
                <span>
                  {processingStatus.stage && `Stage: ${processingStatus.stage.replace(/_/g, ' ')}`}
                </span>
                <span>{processingStatus.progress_percentage}%</span>
              </div>
              <div className="w-full bg-blue-100 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    processingStatus.status === 'completed' 
                      ? 'bg-green-600' 
                      : processingStatus.status === 'failed'
                      ? 'bg-red-600'
                      : 'bg-blue-600'
                  }`}
                  style={{ width: `${processingStatus.progress_percentage}%` }}
                ></div>
              </div>
            </div>
            
            {/* Processing Details */}
            <div className="text-xs text-blue-700 space-y-1">
              {processingStatus.total_chunks > 0 && (
                <div>
                  Chunks: {processingStatus.processed_chunks} / {processingStatus.total_chunks} processed
                </div>
              )}
              {processingStatus.status === 'completed' && (
                <div className="text-green-700 font-medium">
                  ✅ Document is ready for AI-powered search and chat!
                </div>
              )}
              {processingStatus.status === 'failed' && processingStatus.error_message && (
                <div className="text-red-700 font-medium">
                  ❌ Error: {processingStatus.error_message}
                </div>
              )}
              {processingStatus.status === 'processing' && (
                <div className="flex items-center text-blue-700">
                  <svg className="animate-spin -ml-1 mr-2 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing document for AI search...
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="mt-8 flex flex-col sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            className="w-full sm:w-auto px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            onClick={() => navigate('/documents')}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              !selectedFile || uploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
            }`}
            disabled={!selectedFile || uploading}
            onClick={handleUpload}
          >
            {uploading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </span>
            ) : (
              'Upload Document'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentUpload; 