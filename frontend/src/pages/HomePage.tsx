import { Heading, Text, VStack, Button, Box } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  return (
    <Box py={12}>
      <VStack spacing={6} textAlign="center">
        <Heading as="h1" size="2xl">
          Document Management System
        </Heading>
        <Text fontSize="xl" maxW="container.md" mx="auto">
          A simple, secure way to store, organize, and share your documents.
        </Text>
        
        {!user ? (
          <Button 
            size="lg" 
            colorScheme="blue" 
            onClick={() => navigate('/login')}
          >
            Get Started
          </Button>
        ) : (
          <Button 
            size="lg" 
            colorScheme="blue" 
            onClick={() => navigate('/documents')}
          >
            View My Documents
          </Button>
        )}
      </VStack>
    </Box>
  );
} 