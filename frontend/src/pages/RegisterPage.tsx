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
    <div className="flex min-h-[70vh] items-center justify-center">
      <div 
        className="w-full max-w-md p-8 bg-white border border-zinc-200 rounded-lg shadow-md"
      >
        <h1 className="text-3xl font-bold text-center mb-6 text-zinc-800">
          Create Account
        </h1>
        
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-500' : 'border-zinc-300'}`}
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border-red-500' : 'border-zinc-300'}`}
              />
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Confirm Password</label>
              <input 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.confirmPassword ? 'border-red-500' : 'border-zinc-300'}`}
              />
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
            </div>
            
            <button 
              type="submit" 
              className={`w-full py-2 px-4 mt-4 bg-blue-600 text-white rounded-md font-medium ${isLoading ? 'opacity-70 cursor-wait' : 'hover:bg-blue-700'} transition-colors`}
              disabled={isLoading}
            >
              {isLoading ? 'Creating account...' : 'Sign Up'}
            </button>
          </div>
        </form>
        
        <p className="mt-4 text-center text-zinc-600">
          Already have an account?{' '}
          <RouterLink to="/login" className="text-blue-600 hover:text-blue-800">
            Sign in here
          </RouterLink>
        </p>
      </div>
    </div>
  );
} 