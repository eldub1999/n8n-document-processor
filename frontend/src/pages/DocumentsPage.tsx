import { Box, Heading, Container, Tabs } from '@chakra-ui/react';
import { DocumentUploader } from '../components/DocumentUpload';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

export default function DocumentsPage() {
  const { user } = useAuth();

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <Container maxW="container.lg" py={8}>
      <Heading as="h1" mb={6}>My Documents</Heading>
      
      <Tabs.Root defaultValue="list">
        <Tabs.List>
          <Tabs.Trigger value="list">All Documents</Tabs.Trigger>
          <Tabs.Trigger value="upload">Upload New</Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>
        
        <Tabs.Content value="list">
          <Box p={4} bg="bg.subtle" borderRadius="md">
            {/* Document list will be implemented in future task */}
            <Heading as="h3" size="md">Document listing coming soon</Heading>
          </Box>
        </Tabs.Content>
        
        <Tabs.Content value="upload">
          <Box p={6} bg="bg.subtle" borderRadius="md">
            <Heading as="h2" size="lg" mb={4}>Upload Document</Heading>
            <DocumentUploader />
          </Box>
        </Tabs.Content>
      </Tabs.Root>
    </Container>
  );
} 