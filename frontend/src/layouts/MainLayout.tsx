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
    <Box minH="100vh" bg="bg.subtle">
      <Flex
        as="header"
        bg="bg.DEFAULT"
        color="fg.DEFAULT"
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
              color="accent.DEFAULT"
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
                      variant="ghost"
                      color="accent.DEFAULT"
                    >
                      My Documents
                    </Button>
                    <Button 
                      onClick={() => navigate('/upload')} 
                      color="white"
                      bg="accent.DEFAULT"
                      _hover={{ bg: "accent.emphasis" }}
                    >
                      Upload
                    </Button>
                    <Button 
                      onClick={handleSignOut} 
                      variant="outline"
                      borderColor="gray.300"
                    >
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      onClick={() => navigate('/login')} 
                      variant="outline"
                      borderColor="accent.DEFAULT"
                      color="accent.DEFAULT"
                    >
                      Sign In
                    </Button>
                    <Button 
                      onClick={() => navigate('/register')} 
                      color="white"
                      bg="accent.DEFAULT"
                      _hover={{ bg: "accent.emphasis" }}
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