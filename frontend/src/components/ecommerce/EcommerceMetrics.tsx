import {
  ArrowDownIcon,
  ArrowUpIcon,
  BoxIconLine,
  GroupIcon,
} from "../../icons";
import Badge from "../ui/badge/Badge";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/config/api";
import { useAuth } from "@/context/AuthContext";

export default function EcommerceMetrics() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [ordenesMes, setOrdenesMes] = useState(0);
  const [cotizacionesMes, setCotizacionesMes] = useState(0);

  const now = useMemo(() => new Date(), []);
  const month = now.getMonth();
  const year = now.getFullYear();

  const isSameMonthYear = (value: unknown) => {
    if (!value) return false;
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime())) return false;
    return d.getFullYear() === year && d.getMonth() === month;
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const load = async () => {
      try {
        const [ordenesRes, cotizacionesRes] = await Promise.all([
          fetch(apiUrl("/api/ordenes/"), {
            method: "GET",
            cache: "no-store" as RequestCache,
          }),
          fetch(apiUrl("/api/cotizaciones/"), {
            method: "GET",
            cache: "no-store" as RequestCache,
          }),
        ]);

        const ordenesData = await ordenesRes.json().catch(() => null);
        const cotizacionesData = await cotizacionesRes.json().catch(() => null);

        const ordenesList = Array.isArray(ordenesData)
          ? ordenesData
          : Array.isArray(ordenesData?.results)
            ? ordenesData.results
            : [];
        const cotizacionesList = Array.isArray(cotizacionesData)
          ? cotizacionesData
          : Array.isArray(cotizacionesData?.results)
            ? cotizacionesData.results
            : [];

        const ordenesActual = ordenesList.filter((x: any) =>
          isSameMonthYear(x?.fecha_creacion || x?.fecha_inicio || x?.created_at)
        ).length;
        const cotizacionesActual = cotizacionesList.filter((x: any) =>
          isSameMonthYear(x?.fecha || x?.created_at || x?.fecha_creacion)
        ).length;

        setOrdenesMes(ordenesActual);
        setCotizacionesMes(cotizacionesActual);
      } catch {
        setOrdenesMes(0);
        setCotizacionesMes(0);
      }
    };

    load();
  }, [month, year]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
      {/* <!-- Metric Item Start --> */}
      <button
        type="button"
        onClick={() => navigate("/ordenes")}
        className="rounded-2xl border border-[#e7ded0] bg-[#fffdfa]/95 p-5 text-left shadow-[0_20px_40px_-34px_rgba(28,25,23,0.28)] transition-colors hover:bg-[#fff7ed] dark:border-[#273244] dark:bg-[#0f172a]/70 dark:hover:bg-[#132033] md:p-6"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#fff3e7] dark:bg-[#1a2538]">
          <GroupIcon className="size-6 text-[#ea580c] dark:text-[#fb923c]" />
        </div>

        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-[#7a6b5b] dark:text-[#8ea0b8]">
              Ordenes del mes
            </span>
            <h4 className="mt-2 text-title-sm font-bold text-[#1c1917] dark:text-[#f8fafc]">
              {ordenesMes.toLocaleString("es-MX")}
            </h4>
          </div>
          <Badge color="success">
            <ArrowUpIcon />
            Actual
          </Badge>
        </div>
      </button>
      {/* <!-- Metric Item End --> */}

      {/* <!-- Metric Item Start --> */}
      <button
        type="button"
        onClick={() => navigate("/cotizacion")}
        className="rounded-2xl border border-[#e7ded0] bg-[#fffdfa]/95 p-5 text-left shadow-[0_20px_40px_-34px_rgba(28,25,23,0.28)] transition-colors hover:bg-[#eff6ff] dark:border-[#273244] dark:bg-[#0f172a]/70 dark:hover:bg-[#132033] md:p-6"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#eaf3ff] dark:bg-[#172338]">
          <BoxIconLine className="size-6 text-[#2563eb] dark:text-[#7dd3fc]" />
        </div>
        <div className="flex items-end justify-between mt-5">
          <div>
            <span className="text-sm text-[#7a6b5b] dark:text-[#8ea0b8]">
              Cotizaciones del mes
            </span>
            <h4 className="mt-2 text-title-sm font-bold text-[#1c1917] dark:text-[#f8fafc]">
              {cotizacionesMes.toLocaleString("es-MX")}
            </h4>
          </div>

          <Badge color="error">
            <ArrowDownIcon />
            Actual
          </Badge>
        </div>
      </button>
      {/* <!-- Metric Item End --> */}
    </div>
  );
}
