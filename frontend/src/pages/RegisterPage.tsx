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
import { signUpWithEmail } from '../services/authService';
import { toaster } from '../services/toast';

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
      toaster.create({
        title: 'Account created',
        description: 'You can now sign in with your credentials',
      });
      navigate('/login');
    } catch (error) {
      toaster.create({
        title: 'Error creating account',
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
          Create Account
        </Heading>
        
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap={4}>
            <Field.Root invalid={!!errors.email}>
              <Field.Label>Email</Field.Label>
              <Input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
              {errors.email && <Field.ErrorText>{errors.email}</Field.ErrorText>}
            </Field.Root>
            
            <Field.Root invalid={!!errors.password}>
              <Field.Label>Password</Field.Label>
              <Input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
              {errors.password && <Field.ErrorText>{errors.password}</Field.ErrorText>}
            </Field.Root>
            
            <Field.Root invalid={!!errors.confirmPassword}>
              <Field.Label>Confirm Password</Field.Label>
              <Input 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
              />
              {errors.confirmPassword && <Field.ErrorText>{errors.confirmPassword}</Field.ErrorText>}
            </Field.Root>
            
            <Button 
              type="submit" 
              width="full" 
              mt={4}
              loading={isLoading}
              bg="accent.DEFAULT"
              color="white"
              _hover={{ bg: "accent.emphasis" }}
            >
              Sign Up
            </Button>
          </Flex>
        </form>
        
        <Text mt={4} textAlign="center">
          Already have an account?{' '}
          <RouterLink to="/login">
            <Link color="accent.DEFAULT">
              Sign in here
            </Link>
          </RouterLink>
        </Text>
      </Box>
    </Flex>
  );
} 