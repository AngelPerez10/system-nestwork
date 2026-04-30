import { Link } from "react-router-dom";
import { PencilIcon, TrashBinIcon } from "@/icons";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

export interface CotizacionRow {
  id: number;
  idx: number;
  fecha: string;
  medioContacto: string;
  status: string;
  creadaPor: string;
  editadaPor: string;
  cliente: string;
  contacto: string;
  monto: string;
}

type Stats = {
  total: number;
  autorizadas: number;
  pendientes: number;
  canceladas: number;
};

type RowActionHandlers = {
  onOpenPdf: (id: number) => void;
  onEdit: (row: CotizacionRow) => void;
  onDelete: (row: CotizacionRow) => void;
};

export function CotizacionPageHeader({ cardShellClass }: { cardShellClass: string }) {
  return (
    <>
      <nav
        className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-[#78716c] dark:text-[#8ea0b8] sm:text-[13px]"
        aria-label="Migas de pan"
      >
        <Link
          to="/"
          className="rounded-md px-1 py-0.5 text-[#57534e] transition-colors hover:bg-black/[0.03] hover:text-[#1c1917] dark:text-[#aeb8c8] dark:hover:bg-white/5 dark:hover:text-white"
        >
          Inicio
        </Link>
        <span className="text-[#d6d3d1] dark:text-[#334155]" aria-hidden>
          /
        </span>
        <span className="text-[#44403c] dark:text-[#cbd5e1]">Cotizaciones</span>
      </nav>

      <header className={`relative flex w-full flex-col gap-4 ${cardShellClass} p-4 sm:p-6`}>
        <div className="pointer-events-none absolute right-4 top-4 h-20 w-20 rounded-full bg-[#ff801f]/10 blur-2xl sm:right-6 sm:top-6" />
        <div className="relative z-[1] flex min-w-0 gap-3 sm:gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff801f] text-black sm:h-11 sm:w-11">
            <svg className="h-[18px] w-[18px] sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ea580c] dark:text-[#fb923c] sm:text-[11px]">
              Ventas
            </p>
            <h1 className="[font-family:Georgia,'Times_New_Roman',serif] mt-0.5 text-[clamp(1.85rem,2.8vw,2.6rem)] font-medium leading-[1.2] tracking-[-0.01em] text-[#1c1917] dark:text-[#f8fafc]">
              Cotizaciones
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#57534e] dark:text-gray-400">
              Consulta historial, filtra por cliente o folio, abre PDF y administra estado de cada cotización.
            </p>
            <div className="mt-3 h-px w-full max-w-xl bg-gradient-to-r from-[#ff801f]/35 via-[#ffbf8d]/30 to-transparent dark:from-[#ff9a52]/35 dark:via-[#64748b]/25 dark:to-transparent" />
          </div>
        </div>
      </header>
    </>
  );
}

export function CotizacionStatsCards({ cardShellClass, stats }: { cardShellClass: string; stats: Stats }) {
  const items = [
    { label: "Total", value: stats.total, tone: "neutral" },
    { label: "Autorizadas", value: stats.autorizadas, tone: "ok" },
    { label: "Pendientes", value: stats.pendientes, tone: "warn" },
    { label: "Canceladas", value: stats.canceladas, tone: "err" },
  ] as const;

  const toneClass = (tone: (typeof items)[number]["tone"]) => {
    if (tone === "ok") return "border-emerald-200/70 bg-emerald-50/80 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/[0.08] dark:text-emerald-300";
    if (tone === "warn") return "border-amber-200/70 bg-amber-50/80 text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/[0.08] dark:text-amber-200";
    if (tone === "err") return "border-rose-200/70 bg-rose-50/80 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/[0.08] dark:text-rose-300";
    return "border-[#ff801f]/30 bg-[#ff801f]/10 text-[#ea580c] dark:border-[#fb923c]/35 dark:bg-[#fb923c]/15 dark:text-[#fb923c]";
  };

  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 lg:gap-4 xl:gap-5">
      {items.map((item) => (
        <div key={item.label} className={`${cardShellClass} p-3 transition-colors hover:border-gray-300/90 dark:hover:border-white/[0.1] sm:p-4`}>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneClass(item.tone)} sm:h-10 sm:w-10`}>
              <span className="text-[11px] font-semibold sm:text-xs">{item.label.slice(0, 1)}</span>
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-[#8b7b69] dark:text-gray-500 sm:text-[10px]">{item.label}</p>
              <p className="mt-0.5 text-base font-semibold tabular-nums text-[#1c1917] dark:text-white sm:text-lg">{item.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CotizacionesMobileList({
  rows,
  loading,
  formatDMY,
  normalizeMedioLabel,
  statusChipClass,
  actions,
}: {
  rows: CotizacionRow[];
  loading: boolean;
  formatDMY: (iso: string) => string;
  normalizeMedioLabel: (v: string) => string;
  statusChipClass: (v: string) => string;
  actions: RowActionHandlers;
}) {
  if (loading) {
    return <div className="rounded-xl border border-[#e7ded0] bg-[#fffdfa] p-4 text-sm text-[#7a6b5b] dark:border-white/[0.08] dark:bg-gray-900/40 dark:text-gray-400">Cargando…</div>;
  }
  if (!rows.length) {
    return null;
  }
  return (
    <div className="space-y-3 lg:hidden">
      {rows.map((r) => (
        <article key={r.id} className="rounded-2xl border border-[#e7ded0] bg-[#fffdfa]/95 p-3 shadow-[0_12px_32px_-28px_rgba(28,25,23,0.2)] transition-all hover:border-[#ff801f]/35 dark:border-[#273244] dark:bg-[#111827]/75 dark:hover:border-[#fb923c]/30">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="inline-flex rounded-md border border-[#e7ded0] bg-[#fff8f1] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#1c1917] dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-white">
              #{r.idx || "—"}
            </span>
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ${statusChipClass(r.status)}`}>
              {r.status || "Pendiente"}
            </span>
          </div>
          <p className="truncate text-sm font-semibold text-[#1c1917] dark:text-white">{r.cliente}</p>
          <p className="mt-1 text-xs text-[#7a6b5b] dark:text-gray-400">{formatDMY(r.fecha)} · {normalizeMedioLabel(r.medioContacto)}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="rounded-md border border-[#e7ded0] bg-[#fff8f1] px-2 py-0.5 text-xs font-semibold tabular-nums text-[#1c1917] dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-white">{r.monto}</span>
            <div className="inline-flex gap-1">
              <button type="button" onClick={() => actions.onOpenPdf(r.id)} className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 transition-colors hover:border-[#ff801f] hover:text-[#c2410c] dark:border-white/10 dark:bg-gray-800 dark:text-gray-200">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
              </button>
              <button type="button" onClick={() => actions.onEdit(r)} className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 transition-colors hover:border-[#ff801f] hover:text-[#c2410c] dark:border-white/10 dark:bg-gray-800 dark:text-gray-200">
                <PencilIcon className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => actions.onDelete(r)} className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 transition-colors hover:border-error-400 hover:text-error-600 dark:border-white/10 dark:bg-gray-800 dark:text-gray-200">
                <TrashBinIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function CotizacionesTable({
  rows,
  loading,
  formatDMY,
  normalizeMedioLabel,
  statusChipClass,
  medioChipClass,
  actions,
}: {
  rows: CotizacionRow[];
  loading: boolean;
  formatDMY: (iso: string) => string;
  normalizeMedioLabel: (v: string) => string;
  statusChipClass: (v: string) => string;
  medioChipClass: string;
  actions: RowActionHandlers;
}) {
  return (
    <div className="hidden lg:block">
      <div className="touch-pan-x overflow-x-auto overscroll-x-contain rounded-xl border border-[#e7ded0] bg-[#fffdfa] [-webkit-overflow-scrolling:touch] dark:border-white/[0.08] dark:bg-gray-900/40">
        <Table className="w-full min-w-[980px] border-collapse">
          <TableHeader className="sticky top-0 z-10 border-b border-[#e7ded0] bg-[#fffdfa]/95 text-[10px] font-semibold text-[#1c1917] backdrop-blur-sm dark:border-[#334155] dark:bg-[#111827]/95 dark:text-[#f8fafc] sm:text-[11px]">
            <TableRow>
              <TableCell isHeader className="w-[80px] min-w-[80px] whitespace-nowrap px-2 py-2 text-left sm:px-3">Folio</TableCell>
              <TableCell isHeader className="w-[104px] min-w-[104px] whitespace-nowrap px-2 py-2 text-left sm:px-3">Fecha</TableCell>
              <TableCell isHeader className="min-w-[120px] max-w-[160px] px-2 py-2 text-left sm:px-3">Medio</TableCell>
              <TableCell isHeader className="w-[108px] min-w-[108px] whitespace-nowrap px-2 py-2 text-left sm:px-3">Status</TableCell>
              <TableCell isHeader className="min-w-[132px] max-w-[180px] px-2 py-2 text-left sm:px-3">Creada por</TableCell>
              <TableCell isHeader className="min-w-[160px] px-2 py-2 text-left sm:px-3">Cliente</TableCell>
              <TableCell isHeader className="w-[132px] min-w-[132px] whitespace-nowrap px-2 py-2 text-right sm:px-3">Monto</TableCell>
              <TableCell isHeader className="w-[132px] min-w-[132px] whitespace-nowrap px-2 py-2 text-center sm:px-3">Acciones</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 text-[11px] text-gray-700 dark:divide-white/[0.06] dark:text-gray-200 sm:text-[12px]">
            {loading ? (
              <TableRow>
                <TableCell className="px-3 py-3 text-gray-500 dark:text-gray-400" colSpan={8}>Cargando…</TableCell>
              </TableRow>
            ) : !rows.length ? (
              <TableRow>
                <TableCell className="px-3 py-2" colSpan={8}>
                  <div className="py-8 text-center text-xs text-[#7a6b5b] dark:text-gray-400 sm:text-sm">No hay cotizaciones.</div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id} className="align-top transition-colors odd:bg-white even:bg-[#f9f6ef] hover:bg-[#fff3e8] dark:odd:bg-gray-900/50 dark:even:bg-gray-950 dark:hover:bg-gray-800/60">
                  <TableCell className="whitespace-nowrap px-2 py-2 align-middle sm:px-3">
                    <span className="inline-flex items-center justify-center rounded-md border border-gray-200/80 bg-gray-50/90 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-gray-900 dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-white sm:text-[11px]">
                      {r.idx ? r.idx : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-2 py-2 align-middle sm:px-3">{formatDMY(r.fecha)}</TableCell>
                  <TableCell className="min-w-0 max-w-[160px] px-2 py-2 align-middle sm:px-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium sm:text-[11px] ${medioChipClass}`}>{normalizeMedioLabel(r.medioContacto)}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-2 py-2 align-middle sm:px-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium sm:text-[11px] ${statusChipClass(r.status)}`}>{r.status || "Pendiente"}</span>
                  </TableCell>
                  <TableCell className="min-w-0 max-w-[180px] px-2 py-2 align-top sm:px-3">
                    <div className="truncate text-[11px] text-gray-900 dark:text-white sm:text-[12px]" title={r.creadaPor}>{r.creadaPor}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 sm:text-[11px]">{r.editadaPor}</div>
                  </TableCell>
                  <TableCell className="min-w-[160px] max-w-[280px] px-2 py-2 align-top sm:px-3">
                    <span className="block truncate text-[11px] font-medium text-gray-900 dark:text-white sm:text-[12px]" title={r.cliente}>{r.cliente}</span>
                  </TableCell>
                  <TableCell className="w-[132px] min-w-[132px] whitespace-nowrap px-2 py-2 text-right align-middle sm:px-3">
                    <span className="inline-flex max-w-full justify-end rounded-md border border-gray-200/80 bg-gray-50/90 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-gray-900 dark:border-white/[0.08] dark:bg-gray-950/40 dark:text-white sm:text-[12px]">{r.monto}</span>
                  </TableCell>
                  <TableCell className="w-[132px] min-w-[132px] whitespace-nowrap px-2 py-2 text-center align-middle sm:px-3">
                    <div className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-1 dark:bg-white/10">
                      <button type="button" onClick={() => actions.onOpenPdf(r.id)} className="group inline-flex h-7 w-7 items-center justify-center rounded border border-gray-200 bg-white transition hover:border-[#ff801f] hover:text-[#c2410c] dark:border-white/10 dark:bg-gray-800">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <path d="M14 2v6h6" />
                        </svg>
                      </button>
                      <button type="button" onClick={() => actions.onEdit(r)} className="group inline-flex h-7 w-7 items-center justify-center rounded border border-gray-200 bg-white transition hover:border-[#ff801f] hover:text-[#c2410c] dark:border-white/10 dark:bg-gray-800">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => actions.onDelete(r)} className="group inline-flex h-7 w-7 items-center justify-center rounded border border-gray-200 bg-white transition hover:border-error-400 hover:text-error-600 dark:border-white/10 dark:bg-gray-800">
                        <TrashBinIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
