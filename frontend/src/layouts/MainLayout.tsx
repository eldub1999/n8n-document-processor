import { Box, Container, Flex, Heading, Button } from '@chakra-ui/react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { signOut } from '../services/authService';

export function MainLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  return (
    <Box minH="100vh" bg="gray.50">
      <Flex
        as="header"
        bg="white"
        color="gray.800"
        py={4}
        px={6}
        borderBottom="1px"
        borderColor="gray.200"
        boxShadow="sm"
      >
        <Container maxW="container.xl">
          <Flex align="center" justify="space-between" w="full">
            <Heading 
              size="lg" 
              fontWeight="bold"
              color="blue.600"
              onClick={() => navigate('/')}
              cursor="pointer"
            >
              Document Manager
            </Heading>
            
            {!loading && (
              <Flex gap={4}>
                {user ? (
                  <>
                    <Button 
                      onClick={() => navigate('/documents')} 
                      colorScheme="blue" 
                      variant="ghost"
                    >
                      My Documents
                    </Button>
                    <Button 
                      onClick={() => navigate('/upload')} 
                      colorScheme="blue"
                    >
                      Upload
                    </Button>
                    <Button onClick={handleSignOut} variant="outline">
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      onClick={() => navigate('/login')} 
                      colorScheme="blue" 
                      variant="outline"
                    >
                      Sign In
                    </Button>
                    <Button 
                      onClick={() => navigate('/register')} 
                      colorScheme="blue"
                    >
                      Register
                    </Button>
                  </>
                )}
              </Flex>
            )}
          </Flex>
        </Container>
      </Flex>
      
      <Container 
        as="main" 
        maxW="container.xl" 
        py={8} 
        px={{ base: 4, md: 6 }}
      >
        <Outlet />
      </Container>
    </Box>
  );
} 