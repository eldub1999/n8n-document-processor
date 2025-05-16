import { 
  Box, 
  Button, 
  Heading, 
  Input,
  Flex,
  Text,
  VStack,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Link,
  useToast
} from '@chakra-ui/react';
import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { signUpWithEmail } from '../services/authService';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string, 
    password?: string,
    confirmPassword?: string
  }>({});
  
  const navigate = useNavigate();
  const toast = useToast();
  
  const validateForm = () => {
    const newErrors: {
      email?: string, 
      password?: string,
      confirmPassword?: string
    } = {};
    
    if (!email) newErrors.email = 'Email is required';
    if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid';
    
    if (!password) newErrors.password = 'Password is required';
    if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      await signUpWithEmail(email, password);
      toast({
        title: 'Account created',
        description: 'Check your email to confirm your account',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      navigate('/login');
    } catch (error) {
      toast({
        title: 'Error creating account',
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
          Create Account
        </Heading>
        
        <form onSubmit={handleSubmit}>
          <VStack spacing={4}>
            <FormControl isInvalid={!!errors.email}>
              <FormLabel>Email</FormLabel>
              <Input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
              <FormErrorMessage>{errors.email}</FormErrorMessage>
            </FormControl>
            
            <FormControl isInvalid={!!errors.password}>
              <FormLabel>Password</FormLabel>
              <Input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
              <FormErrorMessage>{errors.password}</FormErrorMessage>
            </FormControl>
            
            <FormControl isInvalid={!!errors.confirmPassword}>
              <FormLabel>Confirm Password</FormLabel>
              <Input 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
              />
              <FormErrorMessage>{errors.confirmPassword}</FormErrorMessage>
            </FormControl>
            
            <Button 
              type="submit" 
              colorScheme="blue" 
              width="full" 
              mt={4}
              isLoading={isLoading}
            >
              Sign Up
            </Button>
          </VStack>
        </form>
        
        <Text mt={4} textAlign="center">
          Already have an account?{' '}
          <Link as={RouterLink} to="/login" color="blue.500">
            Sign in here
          </Link>
        </Text>
      </Box>
    </Flex>
  );
} 