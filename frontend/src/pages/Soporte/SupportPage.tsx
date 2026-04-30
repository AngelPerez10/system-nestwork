import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import PageMeta from "@/components/common/PageMeta";
import { SupportRequestForm } from "@/components/support/SupportRequestForm";
import { apiUrl } from "@/config/api";

function readStoredUserEmail(): string {
  try {
    const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!raw) return "";
    const j = JSON.parse(raw) as { email?: string };
    return (j?.email || "").trim();
  } catch {
    return "";
  }
}

function SideCard({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#e7ded0] bg-[#fffdfa]/90 p-4 shadow-sm transition-colors duration-200 dark:border-[#334155] dark:bg-[#111a2b]/90">
      <div className="flex gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ff801f]/12 text-[#c2410c] dark:bg-[#ff801f]/15 dark:text-[#fb923c]">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">{title}</h2>
          <div className="mt-2 text-xs leading-relaxed text-[#57534e] dark:text-[#9fb0c7]">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function SupportPage() {
  const reduceMotion = useReducedMotion();
  const [emailHint, setEmailHint] = useState(readStoredUserEmail);
  const token = useMemo(
    () => localStorage.getItem("token") || sessionStorage.getItem("token") || "",
    []
  );

  useEffect(() => {
    const sync = () => setEmailHint(readStoredUserEmail());
    window.addEventListener("user:updated", sync);
    return () => window.removeEventListener("user:updated", sync);
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/me/"), {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store" as RequestCache,
        });
        const data = (await res.json().catch(() => null)) as { email?: string } | null;
        if (!res.ok || !data || cancelled) return;
        const e = (data.email || "").trim();
        if (e) setEmailHint(e);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const mainCardClass =
    "overflow-hidden rounded-3xl border border-[#e7ded0] bg-[#fffdfa]/95 shadow-[0_30px_80px_-40px_rgba(28,25,23,0.22)] backdrop-blur-sm dark:border-[#273244] dark:bg-[#111827]/85 dark:shadow-[0_30px_80px_-45px_rgba(0,0,0,0.55)]";

  return (
    <>
      <PageMeta title="Soporte | System NestWork" description="Reporta fallas o solicita un plan personalizado." />
      <div className="min-w-0">
        {/* Ancho completo del main (layout ya limita a 2xl + padding); evita max-w-6xl que dejaba bandas vacías */}
        <div className="w-full px-0 py-6 sm:py-8 lg:py-10">
          {/* Encabezado: migas + título; navegación extra vía layout (sidebar / menú usuario) */}
          <header className="mb-10 border-b border-[#efe6d9] pb-8 dark:border-[#273244]">
            <nav aria-label="Migas de pan" className="mb-5 text-sm">
              <ol className="flex flex-wrap items-center gap-1.5 text-[#8b7b69] dark:text-[#8ea0b8]">
                <li>
                  <Link
                    to="/dashboard"
                    className="cursor-pointer font-medium text-[#57534e] transition-colors duration-200 hover:text-[#1c1917] dark:text-[#9fb0c7] dark:hover:text-[#f8fafc]"
                  >
                    Escritorio
                  </Link>
                </li>
                <li aria-hidden className="text-[#d6cfc4] dark:text-[#475569]">
                  /
                </li>
                <li className="font-medium text-[#1c1917] dark:text-[#f8fafc]">Soporte</li>
              </ol>
            </nav>

            <motion.div
              initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-3xl xl:max-w-4xl 2xl:max-w-none"
            >
              <h1 className="[font-family:Georgia,'Times_New_Roman',serif] text-3xl font-medium tracking-tight text-[#1c1917] dark:text-[#f8fafc] sm:text-[2.15rem] sm:leading-tight">
                Centro de soporte
              </h1>
              <p className="mt-3 text-base leading-relaxed text-[#57534e] dark:text-[#b7c1d1]">
                Incidencias técnicas o consultas sobre un plan que encaje con tu operación. Un mensaje por tema
                agiliza la respuesta.
              </p>
            </motion.div>
          </header>

          <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-10 2xl:grid-cols-[minmax(0,1fr)_360px] 2xl:gap-12">
            <motion.div
              initial={reduceMotion ? undefined : { opacity: 0, y: 6 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: reduceMotion ? 0 : 0.04, ease: [0.22, 1, 0.36, 1] }}
              className={mainCardClass}
            >
              <div className="border-b border-[#efe6d9] bg-gradient-to-r from-[#fffdfa] to-[#f5efe4]/35 px-5 py-5 dark:border-[#334155] dark:from-[#111827] dark:to-[#0f172a]/80 sm:px-8 sm:py-6">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ff801f]/12 text-[#c2410c] dark:bg-[#ff801f]/18 dark:text-[#fb923c]">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#1c1917] dark:text-[#f8fafc]">Nueva solicitud</p>
                    <p className="text-xs text-[#7a6b5b] dark:text-[#9fb0c7]">
                      Describe el caso con el mayor detalle posible.
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-5 py-6 sm:px-8 sm:py-8">
                <SupportRequestForm contactHintEmail={emailHint} />
              </div>
            </motion.div>

            <aside className="flex flex-col gap-4 lg:sticky lg:top-24" aria-label="Información de soporte">
              <SideCard
                title="Tiempo de respuesta"
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                }
              >
                <p>
                  Revisamos cada mensaje en orden de llegada. En la mayoría de los casos respondemos en{" "}
                  <span className="font-medium text-[#1c1917] dark:text-[#e5e7eb]">1 a 2 días hábiles</span>.
                </p>
              </SideCard>

              <SideCard
                title="Qué conviene incluir"
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9h6m-6 4h6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                }
              >
                <ul className="list-inside list-disc space-y-1.5 marker:text-[#ea580c]">
                  <li>Para fallos: pasos exactos, pantalla y mensaje de error si lo hay.</li>
                  <li>Para planes: tamaño del equipo, módulos que usas y objetivos.</li>
                </ul>
              </SideCard>

              <SideCard
                title="Privacidad"
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M12 3l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V7l8-4z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                }
              >
                <p>
                  Tu mensaje se envía con el contexto de tu cuenta (usuario y espacio de trabajo) solo para
                  diagnóstico y respuesta por personal autorizado.
                </p>
              </SideCard>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
