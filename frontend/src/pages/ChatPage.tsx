import { useAuth } from '../hooks/useAuth';
import Chat from '../components/Chat';
import { Navigate } from 'react-router-dom';

const ChatPage = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-60vh">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Chat />;
};

export default ChatPage; 