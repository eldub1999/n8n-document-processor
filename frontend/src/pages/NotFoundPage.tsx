import { Box, Heading, Text, Button } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();
  
  return (
    <Box textAlign="center" py={20}>
      <Heading as="h1" size="2xl" mb={4}>
        404
      </Heading>
      <Text fontSize="xl" mb={8}>
        Page not found
      </Text>
      <Button colorScheme="blue" onClick={() => navigate('/')}>
        Go Home
      </Button>
    </Box>
  );
} 