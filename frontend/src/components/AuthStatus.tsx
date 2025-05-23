import { useAuth } from '../hooks/useAuth';

const AuthStatus = () => {
  const { user, session, loading } = useAuth();

  if (loading) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-yellow-700">Loading authentication status...</p>
      </div>
    );
  }

  if (!user || !session) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <h3 className="text-red-800 font-medium">Not Authenticated</h3>
        <p className="text-red-700 text-sm mt-2">
          You must be logged in to upload documents. Please sign in to continue.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
      <h3 className="text-green-800 font-medium">Authenticated</h3>
      <div className="text-green-700 text-sm mt-2 space-y-1">
        <p><strong>User ID:</strong> {user.id}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Session expires:</strong> {new Date(session.expires_at! * 1000).toLocaleString()}</p>
      </div>
    </div>
  );
};

export default AuthStatus; 