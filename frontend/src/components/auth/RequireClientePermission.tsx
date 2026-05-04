import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

type ClientePerm = 'view';

interface RequireClientePermissionProps {
  children: React.ReactNode;
  required: ClientePerm;
}

export default function RequireClientePermission({
  children,
  required,
}: RequireClientePermissionProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading, isAdmin, hasPermission } = useAuth();

  // Show loading spinner while checking auth state
  // Security: AuthContext validates httpOnly cookies via /api/me/
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600" role="status" aria-label="Verificando permisos de acceso"></div>
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
  const allowed = hasPermission('clientes', required);

  if (!allowed) {
    return <Navigate to="/operador/dashboard" replace />;
  }

  return <>{children}</>;
}
