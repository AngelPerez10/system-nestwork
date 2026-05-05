import { useEffect, useMemo, useRef, useState } from "react";
import { apiUrl } from "@/config/api";
import { useAuth } from "@/context/AuthContext";

export function asBool(v: unknown, defaultValue: boolean) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true") return true;
    if (s === "false") return false;
  }
  return defaultValue;
}

export function useCotizacionPermissions(redirectOn401?: () => void) {
  const { permissions: authPermissions, isAdmin } = useAuth();
  const [permissions, setPermissions] = useState<any>(authPermissions || {});
  const redirectOn401Ref = useRef<typeof redirectOn401>(redirectOn401);

  useEffect(() => {
    redirectOn401Ref.current = redirectOn401;
  }, [redirectOn401]);

  useEffect(() => {
    setPermissions(authPermissions || {});
  }, [authPermissions]);

  useEffect(() => {
    const sync = () => {
      try {
        const raw = localStorage.getItem("permissions") || sessionStorage.getItem("permissions");
        setPermissions(raw ? JSON.parse(raw) : authPermissions || {});
      } catch {
        setPermissions(authPermissions || {});
      }
    };
    window.addEventListener("permissions:updated" as any, sync);
    return () => {
      window.removeEventListener("permissions:updated" as any, sync);
    };
  }, [authPermissions]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(apiUrl("/api/me/permissions/"), {
          method: "GET",
          cache: "no-store" as RequestCache,
        });
        if (res.status === 401) {
          redirectOn401Ref.current?.();
          return;
        }
        const data = await res.json().catch(() => null);
        if (!res.ok) return;
        const p = data?.permissions || {};
        try {
          const pStr = JSON.stringify(p);
          localStorage.setItem("permissions", pStr);
          sessionStorage.setItem("permissions", pStr);
        } catch {
          // ignore storage failures
        }
        setPermissions(p);
        window.dispatchEvent(new Event("permissions:updated"));
      } catch {
        // ignore
      }
    };
    void load();
  }, []);

  return useMemo(() => {
    const canCotizacionesView = isAdmin
      ? true
      : asBool(permissions?.cotizaciones?.view, true);
    const canCotizacionesCreate = isAdmin
      ? true
      : asBool(permissions?.cotizaciones?.create, false);
    const canCotizacionesEdit = isAdmin
      ? true
      : asBool(permissions?.cotizaciones?.edit, false);
    const canCotizacionesDelete = isAdmin
      ? true
      : asBool(permissions?.cotizaciones?.delete, false);
    return {
      permissions,
      canCotizacionesView,
      canCotizacionesCreate,
      canCotizacionesEdit,
      canCotizacionesDelete,
    };
  }, [isAdmin, permissions]);
}
