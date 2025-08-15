import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types';
import LoadingSpinner from "./LoadingSpinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: User['role'];
  requiredAuth?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredAuth = true,
}) => {
  const { state } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (state.isLoading) {
    return <LoadingSpinner />;
  }

  // Check if authentication is required
  if (requiredAuth && !state.isAuthenticated) {
    // Redirect to login with the current location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if specific role is required
  if (requiredRole && state.user?.role !== requiredRole) {
    // Redirect based on user role
    switch (state.user?.role) {
      case 'test_center_owner':
      case 'test_creator':
        return <Navigate to="/dashboard" replace />;
      case 'student':
        return <Navigate to="/test-selection" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  // User is authenticated and has the required role
  return <>{children}</>;
};

export default ProtectedRoute;
