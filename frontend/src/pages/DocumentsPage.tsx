import { Box, Heading, Container, Tabs } from '@chakra-ui/react';
import { DocumentList } from '../components/DocumentList';
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
          <Tabs.Indicator />
        </Tabs.List>
        
        <Tabs.Content value="list">
          <Box p={4}>
            <DocumentList />
          </Box>
        </Tabs.Content>
      </Tabs.Root>
    </Container>
  );
} 