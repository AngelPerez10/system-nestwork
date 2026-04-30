import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

type CotizacionPerm = 'view' | 'create' | 'edit';

interface RequireCotizacionPermissionProps {
  children: React.ReactNode;
  required: CotizacionPerm;
}

export default function RequireCotizacionPermission({
  children,
  required,
}: RequireCotizacionPermissionProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading, isAdmin, hasPermission } = useAuth();

  // Show nothing while loading auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
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
  const allowed = hasPermission('cotizaciones', required);

  if (!allowed) {
    return <Navigate to="/operador/dashboard" replace />;
  }

  return <>{children}</>;
}
