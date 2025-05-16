import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDocuments, deleteDocument, getDocumentUrl } from '../services/documentService';
import { toaster } from '../services/toast';
import type { Document, DocumentSearchParams } from '../types/document';

const DocumentList = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<DocumentSearchParams>({
    sortBy: 'created_at',
    sortOrder: 'desc',
    limit: 20,
    offset: 0,
    filterText: '',
  });
  
  const navigate = useNavigate();
  
  useEffect(() => {
    loadDocuments();
  }, [searchParams]);
  
  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await getDocuments(searchParams);
      setDocuments(docs);
      setError(null);
    } catch (err) {
      console.error('Error loading documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
      toaster.create({
        title: 'Error',
        description: 'Failed to load documents. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleDownload = async (doc: Document) => {
    try {
      const url = await getDocumentUrl(doc);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Error getting document URL:', err);
      toaster.create({
        title: 'Error',
        description: 'Failed to download document. Please try again.',
      });
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await deleteDocument(id);
      toaster.create({
        title: 'Success',
        description: 'Document deleted successfully',
      });
      loadDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
      toaster.create({
        title: 'Error',
        description: 'Failed to delete document. Please try again.',
      });
    }
  };
  
  const handleViewDetails = (id: string) => {
    navigate(`/documents/${id}`);
  };
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParams({
      ...searchParams,
      filterText: e.target.value,
      offset: 0, // Reset pagination when searching
    });
  };
  
  const handleSort = (sortBy: DocumentSearchParams['sortBy']) => {
    setSearchParams({
      ...searchParams,
      sortBy,
      sortOrder: 
        searchParams.sortBy === sortBy && searchParams.sortOrder === 'asc' 
          ? 'desc' 
          : 'asc',
      offset: 0, // Reset pagination when sorting
    });
  };
  
  const getSortIndicator = (column: DocumentSearchParams['sortBy']) => {
    if (searchParams.sortBy !== column) return null;
    return searchParams.sortOrder === 'asc' ? '↑' : '↓';
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  if (loading && documents.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error && documents.length === 0) {
    return (
      <div className="rounded-md bg-red-50 p-4 my-4">
        <div className="flex">
          <div className="text-red-700">
            <p className="font-medium">Error loading documents</p>
            <p className="text-sm">{error}</p>
            <button 
              onClick={loadDocuments}
              className="mt-3 text-sm font-medium text-red-700 hover:text-red-600"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search documents..."
            className="pl-10 pr-4 py-2 w-full border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchParams.filterText}
            onChange={handleSearch}
          />
          <div className="absolute left-3 top-2.5 text-zinc-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <button
          onClick={() => navigate('/upload')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Upload New Document
        </button>
      </div>
      
      {documents.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-zinc-600 mb-4">No documents found.</p>
          <button
            onClick={() => navigate('/upload')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Upload Your First Document
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow-md">
            <thead>
              <tr className="bg-zinc-50 text-left text-zinc-500 border-b">
                <th className="px-6 py-3 font-medium text-sm cursor-pointer" onClick={() => handleSort('filename')}>
                  Filename {getSortIndicator('filename')}
                </th>
                <th className="px-6 py-3 font-medium text-sm cursor-pointer" onClick={() => handleSort('size_bytes')}>
                  Size {getSortIndicator('size_bytes')}
                </th>
                <th className="px-6 py-3 font-medium text-sm cursor-pointer" onClick={() => handleSort('created_at')}>
                  Date Added {getSortIndicator('created_at')}
                </th>
                <th className="px-6 py-3 font-medium text-sm cursor-pointer" onClick={() => handleSort('updated_at')}>
                  Last Modified {getSortIndicator('updated_at')}
                </th>
                <th className="px-6 py-3 font-medium text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-zinc-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="text-zinc-800 font-medium truncate max-w-[200px]">
                        {doc.filename}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-600">
                    {formatFileSize(doc.size_bytes)}
                  </td>
                  <td className="px-6 py-4 text-zinc-600">
                    {formatDate(doc.created_at)}
                  </td>
                  <td className="px-6 py-4 text-zinc-600">
                    {formatDate(doc.updated_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleViewDetails(doc.id)}
                        className="text-blue-600 hover:text-blue-800"
                        title="View Details"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="text-green-600 hover:text-green-800"
                        title="Download"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DocumentList; 