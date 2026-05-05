import { useCallback, useEffect, useMemo, useState } from "react";
import { apiUrl, getAuthHeaders } from "@/config/api";

export interface OrdenesPermissions {
  ordenes?: {
    view?: boolean;
    create?: boolean;
    edit?: boolean;
    delete?: boolean;
  };
}

interface UseOrdenesBootstrapParams {
  throttleKey: string;
  loadServicios: boolean;
}

const THROTTLE_MS = 800;
const lastLoadByKey: Record<string, number> = {};

const canRunByThrottle = (key: string) => {
  const now = Date.now();
  const last = lastLoadByKey[key] ?? 0;
  if (now - last < THROTTLE_MS) return false;
  lastLoadByKey[key] = now;
  return true;
};

const getPermissionsFromStorage = (): OrdenesPermissions => {
  try {
    const raw = localStorage.getItem("permissions") || sessionStorage.getItem("permissions");
    return raw ? (JSON.parse(raw) as OrdenesPermissions) : {};
  } catch {
    return {};
  }
};

export function useOrdenesBootstrap({ throttleKey, loadServicios }: UseOrdenesBootstrapParams) {
  const [permissions, setPermissions] = useState<OrdenesPermissions>(() => getPermissionsFromStorage());
  const [mySignatureUrl, setMySignatureUrl] = useState("");
  const [serviciosDisponibles, setServiciosDisponibles] = useState<string[]>([]);

  const syncPermissions = useCallback(async () => {
    if (!canRunByThrottle(`${throttleKey}:permissions`)) return;
    try {
      const res = await fetch(apiUrl("/api/me/permissions/"), {
        method: "GET",
        headers: { ...getAuthHeaders() },
        cache: "no-store" as RequestCache,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return;
      const p = data?.permissions || {};
      const serialized = JSON.stringify(p);
      localStorage.setItem("permissions", serialized);
      sessionStorage.setItem("permissions", serialized);
      setPermissions(p);
    } catch {
      // Ignore transient permission sync failures.
    }
  }, [throttleKey]);

  const syncSignature = useCallback(async () => {
    if (!canRunByThrottle(`${throttleKey}:signature`)) return;
    try {
      const res = await fetch(apiUrl("/api/me/signature/"), {
        method: "GET",
        headers: { ...getAuthHeaders() },
        cache: "no-store" as RequestCache,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return;
      setMySignatureUrl(data?.url || "");
    } catch {
      // Ignore signature fetch failures.
    }
  }, [throttleKey]);

  const syncServicios = useCallback(async () => {
    if (!loadServicios) return;
    if (!canRunByThrottle(`${throttleKey}:servicios`)) return;
    try {
      const res = await fetch(apiUrl("/api/servicios/?page=1&page_size=500&ordering=idx"), {
        method: "GET",
        headers: { ...getAuthHeaders() },
        cache: "no-store" as RequestCache,
      });
      const data = (await res.json().catch(() => null)) as { results?: unknown } | null;
      if (!res.ok) {
        setServiciosDisponibles([]);
        return;
      }
      type ServicioRow = { nombre?: string; activo?: boolean };
      const rawResults = Array.isArray(data?.results) ? data.results : [];
      const results = rawResults as ServicioRow[];
      const names: string[] = results
        .filter((s) => s != null && typeof s.nombre === "string" && s.nombre.trim() && s.activo !== false)
        .map((s) => String(s.nombre).trim());
      const merged = Array.from(new Set(names));
      setServiciosDisponibles(merged);
      localStorage.setItem("servicios_disponibles", JSON.stringify(merged));
    } catch {
      setServiciosDisponibles([]);
    }
  }, [loadServicios, throttleKey]);

  useEffect(() => {
    const sync = () => setPermissions(getPermissionsFromStorage());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  useEffect(() => {
    syncPermissions();
  }, [syncPermissions]);

  useEffect(() => {
    syncSignature();
  }, [syncSignature]);

  useEffect(() => {
    syncServicios();
  }, [syncServicios]);

  const capabilities = useMemo(
    () => ({
      canOrdenesView: permissions?.ordenes?.view !== false,
      canOrdenesCreate: !!permissions?.ordenes?.create,
      canOrdenesEdit: !!permissions?.ordenes?.edit,
      canOrdenesDelete: !!permissions?.ordenes?.delete,
    }),
    [permissions],
  );

  return {
    permissions,
    setPermissions,
    mySignatureUrl,
    serviciosDisponibles,
    setServiciosDisponibles,
    ...capabilities,
  };
}
