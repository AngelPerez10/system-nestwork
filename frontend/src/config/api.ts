// API base: set VITE_API_BASE (or VITE_API_BASE_URL) at build time when the frontend and API
// are on different hosts (typical on Render: static *.onrender.com vs web service *.onrender.com).
// If unset in production, requests default to the same origin as the page — wrong for split deploys.

const isBrowser = typeof window !== "undefined";
const hostname = isBrowser ? window.location.hostname : "localhost";
const protocol = isBrowser ? window.location.protocol : "http:";
const port = isBrowser ? window.location.port : "";
const isLocal = isBrowser && (hostname === "localhost" || hostname === "127.0.0.1");
const isViteDev = isBrowser && (port === "5173" || port === "4173");
const devTenant = (import.meta.env.VITE_DEV_TENANT as string | undefined) || "netswork";
const devTenantDomain = (import.meta.env.VITE_TENANT_DEV_DOMAIN as string | undefined) || "localtest.me";

const isIPv4 = (value: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(value);
const looksTenantHost = (value: string) =>
  value.includes(".") && !isIPv4(value) && value !== "localhost" && value !== "127.0.0.1";
const resolveDevTenantHost = () => {
  if (!isBrowser) return `${devTenant}.${devTenantDomain}`;
  if (looksTenantHost(hostname)) return hostname;
  return `${devTenant}.${devTenantDomain}`;
};

const stripTrailingSlash = (s: string) => s.replace(/\/$/, "");

const explicitFromEnv = stripTrailingSlash(
  `${(import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_BASE_URL || "").trim()}`
);
const hasExplicitApiBase = explicitFromEnv.length > 0;

const defaultSameOriginBase = stripTrailingSlash(
  `${protocol}//${hostname}${port ? `:${port}` : ""}`
);

const DEFAULT_API_BASE = isBrowser
  ? isLocal
    ? `${protocol}//${resolveDevTenantHost()}:8000`
    : isViteDev
      ? `${protocol}//${resolveDevTenantHost()}:8000`
      : defaultSameOriginBase
  : "http://localhost:8000";

export const API_BASE = stripTrailingSlash(hasExplicitApiBase ? explicitFromEnv : DEFAULT_API_BASE);

if (
  isBrowser &&
  import.meta.env.PROD &&
  !hasExplicitApiBase &&
  !isLocal &&
  !isViteDev &&
  hostname.endsWith(".onrender.com")
) {
  console.error(
    "[NestWork] Falta VITE_API_BASE: el bundle está llamando al mismo host que el front (" +
      window.location.origin +
      "). Añade en Render (Static Site → Environment) VITE_API_BASE=https://TU-SERVICIO-API.onrender.com y redeploy del front."
  );
}

export const apiUrl = (path: string) => {
  if (!path.startsWith("/")) path = "/" + path;
  return `${API_BASE}${path}`;
};

/** URLs absolutas (p. ej. Cloudinary) se devuelven tal cual; rutas /media/... se resuelven contra el API. */
export function resolveMediaUrl(url: string | null | undefined): string {
  const u = (url || "").trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return apiUrl(u.startsWith("/") ? u : `/${u}`);
}
export const PUBLIC_ORIGIN = (import.meta.env.VITE_PUBLIC_ORIGIN || (isBrowser ? window.location.origin : "")).replace(
  /\/$/,
  ""
);
export const publicUrl = (path: string) => `${PUBLIC_ORIGIN}${path}`;

/**
 * Auth headers for API requests.
 * With httpOnly cookie-based auth, no Authorization header is needed —
 * the fetch interceptor in authSession.ts adds credentials: 'include'
 * which sends cookies automatically.
 *
 * This function exists for backwards compatibility and returns empty headers.
 */
export const getAuthHeaders = (): Record<string, string> => ({});
