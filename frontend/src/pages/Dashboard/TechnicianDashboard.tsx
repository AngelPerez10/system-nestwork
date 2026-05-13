import { useState, useEffect, useMemo } from "react";
import PageMeta from "@/components/common/PageMeta";
import { listOrdenes } from "@/pages/Operacion/OrdenesTrabajo/OrdenServicio/ordenesApi";
import { BoltIcon } from "@/icons";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { motion } from "motion/react";

interface Orden {
  id: number;
  idx: number;
  cliente: string;
  status: "pendiente" | "resuelto";
  fecha_inicio: string;
  tecnico_asignado: number | null;
  servicios_realizados: string[];
}

/* ── Design tokens (cohesive with ProfilePage / GestionUsuario) ── */
const cardShellClass =
  "overflow-hidden rounded-3xl border border-[#e7ded0] bg-[#fffdfa]/95 shadow-[0_30px_80px_-40px_rgba(28,25,23,0.28)] backdrop-blur-sm dark:border-[#273244] dark:bg-[#111827]/80 dark:shadow-[0_30px_80px_-45px_rgba(0,0,0,0.55)]";

const claudeHeroHeadingClass =
  "[font-family:Georgia,'Times_New_Roman',serif] text-[clamp(1.85rem,2.8vw,2.6rem)] font-medium leading-[1.2] tracking-[-0.01em] text-[#1c1917] dark:text-[#f8fafc]";

const claudeSubheadingClass =
  "[font-family:Georgia,'Times_New_Roman',serif] text-[clamp(1.1rem,1.3vw,1.25rem)] font-medium leading-[1.2] text-gray-900 dark:text-white";

const claudeBodyClass =
  "text-base font-normal leading-[1.6] text-[#57534e] dark:text-[#b7c1d1]";

const sectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#78716c] dark:text-[#8ea0b8] sm:text-xs";

const metricCardShellClass =
  "rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-4 shadow-[0_12px_32px_-24px_rgba(28,25,23,0.15)] transition-all hover:shadow-[0_16px_40px_-20px_rgba(28,25,23,0.25)] dark:border-[#273244] dark:bg-[#111a2b]/90 sm:p-5";

/* ── Chart helper: warm coral palette instead of generic blue ── */
const claudeSansStyle = { fontFamily: "Outfit, sans-serif" } as const;

/* ── Motion variants ── */
const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
};

const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

const coralGradient = {
  type: "gradient" as const,
  gradient: {
    shade: "light",
    type: "vertical",
    shadeIntensity: 0.3,
    gradientToColors: ["#ff801f"],
    inverseColors: true,
    opacityFrom: 1,
    opacityTo: 0.7,
    stops: [50, 0, 100],
  },
};

export default function TechnicianDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchOrdenes = async () => {
      if (!isAuthenticated) return;
      try {
        const { response, rows } = await listOrdenes();
        if (!cancelled) {
          setOrdenes(response.ok ? (rows as Orden[]) : []);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
        if (!cancelled) setOrdenes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchOrdenes();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const myOrdenes = useMemo(() => {
    if (!user?.id) return [];
    const list = Array.isArray(ordenes) ? ordenes : [];
    return list.filter((o) => o.tecnico_asignado === user.id);
  }, [ordenes, user?.id]);

  const stats = useMemo(() => {
    const total = myOrdenes.length;
    const pending = myOrdenes.filter(
      (o) => o.status === "pendiente"
    ).length;
    const resolved = myOrdenes.filter(
      (o) => o.status === "resuelto"
    ).length;
    const clients = new Set(myOrdenes.map((o) => o.cliente)).size;
    const completionRate =
      total > 0 ? Math.round((resolved / total) * 100) : 0;
    return { total, pending, resolved, clients, completionRate };
  }, [myOrdenes]);

  const chartData = useMemo(() => {
    const months = [
      "Ene", "Feb", "Mar", "Abr", "May", "Jun",
      "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
    ];
    const counts = new Array(12).fill(0);
    myOrdenes.forEach((o) => {
      if (o.fecha_inicio) {
        const date = new Date(o.fecha_inicio);
        if (!isNaN(date.getTime())) counts[date.getMonth()]++;
      }
    });
    return { months, counts };
  }, [myOrdenes]);

  const recentOrders = useMemo(() => {
    return [...myOrdenes].sort((a, b) => b.id - a.id).slice(0, 6);
  }, [myOrdenes]);

  const clientStats = useMemo(() => {
    const counts: Record<string, number> = {};
    myOrdenes.forEach((o) => {
      counts[o.cliente] = (counts[o.cliente] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [myOrdenes]);

  /* ── Chart options with warm coral palette ── */
  const chartOptions: ApexOptions = {
    colors: ["#ff801f"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 180,
      toolbar: { show: false },
      sparkline: { enabled: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "40%",
        borderRadius: 8,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: chartData.months,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: "#78716c", fontSize: "12px" },
      },
    },
    yaxis: {
      labels: { style: { colors: "#78716c", fontSize: "12px" } },
    },
    grid: {
      borderColor: "#ebe6df",
      strokeDashArray: 4,
      yaxis: { lines: { show: true } },
    },
    fill: coralGradient,
    tooltip: {
      theme: "light",
      x: { show: false },
      y: { formatter: (val: number) => `${val} Órdenes` },
    },
  };

  const targetOptions: ApexOptions = {
    colors: ["#ff801f"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "radialBar",
      height: 330,
      sparkline: { enabled: true },
    },
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        hollow: { size: "75%" },
        track: {
          background: "#e8e0d2",
          strokeWidth: "100%",
          margin: 5,
        },
        dataLabels: {
          name: {
            show: true,
            fontSize: "13px",
            fontWeight: "500",
            offsetY: -10,
            color: "#78716c",
          },
          value: {
            fontSize: "34px",
            fontWeight: "600",
            offsetY: -45,
            color: "#1c1917",
            formatter: (val) => val + "%",
          },
        },
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        shade: "dark",
        type: "horizontal",
        shadeIntensity: 0.4,
        gradientToColors: ["#cc785c"],
        inverseColors: true,
        opacityFrom: 1,
        opacityTo: 1,
        stops: [0, 100],
      },
    },
    stroke: { lineCap: "round" },
    labels: ["Progreso Mensual"],
  };

  const targetProgress = Math.min(
    100,
    Math.round((stats.resolved / 20) * 100)
  );

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 rounded-2xl border border-[#e7ded0] bg-[#fffdfa] px-6 py-4 shadow-sm dark:border-[#273244] dark:bg-[#111a2b]"
        >
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#ff801f]/30 border-t-[#ff801f]" />
          <span className="text-sm font-medium text-[#78716c] dark:text-[#8ea0b8]">
            Cargando panel…
          </span>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="Panel del Técnico | Sistema DigitalFlow"
        description="Panel de control para técnicos"
      />
      <div className="min-h-[calc(100dvh-5rem)] overflow-x-hidden">
        <motion.div
          className="relative mx-auto w-full max-w-[min(100%,88rem)] space-y-6 px-4 pb-10 pt-6 sm:space-y-8 sm:px-6 sm:pb-12 sm:pt-8 lg:px-8 xl:px-10"
          style={claudeSansStyle}
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* ── Breadcrumbs ── */}
          <motion.nav
            variants={fadeInUp}
            className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium text-[#78716c] dark:text-[#8ea0b8] sm:text-[13px]"
            aria-label="Migas de pan"
          >
            <Link
              to="/"
              className="rounded-md px-1.5 py-1 text-[#57534e] transition-all duration-200 hover:bg-black/[0.05] hover:text-[#1c1917] dark:text-[#aeb8c8] dark:hover:bg-white/[0.06] dark:hover:text-white"
            >
              Inicio
            </Link>
            <span className="text-[#d6d3d1] dark:text-[#334155]" aria-hidden>
              /
            </span>
            <span className="text-[#44403c] dark:text-[#cbd5e1]">Panel Técnico</span>
          </motion.nav>

          {/* ── Header ── */}
          <motion.header
            variants={fadeInUp}
            className={`${cardShellClass} dark:bg-[#111827]/80 dark:border-[#273244]`}
          >
            <div className="relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-[#e7ded0] dark:bg-[#334155]" />
              <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:p-6 lg:p-8">
                <div className="flex min-w-0 gap-3.5 sm:gap-4">
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e2d9ca] bg-white text-[#1c1917] sm:h-12 sm:w-12 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f8fafc]">
                    <svg
                      className="h-5 w-5 sm:h-[18px] sm:w-[18px]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      aria-hidden
                    >
                      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                    </svg>
                    <div className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#11ff99] dark:border-black" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={sectionLabelClass}>Mi escritorio</p>
                    <h1 className={`mt-1 ${claudeHeroHeadingClass}`}>
                      Panel del Técnico
                    </h1>
                    <p className={`mt-2 max-w-xl ${claudeBodyClass}`}>
                      Gestiona tus órdenes de servicio, monitorea tu rendimiento
                      y mantén el control de tus métricas clave.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.header>

          {/* ── Metric cards ── */}
          <motion.div
            variants={fadeInUp}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {/* Total */}
            <div className={metricCardShellClass}>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e7ded0] bg-white text-[#1c1917] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#f8fafc]">
                  <BoltIcon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#78716c] dark:text-[#8ea0b8]">
                    Órdenes totales
                  </p>
                  <p className="mt-0.5 text-xl font-semibold tabular-nums text-[#1c1917] dark:text-[#f8fafc]">
                    {stats.total}
                  </p>
                </div>
              </div>
            </div>

            {/* Resueltas */}
            <div className={metricCardShellClass}>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#ffd7b5] bg-[#fff3e8] text-[#c2410c] dark:border-[#9a3412]/40 dark:bg-[#7c2d12]/20 dark:text-[#fdba74]">
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M20 6L9 17l-5-5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#78716c] dark:text-[#8ea0b8]">
                    Resueltas
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="mt-0.5 text-xl font-semibold tabular-nums text-[#1c1917] dark:text-[#f8fafc]">
                      {stats.resolved}
                    </p>
                    <span className="text-xs font-medium text-[#16a34a] dark:text-[#4ade80]">
                      {stats.completionRate}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pendientes */}
            <div className={metricCardShellClass}>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#fde68a] bg-[#fffbeb] text-[#b45309] dark:border-[#854d0e]/40 dark:bg-[#713f12]/20 dark:text-[#fbbf24]">
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" strokeLinecap="round" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#78716c] dark:text-[#8ea0b8]">
                    Pendientes
                  </p>
                  <p className="mt-0.5 text-xl font-semibold tabular-nums text-[#1c1917] dark:text-[#f8fafc]">
                    {stats.pending}
                  </p>
                </div>
              </div>
            </div>

            {/* Clientes */}
            <div className={metricCardShellClass}>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e7ded0] bg-white text-[#1c1917] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#f8fafc]">
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    aria-hidden
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#78716c] dark:text-[#8ea0b8]">
                    Clientes
                  </p>
                  <p className="mt-0.5 text-xl font-semibold tabular-nums text-[#1c1917] dark:text-[#f8fafc]">
                    {stats.clients}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Content grid ── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* ── Left: Chart + Table ── */}
            <div className="space-y-6 lg:col-span-8">
              {/* Chart card */}
              <motion.div
                variants={fadeInUp}
                className={cardShellClass + " p-5 sm:p-6"}
              >
                <div className="mb-6 border-b border-[#e7ded0]/90 pb-4 dark:border-[#334155]/80">
                  <p className={sectionLabelClass}>Rendimiento</p>
                  <h2 className={`mt-1 ${claudeSubheadingClass}`}>
                    Órdenes mensuales
                  </h2>
                  <p className={`mt-1 ${claudeBodyClass} text-sm`}>
                    Completadas por mes
                  </p>
                </div>
                <div className="max-w-full overflow-x-auto custom-scrollbar">
                  <div className="-ml-4 min-w-[600px] lg:min-w-full">
                    <Chart
                      options={chartOptions}
                      series={[{ name: "Órdenes", data: chartData.counts }]}
                      type="bar"
                      height={240}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Table card */}
              <motion.div
                variants={fadeInUp}
                className={`${cardShellClass} overflow-hidden`}
              >
                <div className="flex items-center justify-between border-b border-[#e7ded0] bg-[#fcfaf6] px-5 py-4 dark:border-[#334155] dark:bg-[#111827]/70 sm:px-6">
                  <div>
                    <p className={sectionLabelClass}>Actividad</p>
                    <h2 className={`mt-0.5 ${claudeSubheadingClass}`}>
                      Órdenes recientes
                    </h2>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-[#e7ded0] bg-white px-3 py-1 text-[11px] font-medium tabular-nums text-[#78716c] dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#94a3b8]">
                    {recentOrders.length} de {stats.total}
                  </span>
                </div>
                <div className="max-w-full overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-[#fcfaf6]/80 dark:bg-white/[0.03]">
                      <TableRow>
                        <TableCell
                          isHeader
                          className="px-5 py-3 text-start text-[11px] font-semibold uppercase tracking-[0.08em] text-[#78716c] dark:text-[#8ea0b8]"
                        >
                          Folio
                        </TableCell>
                        <TableCell
                          isHeader
                          className="px-5 py-3 text-start text-[11px] font-semibold uppercase tracking-[0.08em] text-[#78716c] dark:text-[#8ea0b8]"
                        >
                          Cliente
                        </TableCell>
                        <TableCell
                          isHeader
                          className="px-5 py-3 text-start text-[11px] font-semibold uppercase tracking-[0.08em] text-[#78716c] dark:text-[#8ea0b8]"
                        >
                          Fecha
                        </TableCell>
                        <TableCell
                          isHeader
                          className="px-5 py-3 text-start text-[11px] font-semibold uppercase tracking-[0.08em] text-[#78716c] dark:text-[#8ea0b8]"
                        >
                          Estado
                        </TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-[#ebe6df] dark:divide-[#273244]">
                      {recentOrders.map((o) => (
                        <TableRow
                          key={o.id}
                          className="transition-colors hover:bg-[#fcfaf6] dark:hover:bg-white/[0.03]"
                        >
                          <TableCell className="px-5 py-4 text-sm font-semibold tabular-nums text-[#1c1917] dark:text-[#f8fafc]">
                            #{o.idx}
                          </TableCell>
                          <TableCell className="px-5 py-4 text-sm font-medium text-[#57534e] dark:text-[#cbd5e1]">
                            {o.cliente}
                          </TableCell>
                          <TableCell className="px-5 py-4 text-sm text-[#78716c] dark:text-[#8ea0b8]">
                            {o.fecha_inicio}
                          </TableCell>
                          <TableCell className="px-5 py-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                o.status === "resuelto"
                                  ? "border border-[#bbf7d0] bg-[#f0fdf4] text-[#166534] dark:border-[#166534]/30 dark:bg-[#14532d]/20 dark:text-[#86efac]"
                                  : "border border-[#fde68a] bg-[#fffbeb] text-[#92400e] dark:border-[#854d0e]/30 dark:bg-[#713f12]/20 dark:text-[#fbbf24]"
                              }`}
                            >
                              {o.status === "resuelto"
                                ? "Resuelto"
                                : "Pendiente"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      {recentOrders.length === 0 && (
                        <TableRow>
                          <td
                            colSpan={4}
                            className="px-5 py-14 text-center"
                          >
                            <div className="flex flex-col items-center gap-3">
                              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff801f]/10 text-[#ff801f] dark:bg-[#ff801f]/15 dark:text-[#ffa057]">
                                <svg
                                  className="h-6 w-6"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                >
                                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                                  <path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
                                </svg>
                              </span>
                              <p className="text-sm font-medium text-[#78716c] dark:text-[#8ea0b8]">
                                Sin órdenes recientes
                              </p>
                            </div>
                          </td>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </motion.div>
            </div>

            {/* ── Right: Target + Top Clients ── */}
            <div className="space-y-6 lg:col-span-4">
              {/* Target card */}
              <motion.div
                variants={fadeInUp}
                className={cardShellClass + " p-5 sm:p-6"}
              >
                <div className="mb-6 border-b border-[#e7ded0]/90 pb-4 dark:border-[#334155]/80">
                  <p className={sectionLabelClass}>Objetivo</p>
                  <h2 className={`mt-1 ${claudeSubheadingClass}`}>
                    Meta mensual
                  </h2>
                  <p className={`mt-1 ${claudeBodyClass} text-sm`}>
                    Basado en 20 órdenes
                  </p>
                </div>
                <div className="flex justify-center">
                  <div className="w-full max-w-[250px]">
                    <Chart
                      options={targetOptions}
                      series={[targetProgress]}
                      type="radialBar"
                      height={280}
                    />
                  </div>
                </div>
                <div
                  className={`mt-4 rounded-xl border p-4 ${
                    targetProgress >= 100
                      ? "border-[#bbf7d0] bg-[#f0fdf4] dark:border-[#166534]/40 dark:bg-[#14532d]/15"
                      : "border-[#fde68a] bg-[#fffbeb] dark:border-[#854d0e]/40 dark:bg-[#713f12]/15"
                  }`}
                >
                  <p className="text-center text-sm font-medium text-[#57534e] dark:text-[#cbd5e1]">
                    Has resuelto{" "}
                    <span className="font-semibold text-[#c2410c] dark:text-[#fdba74]">
                      {stats.resolved}
                    </span>{" "}
                    órdenes este mes.
                    {targetProgress >= 100
                      ? " ¡Meta alcanzada!"
                      : ` Te faltan ${20 - stats.resolved} para tu objetivo.`}
                  </p>
                </div>
              </motion.div>

              {/* Top Clients card */}
              <motion.div
                variants={fadeInUp}
                className={cardShellClass + " p-5 sm:p-6"}
              >
                <div className="mb-6 border-b border-[#e7ded0]/90 pb-4 dark:border-[#334155]/80">
                  <p className={sectionLabelClass}>Clientes</p>
                  <h2 className={`mt-1 ${claudeSubheadingClass}`}>
                    Principales
                  </h2>
                  <p className={`mt-1 ${claudeBodyClass} text-sm`}>
                    Mayor volumen de órdenes
                  </p>
                </div>

                <div className="space-y-5">
                  {clientStats.map(([name, count], idx) => (
                    <div key={name} className="group">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#e7ded0] bg-white text-xs font-semibold tabular-nums text-[#78716c] transition-colors group-hover:border-[#ff801f]/40 group-hover:bg-[#ff801f] group-hover:text-white dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#94a3b8]">
                            {idx + 1}
                          </div>
                          <span className="truncate text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">
                            {name}
                          </span>
                        </div>
                        <span className="shrink-0 text-xs font-medium tabular-nums text-[#78716c] dark:text-[#8ea0b8]">
                          {count} Órdenes
                        </span>
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#e8e0d2] dark:bg-[#1e293b]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${
                              stats.total > 0
                                ? Math.min(
                                    100,
                                    (count / Math.max(...clientStats.map(([, c]) => c))) * 100
                                  )
                                : 0
                            }%`,
                          }}
                          transition={{
                            duration: 1,
                            ease: [0.22, 1, 0.36, 1],
                            delay: 0.1 * idx,
                          }}
                          className="absolute left-0 top-0 h-full rounded-full bg-[#ff801f]"
                        />
                      </div>
                    </div>
                  ))}
                  {clientStats.length === 0 && (
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff801f]/10 text-[#ff801f] dark:bg-[#ff801f]/15 dark:text-[#ffa057]">
                        <svg
                          className="h-6 w-6"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                        </svg>
                      </span>
                      <p className="text-sm font-medium text-[#78716c] dark:text-[#8ea0b8]">
                        Sin datos de clientes
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
