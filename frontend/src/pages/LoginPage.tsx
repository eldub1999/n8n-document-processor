import { 
  Box, 
  Button, 
  Heading, 
  Input, 
  Flex,
  Text,
  Link,
  Field
} from '@chakra-ui/react';
import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { signInWithEmail } from '../services/authService';
import { toaster } from '../services/toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{email?: string, password?: string}>({});
  
  const navigate = useNavigate();
  
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
      toaster.create({
        title: 'Error signing in',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Flex minH="70vh" align="center" justify="center">
      <Box 
        w="100%" 
        maxW="400px" 
        p={8} 
        borderWidth="1px" 
        borderColor="gray.200"
        borderRadius="lg" 
        bg="bg.DEFAULT"
        boxShadow="md"
      >
        <Heading as="h1" size="xl" textAlign="center" mb={6} color="fg.DEFAULT">
          Sign In
        </Heading>
        
        <form onSubmit={handleSubmit}>
          <Field.Root invalid={!!errors.email} mb={4}>
            <Field.Label>Email</Field.Label>
            <Input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && <Field.ErrorText>{errors.email}</Field.ErrorText>}
          </Field.Root>
          
          <Field.Root invalid={!!errors.password} mb={6}>
            <Field.Label>Password</Field.Label>
            <Input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
            />
            {errors.password && <Field.ErrorText>{errors.password}</Field.ErrorText>}
          </Field.Root>
          
          <Button 
            type="submit" 
            width="full" 
            loading={isLoading}
            bg="accent.DEFAULT"
            color="white"
            _hover={{ bg: "accent.emphasis" }}
          >
            Sign In
          </Button>
        </form>
        
        <Text mt={4} textAlign="center">
          Don't have an account?{' '}
          <RouterLink to="/register">
            <Link color="accent.DEFAULT">
              Register here
            </Link>
          </RouterLink>
        </Text>
      </Box>
    </Flex>
  );
} 