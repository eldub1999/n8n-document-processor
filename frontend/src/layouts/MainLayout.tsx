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
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white text-zinc-800 py-4 px-6 border-b border-zinc-200 shadow-sm">
        <div className="container mx-auto max-w-7xl">
          <div className="flex items-center justify-between w-full">
            <h1 
              className="text-2xl font-bold text-blue-600 cursor-pointer"
              onClick={() => navigate('/')}
            >
              Document Manager
            </h1>
            
            {!loading && (
              <div className="flex gap-4">
                {user ? (
                  <>
                    <button 
                      onClick={() => navigate('/documents')} 
                      className="px-4 py-2 text-blue-600 hover:bg-zinc-100 rounded-md transition-colors"
                    >
                      My Documents
                    </button>
                    <button 
                      onClick={() => navigate('/chat')} 
                      className="px-4 py-2 text-blue-600 hover:bg-zinc-100 rounded-md transition-colors"
                    >
                      AI Chat
                    </button>
                    <button 
                      onClick={() => navigate('/upload')} 
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Upload
                    </button>
                    <button 
                      onClick={handleSignOut} 
                      className="px-4 py-2 border border-zinc-300 rounded-md hover:bg-zinc-100 transition-colors"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => navigate('/login')} 
                      className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                    >
                      Sign In
                    </button>
                    <button 
                      onClick={() => navigate('/register')} 
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Register
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
      
      <main className="container mx-auto max-w-7xl py-8 px-4 md:px-6">
        <Outlet />
      </main>
    </div>
  );
} 