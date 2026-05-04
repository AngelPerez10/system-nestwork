import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface RequireUsuariosViewProps {
  children: React.ReactNode;
}

/**
 * Requires explicit `usuarios.view` permission.
 * Should be used in conjunction with RequireAdmin for complete protection.
 */
export default function RequireUsuariosView({ children }: RequireUsuariosViewProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading, isAdmin, hasPermission } = useAuth();

  // Show loading spinner while checking auth state
  // Security: AuthContext validates httpOnly cookies via /api/me/
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600" role="status" aria-label="Verificando permisos de usuarios"></div>
      </div>
    );
  }

  // Redirect to signin if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Admins have all permissions
  if (isAdmin) {
    return <>{children}</>;
  }

  // Check explicit permission for non-admins
  const canView = hasPermission('usuarios', 'view');

  if (!canView) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
