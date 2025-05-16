import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();
  
  return (
    <div className="text-center py-20">
      <h1 className="text-5xl font-bold mb-4">
        404
      </h1>
      <p className="text-xl mb-8 text-gray-600">
        Page not found
      </p>
      <button 
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        onClick={() => navigate('/')}
      >
        Go Home
      </button>
    </div>
  );
} 