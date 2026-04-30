import EcommerceMetrics from "../../components/ecommerce/EcommerceMetrics";
import MonthlySalesChart from "../../components/ecommerce/MonthlySalesChart";
import StatisticsChart from "../../components/ecommerce/StatisticsChart";
import MonthlyTarget from "../../components/ecommerce/MonthlyTarget";
import PageMeta from "../../components/common/PageMeta";
import TechnicianDashboard from "./TechnicianDashboard";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <TechnicianDashboard />;
  }

  return (
    <>
      <PageMeta
        title="Panel de Control | Sistema Grupo Intrax GPS"
        description="Panel principal del sistema de administración Grupo Intrax GPS"
      />
      <div className="mb-6 overflow-hidden rounded-3xl border border-[#e7ded0] bg-[#fffdfa]/95 p-5 shadow-[0_24px_60px_-34px_rgba(28,25,23,0.2)] dark:border-[#273244] dark:bg-[#0f172a]/70 md:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ea580c] dark:text-[#fb923c]">
          Vista ejecutiva
        </p>
        <h1 className="mt-2 [font-family:Georgia,'Times_New_Roman',serif] text-2xl font-medium text-[#1c1917] dark:text-[#f8fafc] md:text-3xl">
          Dashboard de operación
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[#6b5d4d] dark:text-[#9fb0c7]">
          Supervisa actividad, desempeño y tendencias del sistema en un solo lugar con foco en
          métricas accionables.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 space-y-6 xl:col-span-7">
          <EcommerceMetrics />

          <MonthlySalesChart />
        </div>

        <div className="col-span-12 xl:col-span-5">
          <MonthlyTarget />
        </div>

        <div className="col-span-12">
          <StatisticsChart />
        </div>

      </div>
    </>
  );
}
