import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface RequireAdminProps {
  children: React.ReactNode;
}

export default function RequireAdmin({ children }: RequireAdminProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  // Show loading spinner while checking auth state
  // Security: AuthContext validates httpOnly cookies via /api/me/
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600" role="status" aria-label="Verificando permisos de administrador"></div>
      </div>
    );
  }

  // Redirect to signin if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Redirect non-admins to operator dashboard
  if (!isAdmin) {
    return <Navigate to="/operador/dashboard" replace />;
  }

  return <>{children}</>;
}
