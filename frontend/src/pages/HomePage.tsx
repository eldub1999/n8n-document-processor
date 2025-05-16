import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  return (
    <div className="py-12">
      <div className="flex flex-col items-center space-y-6 text-center">
        <h1 className="text-4xl font-bold md:text-5xl">
          Document Management System
        </h1>
        <p className="text-xl max-w-3xl mx-auto text-gray-600">
          A simple, secure way to store, organize, and share your documents.
        </p>
        
        {!user ? (
          <button 
            className="px-6 py-3 text-lg font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            onClick={() => navigate('/login')}
          >
            Get Started
          </button>
        ) : (
          <button 
            className="px-6 py-3 text-lg font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            onClick={() => navigate('/documents')}
          >
            View My Documents
          </button>
        )}
      </div>
    </div>
  );
} 