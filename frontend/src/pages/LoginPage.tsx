import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { signInWithEmail } from '../services/authService';
import { toaster } from '../services/toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{email?: string, password?: string, auth?: string}>({});
  
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
    console.log('Attempting login with:', { email }); // Don't log password
    
    try {
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
      console.log('Supabase Anon Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
      
      const response = await signInWithEmail(email, password);
      console.log('Login response:', response);
      
      if (response.session) {
        console.log('Login successful, navigating to /documents');
        navigate('/documents');
      } else {
        console.error('No session returned after login');
        setErrors({ auth: 'Authentication failed - no session returned' });
      }
    } catch (error) {
      console.error('Login error:', error);
      toaster.create({
        title: 'Error signing in',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
      setErrors({ 
        auth: error instanceof Error 
          ? error.message
          : 'Unknown authentication error' 
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div 
        className="w-full max-w-md p-8 bg-white border border-zinc-200 rounded-lg shadow-md"
      >
        <h1 className="text-3xl font-bold text-center mb-6 text-zinc-800">
          Sign In
        </h1>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-500' : 'border-zinc-300'}`}
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border-red-500' : 'border-zinc-300'}`}
            />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
          </div>
          
          {errors.auth && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.auth}</p>
            </div>
          )}
          
          <button 
            type="submit" 
            className={`w-full py-2 px-4 bg-blue-600 text-white rounded-md font-medium ${isLoading ? 'opacity-70 cursor-wait' : 'hover:bg-blue-700'} transition-colors`}
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <p className="mt-4 text-center text-zinc-600">
          Don't have an account?{' '}
          <RouterLink to="/register" className="text-blue-600 hover:text-blue-800">
            Register here
          </RouterLink>
        </p>
      </div>
    </div>
  );
} 