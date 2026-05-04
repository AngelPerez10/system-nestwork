import PageMeta from "@/components/common/PageMeta";
import ComponentCard from "@/components/common/ComponentCard";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "@/components/ui/modal";
import { apiUrl } from "@/config/api";
import {
  CotizacionPageHeader,
  CotizacionStatsCards,
  CotizacionesMobileList,
  CotizacionesTable,
  type CotizacionRow,
} from "@/components/cotizacion/CotizacionesViewParts";
import { useCotizacionPermissions } from "@/hooks/cotizacion/useCotizacionPermissions";
import { useAuth } from "@/context/AuthContext";
import { clearClientAuthSession } from "@/utils/authSession";
import { useAlert } from "@/context/AlertContext";

const cardShellClass =
  "overflow-hidden rounded-3xl border border-[#e7ded0] bg-[#fffdfa]/95 shadow-[0_30px_80px_-40px_rgba(28,25,23,0.28)] backdrop-blur-sm dark:border-[#273244] dark:bg-[#111827]/80 dark:shadow-[0_30px_80px_-45px_rgba(0,0,0,0.55)]";

const searchInputClass =
  "min-h-[44px] w-full rounded-2xl border border-[#e2d9ca] bg-[#fffdf8] py-2 pl-10 pr-10 text-sm text-[#1c1917] outline-none transition-all placeholder:text-[#7c7a74] focus:border-[#ff801f]/60 focus:ring-4 focus:ring-[#ff801f]/12 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:placeholder:text-[#8ea0b8] dark:focus:border-[#fb923c]/70 dark:focus:ring-[#fb923c]/20 sm:min-h-[46px] sm:pl-11";

/** Medio en gris neutro; el estado usa color semántico */
const medioChipClass =
  "border border-[#e2d9ca] bg-[#fff8f1] text-[#57534e] dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-gray-200";

let lastCotizacionesFetchAt = 0;

export default function CotizacionesPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { success, error, warning } = useAlert();

  const clearSessionAndGoToLogin = useCallback(() => {
    clearClientAuthSession();
    navigate('/signin', { replace: true, state: { from: { pathname: '/cotizacion' } } });
  }, [navigate]);

  const [searchTerm, setSearchTerm] = useState("");

  const [rows, setRows] = useState<CotizacionRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cotizacionToDelete, setCotizacionToDelete] = useState<CotizacionRow | null>(null);

  const formatMoney = (n: number) => {
    const v = Number.isFinite(n) ? n : 0;
    return v.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
  };

  const {
    canCotizacionesView,
    canCotizacionesCreate,
    canCotizacionesEdit,
    canCotizacionesDelete,
  } = useCotizacionPermissions(clearSessionAndGoToLogin);

  const fetchCotizaciones = useCallback(async () => {
    if (!canCotizacionesView || !isAuthenticated) {
      setRows([]);
      return;
    }

    const now = Date.now();
    if (now - lastCotizacionesFetchAt < 2000) return;
    lastCotizacionesFetchAt = now;

    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/cotizaciones/'), {
        method: 'GET',
        cache: 'no-store' as RequestCache,
      });
      if (res.status === 401) {
        clearSessionAndGoToLogin();
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setRows([]);
        return;
      }
      const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      const mapped: CotizacionRow[] = (list || []).map((x: any) => {
        const creado = String(x?.creado_por_full_name || x?.creado_por_username || x?.creadaPor || '—');
        const editado = String(x?.actualizado_por_full_name || x?.actualizado_por_username || x?.editadaPor || '—');
        return {
          id: Number(x?.id || 0),
          idx: Number(x?.idx || 0),
          fecha: String(x?.fecha || ''),
          medioContacto: String(x?.medio_contacto || x?.medioContacto || '—'),
          status: String(x?.status || '—'),
          creadaPor: creado,
          editadaPor: editado,
          cliente: String(x?.cliente || x?.cliente_nombre || '—'),
          contacto: String(x?.contacto || '—'),
          monto: formatMoney(Number(x?.total ?? 0)),
        };
      }).filter((x: any) => !!x.id);
      setRows(mapped);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [canCotizacionesView, isAuthenticated, clearSessionAndGoToLogin]);

  useEffect(() => {
    fetchCotizaciones();
  }, [fetchCotizaciones]);

  useEffect(() => {
    const onUpdated = () => {
      if (!canCotizacionesView) return;
      fetchCotizaciones();
    };

    window.addEventListener("cotizaciones:updated", onUpdated as any);
    return () => window.removeEventListener("cotizaciones:updated", onUpdated as any);
  }, [canCotizacionesView, fetchCotizaciones]);

  const deleteCotizacion = async (id: string) => {
    if (!canCotizacionesDelete) {
      warning('Sin permiso', 'No tienes permiso para eliminar cotizaciones.');
      return;
    }
    const sid = String(id || '').trim();
    if (!sid) return;
    try {
      const res = await fetch(apiUrl(`/api/cotizaciones/${sid}/`), {
        method: 'DELETE',
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        error('Error', txt || 'No se pudo eliminar la cotización.');
        return;
      }
      setRows((prev) => prev.filter((r) => String(r.id) !== sid));
      success('Eliminada', 'Cotización eliminada.');
    } catch {
      error('Error', 'No se pudo eliminar la cotización.');
    }
  };

  const handleAskDelete = (c: CotizacionRow) => {
    if (!canCotizacionesDelete) {
      warning('Sin permiso', 'No tienes permiso para eliminar cotizaciones.');
      return;
    }
    setCotizacionToDelete(c);
    setShowDeleteModal(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setCotizacionToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!cotizacionToDelete) return;
    await deleteCotizacion(String(cotizacionToDelete.id));
    setShowDeleteModal(false);
    setCotizacionToDelete(null);
  };

  const formatDMY = (iso: string) => {
    if (!iso) return "";
    const datePart = String(iso).trim().slice(0, 10);
    const [y, m, d] = datePart.split("-");
    if (!y || !m || !d) return "";
    const dd = d.padStart(2, "0");
    const mm = m.padStart(2, "0");
    return `${dd}/${mm}/${y}`;
  };

  const normalizeMedioLabel = (raw: string) => {
    const s = String(raw || '').trim();
    if (!s) return '—';
    const map: Record<string, string> = {
      BNI: 'BNI',
      REFERIDO: 'Referido',
      WEB: 'Web',
      TIENDA_ONLINE: 'Tienda Online',
      FACEBOOK: 'Facebook',
      INSTAGRAM: 'Instagram',
      TIKTOK: 'Tiktok',
      GOOGLE_MAPS: 'Google Maps',
      YOUTUBE: 'Youtube',
      TIENDA_FISICA: 'Tienda Fisica',
      OTRO: 'Otro',
    };
    const key = s.toUpperCase().replace(/\s+/g, '_');
    return map[key] || s;
  };

  const statusChipClass = (raw: string) => {
    const s = String(raw || '').trim().toUpperCase();
    if (s === 'AUTORIZADA') {
      return 'border border-emerald-200/80 bg-emerald-50/90 text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/[0.08] dark:text-emerald-200';
    }
    if (s === 'CANCELADA') {
      return 'border border-rose-200/80 bg-rose-50/90 text-rose-800 dark:border-rose-500/25 dark:bg-rose-500/[0.08] dark:text-rose-200';
    }
    return 'border border-amber-200/80 bg-amber-50/90 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/[0.08] dark:text-amber-200';
  };

  const shownList = useMemo(() => {
    const q = (searchTerm || "").trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        String(r.idx || '').toLowerCase().includes(q) ||
        r.cliente.toLowerCase().includes(q) ||
        r.contacto.toLowerCase().includes(q) ||
        r.creadaPor.toLowerCase().includes(q) ||
        r.editadaPor.toLowerCase().includes(q)
      );
    });
  }, [rows, searchTerm]);

  const stats = useMemo(() => {
    const total = rows.length;
    const autorizadas = rows.filter((r) => String(r.status || '').toUpperCase() === 'AUTORIZADA').length;
    const pendientes = rows.filter((r) => String(r.status || '').toUpperCase() === 'PENDIENTE' || !String(r.status || '').trim()).length;
    const canceladas = rows.filter((r) => String(r.status || '').toUpperCase() === 'CANCELADA').length;
    return { total, autorizadas, pendientes, canceladas };
  }, [rows]);

  const handleOpenPdf = (id: number) => navigate(`/cotizacion/${id}/pdf`);

  const handleEditRow = (r: CotizacionRow) => {
    if (!canCotizacionesEdit) {
      warning('Sin permiso', 'No tienes permiso para editar cotizaciones.');
      return;
    }
    navigate(`/cotizacion/${r.id}/editar`);
  };

  const rowActions = {
    onOpenPdf: handleOpenPdf,
    onEdit: handleEditRow,
    onDelete: handleAskDelete,
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#f7f5f0] dark:bg-[#0b1018]">
      <div className="mx-auto w-full max-w-[min(100%,1920px)] space-y-5 px-3 pb-10 pt-4 text-sm sm:space-y-6 sm:px-5 sm:pt-6 sm:text-base md:px-6 lg:px-8 xl:px-10">
      <PageMeta title="Cotizaciones | Sistema Grupo Intrax GPS" description="Gestión de cotizaciones" />

      {!canCotizacionesView ? (
        <div className={`rounded-2xl border border-[#e7ded0] bg-[#fffdfa] px-4 py-10 text-center text-xs text-[#7a6b5b] shadow-sm dark:border-white/[0.06] dark:bg-gray-900/40 dark:text-gray-400 sm:text-sm`}>
          No tienes permiso para ver Cotizaciones.
        </div>
      ) : (
        <>
          <CotizacionPageHeader cardShellClass={cardShellClass} />
          <CotizacionStatsCards cardShellClass={cardShellClass} stats={stats} />

          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:justify-between">
            <div className="relative min-w-0 w-full shrink-0 sm:min-w-[min(100%,18rem)] sm:flex-1 md:min-w-[min(100%,22rem)] lg:max-w-none">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 sm:left-3 sm:h-4 sm:w-4"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M9.5 3.5a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm6 12-2.5-2.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Folio, cliente, contacto o usuario…"
                className={searchInputClass}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Limpiar búsqueda"
                  className="absolute inset-y-0 right-0 my-1 mr-1 inline-flex h-9 min-w-[44px] items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200/60 hover:text-gray-600 dark:hover:bg-white/[0.06]"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
                  </svg>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (!canCotizacionesCreate) {
                  warning('Sin permiso', 'No tienes permiso para crear cotizaciones.');
                  return;
                }
                navigate("/cotizacion/nueva");
              }}
              className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#ff801f] px-5 py-2.5 text-xs font-semibold text-black shadow-none transition-colors hover:bg-[#ff6a00] focus:outline-none focus:ring-2 focus:ring-[#ff801f]/35 active:scale-[0.99] sm:w-auto sm:min-h-0 lg:shrink-0"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Nueva cotización
            </button>
          </div>

          <ComponentCard
            title="Listado de cotizaciones"
            className={`!overflow-visible border-[#e7ded0] bg-[#fffdfa]/95 shadow-[0_30px_80px_-40px_rgba(28,25,23,0.22)] dark:border-[#273244] dark:bg-[#111827]/80 dark:shadow-[0_30px_80px_-45px_rgba(0,0,0,0.5)] ${cardShellClass}`}
            compact
          >
            <CotizacionesMobileList
              rows={shownList}
              loading={loading}
              formatDMY={formatDMY}
              normalizeMedioLabel={normalizeMedioLabel}
              statusChipClass={statusChipClass}
              actions={rowActions}
            />
            <CotizacionesTable
              rows={shownList}
              loading={loading}
              formatDMY={formatDMY}
              normalizeMedioLabel={normalizeMedioLabel}
              statusChipClass={statusChipClass}
              medioChipClass={medioChipClass}
              actions={rowActions}
            />
          </ComponentCard>

          {cotizacionToDelete && (
            <Modal isOpen={showDeleteModal} onClose={handleCancelDelete} className="mx-4 w-full max-w-md sm:mx-auto">
              <div className="border-b border-gray-100 p-5 dark:border-white/[0.06] sm:p-6">
                <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-error-200/80 bg-error-50/90 dark:border-error-500/25 dark:bg-error-500/[0.12]">
                  <svg className="h-5 w-5 text-error-600 dark:text-error-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-center text-base font-semibold tracking-tight text-gray-900 dark:text-white sm:text-lg">
                  ¿Eliminar cotización?
                </h3>
                <p className="mb-6 text-center text-xs leading-relaxed text-gray-600 dark:text-gray-400 sm:text-sm">
                  ¿Seguro que deseas eliminar la cotización de{" "}
                  <span className="font-semibold text-gray-900 dark:text-white">{cotizacionToDelete.cliente}</span>? Esta acción no se puede deshacer.
                </p>
                <div className="flex gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={handleCancelDelete}
                    className="flex-1 rounded-lg border border-gray-200/90 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-gray-200 dark:hover:bg-white/[0.04] sm:text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="flex-1 rounded-lg bg-error-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-error-700 focus:outline-none focus:ring-2 focus:ring-error-500/40 sm:text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </Modal>
          )}

        </>
      )}
      </div>
    </div>
  );
}