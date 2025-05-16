import { useState } from 'react';
import { 
  Box, 
  Button, 
  Field,
  Textarea, 
  Stack,
  Text,
  FileUpload
} from '@chakra-ui/react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { toaster } from '../services/toast';

export function DocumentUploader() {
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await uploadFile(files[0]);
  };

  const uploadFile = async (file: File) => {
    if (!user) {
      toaster.create({
        title: 'Authentication required',
        description: 'You must be logged in to upload documents',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Upload file to Supabase Storage
      const filePath = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create document metadata record
      const { error: dbError } = await supabase.from('documents').insert({
        filename: file.name,
        storage_path: filePath,
        content_type: file.type,
        size_bytes: file.size,
        created_by: user.id,
        description: description || null,
      });

      if (dbError) throw dbError;

      toaster.create({
        title: 'Upload successful',
        description: 'Your document has been uploaded',
      });

      // Reset form
      setDescription('');
    } catch (error) {
      console.error('Upload error:', error);
      toaster.create({
        title: 'Upload failed',
        description: 'There was an error uploading your document',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Stack gap={4} align="stretch" w="100%" maxW="500px" mx="auto">
      <Box>
        <FileUpload.Root
          accept={{
            'application/pdf': ['.pdf'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'text/plain': ['.txt'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png']
          }}
          disabled={isUploading}
          onChange={handleFileChange}
        >
          <FileUpload.Dropzone 
            h="200px" 
            border="2px dashed" 
            borderColor="gray.300"
            borderRadius="md"
            bg="bg.subtle"
            _hover={{
              borderColor: "accent.DEFAULT"
            }}
          >
            <FileUpload.DropzoneContent>
              <Stack gap={2} p={6} textAlign="center">
                <Text fontWeight="medium">
                  Drag and drop your document here
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  Supports PDF, Word, TXT, and image files
                </Text>
                <Button 
                  marginTop={4}
                  size="sm"
                  as={FileUpload.Trigger}
                  loading={isUploading}
                >
                  Select file
                </Button>
              </Stack>
            </FileUpload.DropzoneContent>
          </FileUpload.Dropzone>
          <FileUpload.HiddenInput />
          <Box
            marginTop={4}
            border="1px solid"
            borderColor="gray.200"
            borderRadius="md"
            overflow="hidden"
          >
            <FileUpload.Items />
          </Box>
        </FileUpload.Root>
      </Box>
      
      <Box>
        <Field.Root>
          <Field.Label htmlFor="description">Description (optional)</Field.Label>
          <Textarea
            id="description"
            placeholder="Enter a description for your document"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isUploading}
          />
        </Field.Root>
      </Box>
    </Stack>
  );
} 