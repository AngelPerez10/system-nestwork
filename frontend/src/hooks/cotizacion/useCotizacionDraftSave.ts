import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/config/api";

type AlertPayload = {
  show: boolean;
  variant: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
};

type SaveOptions = {
  navigateAfterSave?: boolean;
  validateRequired?: boolean;
  silent?: boolean;
  autosave?: boolean;
};

type Params<TPayload> = {
  editingCotizacionId: string;
  activeCotizacionId: string;
  hydratingFromStorage: boolean;
  clienteId: number | null;
  clienteSearch: string;
  contactoNombre: string;
  medioContacto: string;
  status: string;
  descuentoClientePct: number;
  conceptos: unknown[];
  textoArribaPrecios: string;
  terminos: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  getToken: () => string;
  validateRequired: () => { ok: boolean; missing: string[] };
  buildPayload: () => TPayload;
  onSaved: (savedId: string, idx: number | null) => void;
  navigateToList: () => void;
  setAlert: (a: AlertPayload) => void;
};

export function useCotizacionDraftSave<TPayload>(params: Params<TPayload>) {
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<number | null>(null);

  const upsertCotizacion = useCallback(async (opts?: SaveOptions): Promise<string | null> => {
    const navigateAfterSave = !!opts?.navigateAfterSave;
    const validate = opts?.validateRequired !== false;
    const silent = !!opts?.silent;
    const autosave = !!opts?.autosave;
    const targetId = (params.editingCotizacionId || params.activeCotizacionId || "").trim();

    if (!params.canView) {
      if (!silent) params.setAlert({ show: true, variant: "warning", title: "Sin permiso", message: "No tienes permiso para ver cotizaciones." });
      return null;
    }
    if (targetId ? !params.canEdit : !params.canCreate) {
      if (!silent) {
        params.setAlert({
          show: true,
          variant: "warning",
          title: "Sin permiso",
          message: targetId ? "No tienes permiso para editar cotizaciones." : "No tienes permiso para crear cotizaciones.",
        });
      }
      return null;
    }
    if (validate) {
      const v = params.validateRequired();
      if (!v.ok) {
        if (!silent) params.setAlert({ show: true, variant: "warning", title: "Faltan datos", message: `Completa: ${v.missing.join(", ")}.` });
        return null;
      }
      if (!params.conceptos.length) {
        if (!silent) params.setAlert({ show: true, variant: "warning", title: "Faltan conceptos", message: "Agrega al menos un producto o servicio para guardar la cotización." });
        return null;
      }
    }

    const token = params.getToken();
    if (!token) return null;

    try {
      if (autosave) setIsAutoSaving(true);
      const isEdit = !!targetId;
      const res = await fetch(apiUrl(isEdit ? `/api/cotizaciones/${targetId}/` : "/api/cotizaciones/"), {
        method: isEdit ? "PUT" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params.buildPayload()),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (!silent) params.setAlert({ show: true, variant: "error", title: "Error", message: data?.detail || JSON.stringify(data) || "No se pudo guardar la cotización." });
        return null;
      }
      const savedId = String(data?.id || targetId || "").trim();
      params.onSaved(savedId, Number.isFinite(Number(data?.idx)) ? Number(data.idx) : null);
      if (autosave) {
        setLastAutoSavedAt(Date.now());
      } else if (!silent) {
        params.setAlert({
          show: true,
          variant: "success",
          title: isEdit ? "Cotización actualizada" : "Cotización guardada",
          message: `Folio #${data?.idx || data?.id || ""} guardado correctamente.`,
        });
      }
      if (navigateAfterSave) window.setTimeout(() => params.navigateToList(), 350);
      return savedId || null;
    } catch {
      if (!silent) params.setAlert({ show: true, variant: "error", title: "Error", message: "No se pudo guardar la cotización." });
      return null;
    } finally {
      if (autosave) setIsAutoSaving(false);
    }
  }, [params]);

  useEffect(() => {
    const targetId = (params.editingCotizacionId || params.activeCotizacionId || "").trim();
    if (!targetId || params.hydratingFromStorage) return;
    const timer = window.setTimeout(() => {
      void upsertCotizacion({ navigateAfterSave: false, validateRequired: false, silent: true, autosave: true });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [
    params.editingCotizacionId,
    params.activeCotizacionId,
    params.hydratingFromStorage,
    params.clienteId,
    params.clienteSearch,
    params.contactoNombre,
    params.medioContacto,
    params.status,
    params.descuentoClientePct,
    params.conceptos,
    params.textoArribaPrecios,
    params.terminos,
    upsertCotizacion,
  ]);

  useEffect(() => {
    const onBeforeUnload = () => {
      const targetId = (params.editingCotizacionId || params.activeCotizacionId || "").trim();
      const token = params.getToken();
      if (!targetId || !token) return;
      try {
        void fetch(apiUrl(`/api/cotizaciones/${targetId}/`), {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params.buildPayload()),
          keepalive: true,
        });
      } catch {
        // ignore
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [params.editingCotizacionId, params.activeCotizacionId, params.buildPayload, params.getToken]);

  const saveCotizacion = useCallback(
    (navigateAfterSave = true) =>
      upsertCotizacion({ navigateAfterSave, validateRequired: true, silent: false, autosave: false }),
    [upsertCotizacion]
  );

  return {
    isAutoSaving,
    lastAutoSavedAt,
    saveCotizacion,
    upsertCotizacion,
  };
}
