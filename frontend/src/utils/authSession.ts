import { API_BASE } from "@/config/api";

/** Claves que el login y el menú de usuario usan para la sesión (solo datos no sensibles). */
const SESSION_KEYS = [
  "username",
  "user",
  "is_superuser",
  "role",
  "permissions",
  "permissions_fetched_at",
] as const;

// Security: Tokens are now stored in httpOnly cookies, not in localStorage
// These functions only clear non-sensitive user data

export function clearClientAuthSession(): void {
  for (const k of SESSION_KEYS) {
    try {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
}

// Security: With httpOnly cookies, we can't check token validity from client
// This function is deprecated - use AuthContext to check authentication
export function hasValidSessionToken(): boolean {
  // Cookies are automatically sent with requests
  // Backend will validate them
  return true;
}

function resolveRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return new URL(input, window.location.origin).href;
  }
  if (input instanceof URL) return input.href;
  if (input instanceof Request) return input.url;
  return "";
}

function pathnameOfRequest(input: RequestInfo | URL): string {
  try {
    return new URL(resolveRequestUrl(input)).pathname;
  } catch {
    return "";
  }
}

function isOurBackendApiRequest(input: RequestInfo | URL): boolean {
  const href = resolveRequestUrl(input);
  const base = API_BASE.replace(/\/$/, "");
  return href.startsWith(`${base}/`) || href === base;
}

function shouldIgnore401ForPath(pathname: string): boolean {
  if (pathname.endsWith("/api/login/") || pathname === "/api/login") return true;
  // Allow 401 on logout (expected)
  if (pathname.endsWith("/api/logout/") || pathname === "/api/logout") return true;
  return false;
}

let redirectScheduled = false;

/**
 * Tras un 401 en la API del backend, limpia sesión y envía a /signin.
 * Security: Uses credentials: 'include' to send httpOnly cookies.
 */
export function installApi401UnauthorizedHandler(): void {
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // Ensure credentials are included for cookie-based auth
    const newInit: RequestInit = {
      ...init,
      credentials: init?.credentials || 'include',
    };
    
    const response = await original(input, newInit);
    if (response.status !== 401) return response;
    if (!isOurBackendApiRequest(input)) return response;

    const pathname = pathnameOfRequest(input);
    if (shouldIgnore401ForPath(pathname)) return response;

    if (!redirectScheduled) {
      redirectScheduled = true;
      clearClientAuthSession();
      window.location.assign("/signin");
    }
    return response;
  };
}
