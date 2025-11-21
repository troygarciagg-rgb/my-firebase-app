import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children, requiredRole }) {
  const { currentUser, userRole, emailVerified } = useAuth();

  // Check if user is logged in
  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // Check if email is verified (use Firebase Auth emailVerified)
  if (!emailVerified) {
    return <Navigate to="/verify-email" state={{ email: currentUser.email }} />;
  }

  // Check if user has the required role
  if (requiredRole && userRole !== requiredRole) {
    // Redirect based on role
    if (userRole === 'admin') return <Navigate to="/admin/dashboard" />;
    if (userRole === 'host') return <Navigate to="/host/dashboard" />;
    if (userRole === 'guest') return <Navigate to="/guest/home" />;
    return <Navigate to="/login" />;
  }

  return children;
}

