import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '@/config/api';
import { clearClientAuthSession } from '@/utils/authSession';

export type AuthRole = 'superadmin' | 'admin' | 'tecnico' | null;
type EffectiveAuthRole = Exclude<AuthRole, null>;

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

const AUTH_STORAGE_KEYS = {
  USERNAME: 'auth_username',
  EMAIL: 'auth_email',
  ROLE: 'auth_role',
  IS_SUPERADMIN: 'auth_is_superadmin',
  PERMISSIONS: 'auth_permissions',
} as const;

const setStored = (key: string, value: string): void => {
  localStorage.setItem(key, value);
  sessionStorage.setItem(key, value);
};

const removeStored = (key: string): void => {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
};

function determineRole(userData: { platform_role?: string; is_superuser?: unknown; is_staff?: unknown }): EffectiveAuthRole {
  const platformRole = (userData.platform_role as string)?.toLowerCase();
  if (platformRole === 'superadmin' || userData.is_superuser) return 'superadmin';
  if (platformRole === 'admin_empresa' || userData.is_staff) return 'admin';
  return 'tecnico';
}

const DEFAULT_AUTH_STATE: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  role: null,
  isSuperadmin: false,
  isAdmin: false,
  username: null,
  email: null,
  user: null,
  permissions: null,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
let authBootstrapInFlight = false;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(DEFAULT_AUTH_STATE);
  const navigate = useNavigate();

  const login = async (data: LoginResponse) => {
    const role = determineRole(data);
    const isSuperadmin = role === 'superadmin';

    setStored(AUTH_STORAGE_KEYS.USERNAME, data.username);
    setStored(AUTH_STORAGE_KEYS.EMAIL, data.email);
    setStored(AUTH_STORAGE_KEYS.ROLE, role);
    setStored(AUTH_STORAGE_KEYS.IS_SUPERADMIN, String(isSuperadmin));

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
    try {
      await fetch(apiUrl('/api/logout/'), {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      /* network error — clear session anyway */
    }

    Object.values(AUTH_STORAGE_KEYS).forEach(removeStored);
    clearClientAuthSession();

    setAuthState({ ...DEFAULT_AUTH_STATE, isLoading: false });
    navigate('/signin', { replace: true });
  };

  const refreshToken = async () => {
    try {
      const response = await fetch(apiUrl('/api/token/refresh/'), {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) await logout();
        return;
      }

      setAuthState(prev => ({ ...prev, isAuthenticated: true }));
    } catch {
      /* network error — keep current session, backend will reject if tokens expired */
    }
  };

  const hasPermission = (module: string, action: string): boolean => {
    if (authState.isSuperadmin) return true;
    if (authState.isAdmin) return true;
    if (authState.permissions && typeof authState.permissions === 'object') {
      const m = (authState.permissions as Record<string, unknown>)[module];
      if (m && typeof m === 'object') return !!(m as Record<string, boolean>)[action];
    }
    return false;
  };

  useEffect(() => {
    let interval: number | null = null;
    const ME_POLL_MS = 5 * 60 * 1000;

    const clearAndReset = () => {
      Object.values(AUTH_STORAGE_KEYS).forEach(removeStored);
      clearClientAuthSession();
      setAuthState({ ...DEFAULT_AUTH_STATE, isLoading: false });
      if (interval != null) {
        window.clearInterval(interval);
        interval = null;
      }
    };

    const applyUserFromMe = (userData: Record<string, unknown>) => {
      const role = determineRole(userData);
      const isSuperadmin = role === 'superadmin';

      setStored(AUTH_STORAGE_KEYS.USERNAME, String(userData.username ?? ''));
      setStored(AUTH_STORAGE_KEYS.EMAIL, String(userData.email ?? ''));
      setStored(AUTH_STORAGE_KEYS.ROLE, role);
      setStored(AUTH_STORAGE_KEYS.IS_SUPERADMIN, String(isSuperadmin));

      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        role,
        isSuperadmin,
        isAdmin: role === 'admin' || isSuperadmin,
        username: userData.username != null ? String(userData.username) : null,
        email: userData.email != null ? String(userData.email) : null,
        user: userData,
        permissions: null,
      });

      if (interval == null) {
        interval = window.setInterval(checkAuth, ME_POLL_MS);
      }
    };

    const tryRecoverAfter401 = async (): Promise<boolean> => {
      try {
        const refResp = await fetch(apiUrl('/api/token/refresh/'), {
          method: 'POST',
          credentials: 'include',
        });
        if (!refResp.ok) return false;
        const meResp = await fetch(apiUrl('/api/me/'), {
          method: 'GET',
          credentials: 'include',
        });
        if (!meResp.ok) return false;
        const userData = await meResp.json() as Record<string, unknown>;
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

        if (typeof document !== 'undefined' && document.hidden && interval != null) return;

        const onSignInPage = window.location.pathname === '/signin';
        if (onSignInPage) {
          setAuthState(prev => ({ ...prev, isLoading: false }));
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
          const recovered = await tryRecoverAfter401();
          if (!recovered) clearAndReset();
        } else {
          clearAndReset();
        }
      } catch {
        // Network error — fail-closed: clear auth state to prevent stale sessions
        clearAndReset();
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
