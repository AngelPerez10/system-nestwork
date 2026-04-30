import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative isolate min-h-dvh overflow-x-hidden bg-[#f7f5f0] text-[#1c1917] dark:bg-[#0b1018] dark:text-[#e5e7eb]">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E\")",
        }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-0 h-[30rem] w-[30rem] rounded-full bg-[#bfdbfe]/45 blur-[95px] dark:bg-[#1d4ed8]/30" />
        <div className="absolute -right-20 bottom-0 h-[24rem] w-[24rem] rounded-full bg-[#fed7aa]/45 blur-[90px] dark:bg-[#0ea5e9]/20" />
      </div>

      <header className="sticky top-0 z-20 border-b border-[#e7ded0] bg-[#f7f5f0]/90 backdrop-blur-md dark:border-[#273244] dark:bg-[#0b1018]/85">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5 sm:h-16 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#57534e] transition-colors hover:bg-black/[0.03] hover:text-[#1c1917] dark:text-[#aeb8c8] dark:hover:bg-white/5 dark:hover:text-white"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Volver al inicio
          </Link>
          <p className="hidden text-xs font-medium tracking-[0.12em] text-[#78716c] dark:text-[#8ea0b8] sm:block">
            ACCESO EMPRESARIAL
          </p>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-6xl items-center px-4 py-6 sm:min-h-[calc(100dvh-4rem)] sm:px-6 sm:py-8 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 10, scale: 0.998 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.48, ease: [0.19, 1, 0.22, 1] }}
          className="w-full overflow-hidden rounded-[28px] border border-[#e7ded0] bg-white/85 shadow-[0_30px_80px_-40px_rgba(28,25,23,0.28)] backdrop-blur-sm dark:border-[#273244] dark:bg-[#111827]/75 dark:shadow-[0_30px_80px_-45px_rgba(0,0,0,0.7)]"
        >
          <div className="grid min-h-[36rem] grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative overflow-hidden border-b border-[#e9e2d7] bg-[#fcfaf6] p-6 sm:p-8 lg:border-b-0 lg:border-r lg:border-[#e9e2d7] lg:p-10 dark:border-[#273244] dark:bg-[#0f172a]/60">
              <div className="pointer-events-none absolute -right-14 top-0 h-52 w-52 rounded-full bg-[#ffedd5]/80 blur-3xl dark:bg-[#1e293b]/60" />
              <div className="pointer-events-none absolute left-0 top-24 h-44 w-44 rounded-full bg-[#dbeafe]/80 blur-3xl dark:bg-[#0f766e]/25" />
              <div className="relative max-w-md">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ea580c] dark:text-[#fb923c]">
                  System NestWork
                </p>
                <h2 className="mt-3 [font-family:Georgia,'Times_New_Roman',serif] text-3xl font-medium leading-tight text-[#1c1917] dark:text-[#f8fafc] sm:text-4xl">
                  Controla operación, equipo y evidencias en un solo tablero.
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-[#57534e] dark:text-[#b7c1d1]">
                  Plataforma multiempresa para procesos diarios: asignación, seguimiento y trazabilidad con
                  experiencia profesional para equipos de campo.
                </p>
                <div className="mt-6 grid gap-3 text-sm text-[#44403c] dark:text-[#d5deea]">
                  <div className="flex items-start gap-2.5 rounded-xl border border-[#eadfce] bg-white/80 px-3 py-2.5 dark:border-[#2b3a52] dark:bg-[#111a2b]/70">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#ea580c] dark:text-[#fb923c]" aria-hidden />
                    <span>Sesión segura y permisos por rol para cada empresa.</span>
                  </div>
                  <div className="flex items-start gap-2.5 rounded-xl border border-[#eadfce] bg-white/80 px-3 py-2.5 dark:border-[#2b3a52] dark:bg-[#111a2b]/70">
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-[#ea580c] dark:text-[#fb923c]" aria-hidden />
                    <span>Diseño claro para trabajar rápido sin perder contexto.</span>
                  </div>
                </div>
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.08, ease: [0.19, 1, 0.22, 1] }}
              className="flex items-center p-5 sm:p-7 lg:p-10"
            >
              {children}
            </motion.div>
          </div>
        </motion.section>
      </main>
      <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
        <ThemeTogglerTwo />
      </div>
    </div>
  );
}
