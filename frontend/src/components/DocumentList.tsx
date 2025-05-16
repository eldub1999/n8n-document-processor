import { useState, useEffect } from 'react';
import {
  Box,
  Table,
  Input,
  InputGroup,
  Stack,
  Flex,
  Text,
  Button,
  Badge,
  IconButton,
  Skeleton,
  Select,
  HStack,
  useDisclosure
} from '@chakra-ui/react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import type { Document, DocumentSearchParams } from '../types/document';
import { formatFileSize } from '../utils/formatters';

// Icons as simple components
const SearchIcon = () => <span>🔍</span>;
const DownloadIcon = () => <span>⬇️</span>;
const DeleteIcon = () => <span>🗑️</span>;

export function DocumentList() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<DocumentSearchParams>({
    sortBy: 'created_at',
    sortOrder: 'desc',
    filterText: '',
    limit: 10,
    offset: 0
  });
  const { user } = useAuth();
  
  // Get total document count for pagination
  const [totalCount, setTotalCount] = useState<number>(0);
  // Selected document for operations
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  // For confirm dialog
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    if (!user) return;
    
    fetchDocuments();
  }, [user, searchParams]);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // First get total count for pagination
      const { count, error: countError } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', user?.id || '');
      
      if (countError) throw countError;
      if (count !== null) setTotalCount(count);
      
      // Then get paginated data
      let query = supabase
        .from('documents')
        .select('*')
        .eq('created_by', user?.id || '');
      
      // Apply filtering if provided
      if (searchParams.filterText) {
        query = query.ilike('filename', `%${searchParams.filterText}%`);
      }
      
      // Apply sorting
      if (searchParams.sortBy) {
        query = query.order(searchParams.sortBy, { 
          ascending: searchParams.sortOrder === 'asc' 
        });
      }
      
      // Apply pagination
      if (searchParams.limit) {
        query = query.limit(searchParams.limit);
      }
      
      if (searchParams.offset) {
        query = query.range(
          searchParams.offset, 
          searchParams.offset + (searchParams.limit || 10) - 1
        );
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setError('Failed to load documents. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      const { data, error } = await supabase
        .storage
        .from('documents')
        .download(document.storage_path);
      
      if (error) throw error;
      
      // Create a URL for the blob and trigger download
      const url = URL.createObjectURL(data);
      const a = globalThis.document.createElement('a');
      a.href = url;
      a.download = document.filename;
      globalThis.document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      globalThis.document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const handleDelete = async (document: Document) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase
        .storage
        .from('documents')
        .remove([document.storage_path]);
      
      if (storageError) throw storageError;
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', document.id);
      
      if (dbError) throw dbError;
      
      // Update local state
      setDocuments(documents.filter(d => d.id !== document.id));
      onClose();
      setSelectedDocument(null);
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleSort = (sortBy: DocumentSearchParams['sortBy']) => {
    // If clicking the same column, toggle order
    if (sortBy === searchParams.sortBy) {
      setSearchParams({
        ...searchParams,
        sortOrder: searchParams.sortOrder === 'asc' ? 'desc' : 'asc'
      });
    } else {
      // Default to descending for new column
      setSearchParams({
        ...searchParams,
        sortBy,
        sortOrder: 'desc'
      });
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParams({
      ...searchParams,
      filterText: e.target.value,
      offset: 0 // Reset to first page on new search
    });
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams({
      ...searchParams,
      offset: (newPage - 1) * (searchParams.limit || 10)
    });
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = parseInt(e.target.value);
    setSearchParams({
      ...searchParams,
      limit: newLimit,
      offset: 0 // Reset to first page when changing limit
    });
  };

  const currentPage = Math.floor((searchParams.offset || 0) / (searchParams.limit || 10)) + 1;
  const totalPages = Math.ceil(totalCount / (searchParams.limit || 10));

  // Function to render file type badge
  const renderFileTypeBadge = (contentType: string) => {
    let color = 'gray';
    let label = 'File';
    
    if (contentType.includes('pdf')) {
      color = 'red';
      label = 'PDF';
    } else if (contentType.includes('word') || contentType.includes('doc')) {
      color = 'blue';
      label = 'DOC';
    } else if (contentType.includes('image')) {
      color = 'green';
      label = 'Image';
    } else if (contentType.includes('text')) {
      color = 'yellow';
      label = 'Text';
    }
    
    return <Badge colorScheme={color}>{label}</Badge>;
  };

  // Loading state
  if (isLoading && documents.length === 0) {
    return (
      <Box p={4}>
        <Stack gap={4}>
          <Box as={Skeleton} height="40px" />
          <Box as={Skeleton} height="300px" />
        </Stack>
      </Box>
    );
  }

  // Error state
  if (error && !isLoading) {
    return (
      <Box p={4} textAlign="center">
        <Text color="red.500">{error}</Text>
        <Button mt={4} onClick={fetchDocuments}>Try Again</Button>
      </Box>
    );
  }

  return (
    <Box p={4}>
      {/* Search and filters */}
      <Flex mb={6} direction={{ base: 'column', md: 'row' }} gap={4}>
        <InputGroup>
          <Box position="absolute" left={3} top="50%" transform="translateY(-50%)">
            <SearchIcon />
          </Box>
          <Input 
            paddingLeft={10}
            placeholder="Search by filename" 
            value={searchParams.filterText}
            onChange={handleSearch}
          />
        </InputGroup>
        
        <Select 
          w={{ base: 'full', md: '150px' }}
          value={searchParams.limit} 
          onChange={handleLimitChange}
        >
          <option value={5}>5 per page</option>
          <option value={10}>10 per page</option>
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
        </Select>
      </Flex>

      {/* Document table */}
      <Box overflowX="auto">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader 
                cursor="pointer" 
                onClick={() => handleSort('filename')} 
                userSelect="none"
              >
                Filename
                {searchParams.sortBy === 'filename' && (
                  <Box as="span" ml={1}>{searchParams.sortOrder === 'asc' ? '↑' : '↓'}</Box>
                )}
              </Table.ColumnHeader>
              <Table.ColumnHeader>Type</Table.ColumnHeader>
              <Table.ColumnHeader 
                cursor="pointer" 
                onClick={() => handleSort('size_bytes')} 
                userSelect="none"
              >
                Size
                {searchParams.sortBy === 'size_bytes' && (
                  <Box as="span" ml={1}>{searchParams.sortOrder === 'asc' ? '↑' : '↓'}</Box>
                )}
              </Table.ColumnHeader>
              <Table.ColumnHeader 
                cursor="pointer" 
                onClick={() => handleSort('created_at')} 
                userSelect="none"
              >
                Uploaded
                {searchParams.sortBy === 'created_at' && (
                  <Box as="span" ml={1}>{searchParams.sortOrder === 'asc' ? '↑' : '↓'}</Box>
                )}
              </Table.ColumnHeader>
              <Table.ColumnHeader>Actions</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {documents.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={5} textAlign="center" py={8}>
                  <Text>No documents found</Text>
                </Table.Cell>
              </Table.Row>
            ) : (
              documents.map(doc => (
                <Table.Row key={doc.id}>
                  <Table.Cell>
                    <Text 
                      fontWeight="medium" 
                      _hover={{ color: "blue.500", textDecoration: "underline" }}
                      cursor="pointer"
                    >
                      {doc.filename}
                    </Text>
                    {doc.description && (
                      <Text fontSize="sm" color="gray.500">
                        {doc.description.substring(0, 60)}
                        {doc.description.length > 60 ? '...' : ''}
                      </Text>
                    )}
                  </Table.Cell>
                  <Table.Cell>{renderFileTypeBadge(doc.content_type)}</Table.Cell>
                  <Table.Cell>{formatFileSize(doc.size_bytes)}</Table.Cell>
                  <Table.Cell>{new Date(doc.created_at).toLocaleDateString()}</Table.Cell>
                  <Table.Cell>
                    <HStack spacing={2}>
                      <IconButton
                        aria-label="Download"
                        size="sm"
                        icon={<DownloadIcon />}
                        onClick={() => handleDownload(doc)}
                        variant="ghost"
                      />
                      <IconButton
                        aria-label="Delete"
                        size="sm"
                        icon={<DeleteIcon />}
                        onClick={() => {
                          setSelectedDocument(doc);
                          onOpen();
                        }}
                        variant="ghost"
                        colorScheme="red"
                      />
                    </HStack>
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table.Root>
      </Box>

      {/* Pagination */}
      {totalPages > 1 && (
        <Flex mt={6} justify="center" align="center" gap={2}>
          <Button
            size="sm"
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            Previous
          </Button>
          
          <Text>
            Page {currentPage} of {totalPages}
          </Text>
          
          <Button
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            Next
          </Button>
        </Flex>
      )}

      {/* Delete confirmation dialog - we'd use Chakra's AlertDialog here */}
    </Box>
  );
} 