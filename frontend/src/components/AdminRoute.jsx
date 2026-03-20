import { Navigate } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import Loader from './Loader';

export default function AdminRoute({ children }) {
  const { profile, loading } = useAuth();

  if (loading) {
    return <Loader text="Checking admin access..." />;
  }

  if (!profile) {
    return <Navigate to="/auth" replace />;
  }

  if (profile.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
