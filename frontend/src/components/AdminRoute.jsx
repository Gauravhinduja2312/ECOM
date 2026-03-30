import { Navigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import Loader from './Loader';

export default function AdminRoute({ children }) {
  const { session, profile, loading } = useAuth();

  if (loading || (session && !profile)) {
    return <Loader text="Checking admin access..." />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (profile.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
