import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '@/config/api';
import { clearClientAuthSession } from '@/utils/authSession';

export type AuthRole = 'superadmin' | 'admin' | 'tecnico' | null;

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  role: AuthRole;
  isSuperadmin: boolean;
  isAdmin: boolean;
  username: string | null;
  email: string | null;
  user: Record<string, unknown> | null;
  permissions: Record<string, unknown> | null;
}

export interface AuthContextType extends AuthState {
  login: (data: LoginResponse) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  hasPermission: (module: string, action: string) => boolean;
}

interface LoginResponse {
  username: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
  role: string;
  platform_role?: string;
}

// Security: Tokens are now stored in httpOnly cookies, not in localStorage
// This prevents XSS attacks from stealing tokens
const AUTH_STORAGE_KEYS = {
  USERNAME: 'auth_username',
  EMAIL: 'auth_email',
  ROLE: 'auth_role',
  IS_SUPERADMIN: 'auth_is_superadmin',
  PERMISSIONS: 'auth_permissions',
} as const;

const getStoredItem = (key: string): string | null => {
  return localStorage.getItem(key) || sessionStorage.getItem(key);
};

const setStoredItem = (key: string, value: string): void => {
  localStorage.setItem(key, value);
  sessionStorage.setItem(key, value);
};

const removeStoredItem = (key: string): void => {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
};

const getInitialAuthState = (): AuthState => {
  const role = getStoredItem(AUTH_STORAGE_KEYS.ROLE) as AuthRole;
  const isSuperadmin = getStoredItem(AUTH_STORAGE_KEYS.IS_SUPERADMIN) === 'true';
  
  return {
    isAuthenticated: false,  // Will be determined by backend check
    isLoading: true,
    role: role || null,
    isSuperadmin,
    isAdmin: role === 'admin' || isSuperadmin,
    username: getStoredItem(AUTH_STORAGE_KEYS.USERNAME),
    email: getStoredItem(AUTH_STORAGE_KEYS.EMAIL),
    user: null,
    permissions: null,
  };
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
let authBootstrapInFlight = false;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(getInitialAuthState);
  const navigate = useNavigate();

  const login = async (data: LoginResponse) => {
    const role = data.platform_role?.toLowerCase() === 'superadmin' || data.is_superuser
      ? 'superadmin'
      : data.role?.toLowerCase() === 'admin' || data.is_staff
        ? 'admin'
        : 'tecnico';

    const isSuperadmin = role === 'superadmin';

    // Security: Tokens are stored in httpOnly cookies by backend
    // Only store non-sensitive user data in localStorage
    setStoredItem(AUTH_STORAGE_KEYS.USERNAME, data.username);
    setStoredItem(AUTH_STORAGE_KEYS.EMAIL, data.email);
    setStoredItem(AUTH_STORAGE_KEYS.ROLE, role);
    setStoredItem(AUTH_STORAGE_KEYS.IS_SUPERADMIN, String(isSuperadmin));

    setAuthState({
      isAuthenticated: true,
      isLoading: false,
      role,
      isSuperadmin,
      isAdmin: role === 'admin' || isSuperadmin,
      username: data.username,
      email: data.email,
      user: data as unknown as Record<string, unknown>,
      permissions: null,
    });
  };

  const logout = async () => {
    // Call backend to blacklist tokens and clear cookies
    try {
      await fetch(apiUrl('/api/logout/'), {
        method: 'POST',
        credentials: 'include',  // Send cookies
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Clear all auth storage
    Object.values(AUTH_STORAGE_KEYS).forEach(key => removeStoredItem(key));
    
    // Clear legacy keys
    ['auth_token', 'token', 'refresh_token', 'username', 'user', 'is_superuser', 'role', 'permissions', 'permissions_fetched_at']
      .forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      role: null,
      isSuperadmin: false,
      isAdmin: false,
      username: null,
      email: null,
      user: null,
      permissions: null,
    });

    navigate('/signin', { replace: true });
  };

  const refreshToken = async () => {
    try {
      const response = await fetch(apiUrl('/api/token/refresh/'), {
        method: 'POST',
        credentials: 'include',  // Send refresh token cookie
      });

      if (!response.ok) {
        if (response.status === 401) {
          await logout();
        }
        return;
      }

      setAuthState(prev => ({
        ...prev,
        isAuthenticated: true,
      }));
    } catch (error) {
      console.error('Failed to refresh token:', error);
      // Network / transport errors: do not clear session (same as /api/me/).
    }
  };

  const hasPermission = (module: string, action: string): boolean => {
    // Superadmins have all permissions
    if (authState.isSuperadmin) return true;
    
    // Admins have most permissions
    if (authState.isAdmin) return true;
    
    // For technicians, check permissions object
    if (authState.permissions && typeof authState.permissions === 'object') {
      const modulePerms = authState.permissions[module as keyof typeof authState.permissions];
      if (modulePerms && typeof modulePerms === 'object') {
        return !!(modulePerms as Record<string, boolean>)[action];
      }
    }
    
    return false;
  };

  // Check authentication status on mount and periodically
  // Security: Tokens are in httpOnly cookies, so we check with backend
  useEffect(() => {
    let interval: number | null = null;
    const ME_POLL_MS = 5 * 60 * 1000;

    const clearUnauthenticated = () => {
      Object.values(AUTH_STORAGE_KEYS).forEach((key) => removeStoredItem(key));
      clearClientAuthSession();
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: false,
        isLoading: false,
        role: null,
        isSuperadmin: false,
        isAdmin: false,
        username: null,
        email: null,
        user: null,
      }));
      if (interval != null) {
        window.clearInterval(interval);
        interval = null;
      }
    };

    const applyUserFromMe = (userData: Record<string, unknown>) => {
      const role = (userData.platform_role as string | undefined)?.toLowerCase() === 'superadmin' || userData.is_superuser
        ? 'superadmin'
        : (userData.role as string | undefined)?.toLowerCase() === 'admin' || userData.is_staff
          ? 'admin'
          : 'tecnico';

      const isSuperadmin = role === 'superadmin';

      setStoredItem(AUTH_STORAGE_KEYS.USERNAME, String(userData.username ?? ''));
      setStoredItem(AUTH_STORAGE_KEYS.EMAIL, String(userData.email ?? ''));
      setStoredItem(AUTH_STORAGE_KEYS.ROLE, role);
      setStoredItem(AUTH_STORAGE_KEYS.IS_SUPERADMIN, String(isSuperadmin));

      setAuthState(prev => ({
        ...prev,
        isAuthenticated: true,
        isLoading: false,
        role,
        isSuperadmin,
        isAdmin: role === 'admin' || isSuperadmin,
        username: userData.username != null ? String(userData.username) : null,
        email: userData.email != null ? String(userData.email) : null,
        user: userData,
      }));

      if (interval == null) {
        interval = window.setInterval(checkAuth, ME_POLL_MS);
      }
    };

    const tryRecoverSessionAfter401 = async (): Promise<boolean> => {
      try {
        const rRef = await fetch(apiUrl('/api/token/refresh/'), {
          method: 'POST',
          credentials: 'include',
        });
        if (!rRef.ok) return false;
        const rMe = await fetch(apiUrl('/api/me/'), {
          method: 'GET',
          credentials: 'include',
        });
        if (!rMe.ok) return false;
        const userData = await rMe.json() as Record<string, unknown>;
        applyUserFromMe(userData);
        return true;
      } catch {
        return false;
      }
    };

    const checkAuth = async () => {
      if (authBootstrapInFlight) return;
      try {
        authBootstrapInFlight = true;

        if (typeof document !== 'undefined' && document.hidden && interval != null) {
          return;
        }

        const onSignInPage = window.location.pathname === '/signin';
        const hasStoredSessionHint = Boolean(
          getStoredItem(AUTH_STORAGE_KEYS.USERNAME) ||
          getStoredItem(AUTH_STORAGE_KEYS.ROLE) ||
          getStoredItem(AUTH_STORAGE_KEYS.IS_SUPERADMIN)
        );
        if (onSignInPage && !hasStoredSessionHint) {
          setAuthState(prev => ({ ...prev, isLoading: false, isAuthenticated: false }));
          return;
        }

        const response = await fetch(apiUrl('/api/me/'), {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const userData = await response.json() as Record<string, unknown>;
          applyUserFromMe(userData);
        } else if (response.status === 401) {
          const recovered = await tryRecoverSessionAfter401();
          if (!recovered) {
            clearUnauthenticated();
          }
        } else {
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            isAuthenticated: prev.isAuthenticated,
          }));
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          isAuthenticated: prev.isAuthenticated,
        }));
      } finally {
        authBootstrapInFlight = false;
      }
    };

    checkAuth();
    return () => {
      if (interval != null) window.clearInterval(interval);
    };
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    ...authState,
    login,
    logout,
    refreshToken,
    hasPermission,
  }), [authState]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
