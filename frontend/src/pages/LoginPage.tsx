import { 
  Box, 
  Button, 
  FormControl, 
  FormLabel, 
  Heading, 
  Input, 
  FormErrorMessage,
  useToast,
  Flex,
  Text,
  Link
} from '@chakra-ui/react';
import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { signInWithEmail } from '../services/authService';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{email?: string, password?: string}>({});
  
  const navigate = useNavigate();
  const toast = useToast();
  
  const validateForm = () => {
    const newErrors: {email?: string, password?: string} = {};
    if (!email) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      await signInWithEmail(email, password);
      navigate('/documents');
    } catch (error) {
      toast({
        title: 'Error signing in',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Flex minH="70vh" align="center" justify="center">
      <Box w="100%" maxW="400px" p={8} borderWidth="1px" borderRadius="lg" boxShadow="lg">
        <Heading as="h1" size="xl" textAlign="center" mb={6}>
          Sign In
        </Heading>
        
        <form onSubmit={handleSubmit}>
          <FormControl isInvalid={!!errors.email} mb={4}>
            <FormLabel>Email</FormLabel>
            <Input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
            />
            <FormErrorMessage>{errors.email}</FormErrorMessage>
          </FormControl>
          
          <FormControl isInvalid={!!errors.password} mb={6}>
            <FormLabel>Password</FormLabel>
            <Input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
            />
            <FormErrorMessage>{errors.password}</FormErrorMessage>
          </FormControl>
          
          <Button 
            type="submit" 
            colorScheme="blue" 
            width="full" 
            isLoading={isLoading}
          >
            Sign In
          </Button>
        </form>
        
        <Text mt={4} textAlign="center">
          Don't have an account?{' '}
          <Link as={RouterLink} to="/register" color="blue.500">
            Register here
          </Link>
        </Text>
      </Box>
    </Flex>
  );
} 