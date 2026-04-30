import { useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

/**
 * Hook for checking user permissions with proper authorization hierarchy.
 * 
 * Authorization flow:
 * 1. Superadmins always have all permissions (short-circuit)
 * 2. Admins have all permissions by default (short-circuit)
 * 3. Technicians must check explicit permissions object
 * 
 * @param module - Module name (e.g., 'clientes', 'usuarios', 'cotizaciones')
 * @param action - Action name (e.g., 'view', 'create', 'edit', 'delete')
 * @returns boolean indicating if user has permission
 * 
 * @example
 * const canViewClients = useHasPermission('clientes', 'view');
 * const canCreateQuotes = useHasPermission('cotizaciones', 'create');
 */
export function useHasPermission() {
  const { isSuperadmin, isAdmin, permissions } = useAuth();

  const hasPermission = useCallback((module: string, action: string): boolean => {
    // Superadmins and admins have all permissions
    if (isSuperadmin || isAdmin) {
      return true;
    }

    // For technicians, check explicit permissions
    if (permissions && typeof permissions === 'object') {
      const modulePerms = permissions[module as keyof typeof permissions];
      if (modulePerms && typeof modulePerms === 'object') {
        return !!(modulePerms as Record<string, boolean>)[action];
      }
    }

    return false;
  }, [isSuperadmin, isAdmin, permissions]);

  // Return memoized helper functions for common permission checks
  return {
    /** Check any permission */
    can: hasPermission,
    
    /** Check clientes permissions */
    clientes: {
      view: () => hasPermission('clientes', 'view'),
      create: () => hasPermission('clientes', 'create'),
      edit: () => hasPermission('clientes', 'edit'),
      delete: () => hasPermission('clientes', 'delete'),
    },
    
    /** Check usuarios permissions */
    usuarios: {
      view: () => hasPermission('usuarios', 'view'),
      create: () => hasPermission('usuarios', 'create'),
      edit: () => hasPermission('usuarios', 'edit'),
      delete: () => hasPermission('usuarios', 'delete'),
    },
    
    /** Check cotizaciones permissions */
    cotizaciones: {
      view: () => hasPermission('cotizaciones', 'view'),
      create: () => hasPermission('cotizaciones', 'create'),
      edit: () => hasPermission('cotizaciones', 'edit'),
      delete: () => hasPermission('cotizaciones', 'delete'),
    },
    
    /** Check ordenes permissions */
    ordenes: {
      view: () => hasPermission('ordenes', 'view'),
      create: () => hasPermission('ordenes', 'create'),
      edit: () => hasPermission('ordenes', 'edit'),
      delete: () => hasPermission('ordenes', 'delete'),
    },
    
    /** Check productos permissions */
    productos: {
      view: () => hasPermission('productos', 'view'),
      create: () => hasPermission('productos', 'create'),
      edit: () => hasPermission('productos', 'edit'),
      delete: () => hasPermission('productos', 'delete'),
    },
    
    /** Check servicios permissions */
    servicios: {
      view: () => hasPermission('servicios', 'view'),
      create: () => hasPermission('servicios', 'create'),
      edit: () => hasPermission('servicios', 'edit'),
      delete: () => hasPermission('servicios', 'delete'),
    },
    
    /** Check tareas permissions */
    tareas: {
      view: () => hasPermission('tareas', 'view'),
      create: () => hasPermission('tareas', 'create'),
      edit: () => hasPermission('tareas', 'edit'),
      delete: () => hasPermission('tareas', 'delete'),
    },
    
    /** Check reportes permissions */
    reportes: {
      view: () => hasPermission('reportes', 'view'),
      create: () => hasPermission('reportes', 'create'),
      edit: () => hasPermission('reportes', 'edit'),
      delete: () => hasPermission('reportes', 'delete'),
    },
  };
}
