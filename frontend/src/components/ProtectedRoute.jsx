import { Navigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import Loader from './Loader';

export default function ProtectedRoute({ children }) {
  const { profile, session, loading } = useAuth();

  if (loading || (session && !profile)) {
    return <Loader text="Checking authentication..." />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
