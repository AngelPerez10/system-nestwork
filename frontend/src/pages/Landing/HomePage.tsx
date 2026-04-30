import type { CSSProperties } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cubicBezier, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  BarChart3,
  Check,
  ClipboardList,
  FileText,
  Layers,
  Package,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import PageMeta from "@/components/common/PageMeta";
import { cn } from "@/lib/utils";

const easeOutExpo = cubicBezier(0.19, 1, 0.22, 1);

const sectionReveal = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.55, ease: easeOutExpo, staggerChildren: 0.08 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: easeOutExpo } },
};

const capabilities = [
  {
    title: "Multiempresa",
    desc: "Cada compañía con su espacio: datos aislados y permisos por rol.",
    detail: "",
    icon: Layers,
  },
  {
    title: "Órdenes de servicio",
    desc: "Flujo administrador y técnico, seguimiento en campo.",
    detail: "Estatus, evidencias, firmas y cierre en el mismo flujo.",
    icon: ClipboardList,
  },
  {
    title: "Clientes y contactos",
    desc: "Empresas, personas y proveedores en un solo lugar.",
    detail: "Búsqueda rápida por nombre, teléfono o RFC.",
    icon: Users,
  },
  {
    title: "Cotizaciones y PDF",
    desc: "Propuestas listas para enviar y archivar.",
    detail: "Documentos en formato profesional y listos para compartir.",
    icon: FileText,
  },
  {
    title: "Productos y servicios",
    desc: "Catálogo alineado a tu operación.",
    detail: "Precios, categorías y conceptos centralizados.",
    icon: Package,
  },
  {
    title: "Reportes e IA",
    desc: "Visibilidad operativa y asistencia inteligente.",
    detail: "Resumen de avance diario y alertas de pendientes.",
    icon: BarChart3,
  },
] as const;

const steps = [
  "Elige plan en esta página",
  "Registra administrador y empresa",
  "Activa cuenta desde el correo",
  "Opera con admin y técnico base",
] as const;
const stepNotes = [
  "Mensual o anual según cómo prefieras arrancar.",
  "Solo te pedimos datos clave para empezar rápido.",
  "Con un clic activas y validas acceso de la empresa.",
  "Desde el día uno puedes registrar clientes y órdenes.",
] as const;

/** Precios plan estándar (landing; el cobro en checkout puede venir del backend) */
const STARTER_MONTHLY_MXN = 349;
const STARTER_EXTRA_USER_MXN = 99;
const STARTER_INCLUDED_USERS = 3;
const ANNUAL_DISCOUNT = 0.1;
const STARTER_ANNUAL_TOTAL_MXN = Math.round(STARTER_MONTHLY_MXN * 12 * (1 - ANNUAL_DISCOUNT));
const STARTER_ANNUAL_EQUIV_MONTHLY = Math.round(STARTER_ANNUAL_TOTAL_MXN / 12);

const starterPlanFeatures = [
  `Hasta ${STARTER_INCLUDED_USERS} personas pueden usar el sistema con tu empresa (por ejemplo admin, técnico y otro rol)`,
  `¿Necesitas a alguien más? Cada usuario extra son $${STARTER_EXTRA_USER_MXN} MXN al mes`,
  "Tu empresa con su propio espacio; la información no se mezcla con otras",
  "Clientes, trabajos en campo, cotizaciones y PDFs en un solo lugar",
  "Catálogo de lo que vendes o das de servicio",
  "Reportes y ayuda con IA para ver cómo vas",
  "Te activamos la cuenta por correo, sin complicaciones",
] as const;

function starterRegisterPath(billing: "monthly" | "annual") {
  return `/registro-empresa?plan=starter_2_users&billing=${billing}`;
}

const customContactBullets = [
  "Escuchamos cómo trabajas hoy y qué te gustaría automatizar",
  "Te decimos qué incluiría el proyecto y a qué precio",
  "Desarrollamos lo que tu negocio necesite de verdad",
  "Seguimos contigo mientras el sistema crece contigo",
] as const;

const trustPills = ["Activacion por correo", "Multiempresa real"] as const; 

function MockDashboardPreview() {
  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-[color:var(--line)] bg-white/60 shadow-inner">
      <div className="flex items-center gap-1.5 border-b border-[color:var(--line)] bg-[#faf8f5] px-3 py-2">
        <span className="size-2.5 rounded-full bg-[#fca5a5]" />
        <span className="size-2.5 rounded-full bg-[#fde047]" />
        <span className="size-2.5 rounded-full bg-[#86efac]" />
        <span className="ml-2 text-[10px] font-medium uppercase tracking-wider text-[#78716c]">
          Vista resumen
        </span>
      </div>
      <div className="space-y-3 p-3">
        <div className="flex gap-2">
          <motion.div
            className="h-14 flex-1 rounded-md bg-gradient-to-br from-[#e0f2fe]/90 to-[#fff7ed]/80"
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          />
          <div className="h-14 w-20 rounded-md bg-[#f5f2eb]" />
        </div>
        <div className="flex gap-2">
          {[72, 88, 64].map((w, i) => (
            <div
              key={i}
              className="h-16 flex-1 rounded-md border border-[color:var(--line)] bg-white/80"
              style={{ flex: w / 100 }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-md border border-dashed border-[color:var(--line)] bg-[#faf8f5]/80 px-2 py-2">
          <div className="h-2 w-2 shrink-0 rounded-full bg-[color:var(--accent-orange)]" />
          <div className="h-2 flex-1 rounded-full bg-[#e7e5e4]" />
          <span className="text-[10px] text-[#78716c]">Sincronizado</span>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [billingTab, setBillingTab] = useState<"monthly" | "annual">("monthly");
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="relative min-h-screen overflow-x-hidden bg-[#f7f5f0] text-[#1c1917]"
      style={
        {
          ["--ink" as string]: "#1c1917",
          ["--muted" as string]: "#57534e",
          ["--line" as string]: "rgba(28, 25, 23, 0.08)",
          ["--accent-orange" as string]: "#ea580c",
          ["--accent-orange-hover" as string]: "#c2410c",
          ["--surface" as string]: "#ffffff",
          ["--surface-soft" as string]: "#f5f2eb",
        } as CSSProperties
      }
    >
      <PageMeta
        title="System NestWork | Plataforma Multiempresa"
        description="Operación, clientes, cotizaciones y servicios en una plataforma empresarial moderna."
      />

      {/* Textura sutil + luz ambiental */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.4]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, ease: easeOutExpo }}
          className="absolute -left-32 top-0 h-[42rem] w-[42rem] rounded-full bg-[#bfdbfe]/40 blur-[100px]"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.15, ease: easeOutExpo }}
          className="absolute -right-24 top-32 h-[36rem] w-[36rem] rounded-full bg-[#fed7aa]/45 blur-[100px]"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.25, ease: easeOutExpo }}
          className="absolute bottom-0 left-1/3 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[#d9f99d]/25 blur-[90px]"
        />
      </div>

      <header className="sticky top-0 z-50 border-b border-[color:var(--line)] bg-[#f7f5f0]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-5 md:h-16 md:px-6">
          <Link
            to="/"
            className="shrink-0 text-lg font-semibold tracking-tight [font-family:Georgia,'Times_New_Roman',serif] text-[color:var(--ink)]"
          >
            System NestWork
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Secciones">
            <a
              href="#capacidades"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[color:var(--muted)] transition-colors hover:bg-black/[0.03] hover:text-[color:var(--ink)]"
            >
              Capacidades
            </a>
            <a
              href="#como-empiezas"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[color:var(--muted)] transition-colors hover:bg-black/[0.03] hover:text-[color:var(--ink)]"
            >
              Cómo empiezas
            </a>
            <a
              href="#planes"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[color:var(--muted)] transition-colors hover:bg-black/[0.03] hover:text-[color:var(--ink)]"
            >
              Planes
            </a>
          </nav>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <Link
              to="/signin"
              className="rounded-lg px-2 py-2 text-sm font-medium text-[color:var(--muted)] transition-colors hover:text-[color:var(--ink)] sm:px-3 max-[380px]:hidden"
            >
              Iniciar sesión
            </Link>
            <button
              type="button"
              onClick={() => navigate(starterRegisterPath("monthly"))}
              className="rounded-lg bg-[color:var(--accent-orange)] px-2.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[color:var(--accent-orange-hover)] sm:px-4 sm:text-sm"
            >
              Registrar empresa
            </button>
          </div>
        </div>
        <nav
          className="flex border-t border-[color:var(--line)] md:hidden"
          aria-label="Secciones"
        >
          <div className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <a
              href="#capacidades"
              className="shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-[color:var(--muted)] transition-colors hover:bg-black/[0.03] hover:text-[color:var(--ink)]"
            >
              Capacidades
            </a>
            <a
              href="#como-empiezas"
              className="shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-[color:var(--muted)] transition-colors hover:bg-black/[0.03] hover:text-[color:var(--ink)]"
            >
              Cómo empiezas
            </a>
            <a
              href="#planes"
              className="shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-[color:var(--muted)] transition-colors hover:bg-black/[0.03] hover:text-[color:var(--ink)]"
            >
              Planes
            </a>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero editorial: asimetría + panel visual */}
        <section className="relative mx-auto max-w-6xl px-5 pb-16 pt-12 md:px-6 md:pb-20 md:pt-16">
          <div className="pointer-events-none absolute -left-4 top-24 hidden h-32 w-px bg-gradient-to-b from-[color:var(--accent-orange)]/50 via-[color:var(--line)] to-transparent md:block" aria-hidden />
          <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-10">
            <motion.div
              className="lg:col-span-7"
              variants={sectionReveal}
              initial="hidden"
              animate="visible"
            >
              <motion.p
                variants={fadeUp}
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[color:var(--surface)]/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#44403c] shadow-sm"
              >
                <ShieldCheck className="size-3.5 text-[#78716c]" aria-hidden />
                Plataforma multiempresa
              </motion.p>
              <motion.h1
                variants={fadeUp}
                className="mt-6 max-w-xl text-[2.35rem] font-medium leading-[1.08] tracking-[-0.02em] [font-family:Georgia,'Times_New_Roman',serif] sm:text-5xl md:text-[3.15rem]"
              >
                Una sola plataforma para operar, sin mezclar datos entre empresas.
              </motion.h1>
              <motion.p
                variants={fadeUp}
                className="mt-6 max-w-lg text-lg leading-relaxed text-[color:var(--muted)]"
              >
                Pensada para equipos de servicio y operación: clientes, órdenes, cotizaciones,
                catálogo y reportes con permisos claros por rol.
              </motion.p>
              <motion.div variants={fadeUp} className="mt-9 grid w-full grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-center">
                <button
                  type="button"
                  onClick={() => navigate(starterRegisterPath("monthly"))}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[color:var(--accent-orange)] px-5 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[color:var(--accent-orange-hover)] sm:w-auto"
                >
                  Comenzar ahora
                  <ArrowRight className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/registro-empresa?plan=custom")}
                  className="w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] px-5 py-3 text-sm font-semibold text-[color:var(--ink)] transition-colors hover:bg-[color:var(--surface-soft)] sm:w-auto"
                >
                  Hablar de algo a medida
                </button>
              </motion.div>
              <motion.div variants={fadeUp} className="mt-7 flex flex-wrap gap-2.5">
                {trustPills.map((pill) => (
                  <span
                    key={pill}
                    className="rounded-full border border-[color:var(--line)] bg-white/65 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#57534e]"
                  >
                    {pill}
                  </span>
                ))}
              </motion.div>
            </motion.div>

            <motion.div
              className="lg:col-span-5"
              initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.2, ease: easeOutExpo }}
            >
              <div className="relative rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] p-1 shadow-[0_28px_70px_-12px_rgba(28,25,23,0.16)]">
                <div className="absolute -right-3 -top-3 size-24 rounded-full bg-[color:var(--accent-orange)]/10 blur-2xl" aria-hidden />
                <div className="relative rounded-[calc(1rem-2px)] bg-gradient-to-br from-[#e0f2fe]/80 via-[#fff7ed] to-[#fef3c7]/60 p-6 md:p-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#57534e]">
                    En pocas palabras
                  </p>
                  <p className="mt-3 text-xl [font-family:Georgia,'Times_New_Roman',serif] leading-snug text-[#292524]">
                    Cada empresa con su propio espacio, tres personas para empezar y activación por correo.
                  </p>
                  <ul className="mt-6 space-y-3 text-sm text-[#44403c]">
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[color:var(--accent-orange)]" />
                      Tres usuarios listos; si necesitas más, desde ${STARTER_EXTRA_USER_MXN} MXN c/u al mes
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#0ea5e9]" />
                      Te mandamos un enlace al correo para activar la cuenta sin complicaciones
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#84cc16]" />
                      De cliente a cotización y PDF, todo enlazado
                    </li>
                  </ul>
                  <MockDashboardPreview />
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Capacidades — bento */}
        <section
          id="capacidades"
          className="scroll-mt-20 border-t border-[color:var(--line)] bg-[color:var(--surface-soft)]/50 py-20 md:py-24"
        >
          <div className="mx-auto max-w-6xl px-5 md:px-6">
            <motion.div
              variants={sectionReveal}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              className="max-w-2xl"
            >
              <motion.h2
                variants={fadeUp}
                className="text-3xl font-medium tracking-tight [font-family:Georgia,'Times_New_Roman',serif] md:text-4xl"
              >
                Todo lo que cubre el sistema
              </motion.h2>
              <motion.p variants={fadeUp} className="mt-3 text-[color:var(--muted)]">
                Módulos pensados para flujo real de trabajo, no solo listas sueltas.
              </motion.p>
            </motion.div>

            <motion.ul
              variants={sectionReveal}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.12 }}
              className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              {capabilities.map(({ title, desc, detail, icon: Icon }) => (
                <motion.li
                  key={title}
                  variants={fadeUp}
                  whileHover={reduceMotion ? undefined : { y: -4, scale: 1.01 }}
                  transition={{ duration: 0.25, ease: easeOutExpo }}
                  className={cn(
                    "group rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] p-5 shadow-sm transition-shadow hover:shadow-md",
                    title === "Multiempresa" &&
                      "sm:col-span-2 lg:col-span-2 lg:min-h-[11.5rem] bg-gradient-to-br from-[#fff7ed]/60 via-[color:var(--surface)] to-[#e0f2fe]/30 ring-1 ring-[color:var(--accent-orange)]/15",
                    title === "Reportes e IA" && "lg:col-span-2",
                  )}
                >
                  <div className="flex size-10 items-center justify-center rounded-lg bg-[#f5f2eb] text-[#44403c] transition-colors group-hover:bg-[#fff7ed] group-hover:text-[color:var(--accent-orange)]">
                    <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold [font-family:Georgia,'Times_New_Roman',serif]">
                    {title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--muted)]">{desc}</p>
                  <p className="mt-2 text-xs leading-relaxed text-[#6b7280]">{detail}</p>
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </section>

        {/* Cómo funciona */}
        <section
          id="como-empiezas"
          className="scroll-mt-20 mx-auto max-w-6xl px-5 py-20 md:px-6 md:py-24"
        >
          <motion.div
            variants={sectionReveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="mx-auto max-w-2xl text-center"
          >
            <motion.h2
              variants={fadeUp}
              className="text-3xl font-medium tracking-tight [font-family:Georgia,'Times_New_Roman',serif] md:text-4xl"
            >
              Cómo empiezas
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-3 text-[color:var(--muted)]">
              Flujo claro desde el primer clic hasta el primer día operando.
            </motion.p>
          </motion.div>

          <div className="relative mt-12">
            <div
              className="pointer-events-none absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-[color:var(--line)] to-transparent md:block"
              aria-hidden
            />
            <motion.ol
              variants={sectionReveal}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.18 }}
              className="grid gap-6 md:grid-cols-4"
            >
              {steps.map((label, i) => (
                <motion.li
                  key={label}
                  variants={fadeUp}
                  whileHover={reduceMotion ? undefined : { y: -3 }}
                  className="relative"
                >
                  <div className="flex flex-col items-center text-center">
                    <motion.span
                      whileHover={reduceMotion ? undefined : { scale: 1.05 }}
                      className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--line)] bg-[color:var(--surface)] text-sm font-bold text-[color:var(--ink)] shadow-sm"
                    >
                      {i + 1}
                    </motion.span>
                    <p className="mt-4 text-sm font-medium leading-snug text-[#292524]">{label}</p>
                    <p className="mt-2 text-xs leading-relaxed text-[#6b7280]">{stepNotes[i]}</p>
                  </div>
                </motion.li>
              ))}
            </motion.ol>
          </div>
        </section>

        {/* Planes */}
        <section
          id="planes"
          className="scroll-mt-20 border-t border-[color:var(--line)] bg-[#faf8f5] py-20 md:py-24"
        >
          <div className="mx-auto max-w-6xl px-5 md:px-6">
            <motion.div
              variants={sectionReveal}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              className="mx-auto max-w-2xl text-center"
            >
              <motion.h2
                variants={fadeUp}
                className="text-3xl font-medium tracking-tight [font-family:Georgia,'Times_New_Roman',serif] md:text-4xl"
              >
                ¿Cómo quieres empezar?
              </motion.h2>
              <motion.p variants={fadeUp} className="mt-3 text-[color:var(--muted)]">
                Puedes entrar con el plan que ya incluye todo lo esencial, o escribirnos si necesitas algo hecho a
                medida para tu negocio.
              </motion.p>
            </motion.div>

            <motion.div
              variants={sectionReveal}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              className="mx-auto mt-8 max-w-md"
            >
              <div
                className="flex rounded-xl border border-[color:var(--line)] bg-[#faf8f5] p-1"
                role="tablist"
                aria-label="Facturación plan estándar"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={billingTab === "monthly"}
                  onClick={() => setBillingTab("monthly")}
                  className={cn(
                    "flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                    billingTab === "monthly"
                      ? "bg-[color:var(--surface)] text-[color:var(--ink)] shadow-sm"
                      : "text-[color:var(--muted)] hover:text-[color:var(--ink)]",
                  )}
                >
                  Mensual
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={billingTab === "annual"}
                  onClick={() => setBillingTab("annual")}
                  className={cn(
                    "relative flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                    billingTab === "annual"
                      ? "bg-[color:var(--surface)] text-[color:var(--ink)] shadow-sm"
                      : "text-[color:var(--muted)] hover:text-[color:var(--ink)]",
                  )}
                >
                  Anual
                  <span className="ml-1.5 rounded-md bg-[color:var(--accent-orange)]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--accent-orange)]">
                    −10%
                  </span>
                </button>
              </div>
            </motion.div>

            <motion.div
              variants={sectionReveal}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              className="mt-12 grid gap-6 md:grid-cols-2 md:items-stretch"
            >
              <motion.article
                variants={fadeUp}
                whileHover={reduceMotion ? undefined : { y: -3 }}
                className="flex flex-col rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] p-8 shadow-sm transition-shadow hover:shadow-md"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#57534e]">
                  Lo esencial · {STARTER_INCLUDED_USERS} usuarios · Listo para trabajar
                </p>
                <h3 className="mt-3 text-2xl [font-family:Georgia,'Times_New_Roman',serif]">
                  Plan Estándar
                </h3>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  Para equipos que quieren ordenar clientes, trabajos y cobros sin enredarse en hojas sueltas.
                </p>

                {billingTab === "monthly" ? (
                  <>
                    <p className="mt-6">
                      <span className="text-4xl font-semibold tracking-tight text-[color:var(--ink)]">
                        ${STARTER_MONTHLY_MXN.toLocaleString("es-MX")}
                      </span>
                      <span className="ml-1 text-lg font-medium text-[color:var(--muted)]">MXN</span>
                      <span className="ml-2 text-sm text-[color:var(--muted)]">/ mes</span>
                    </p>
                    <p className="mt-1 text-xs text-[#78716c]">
                      Cada persona extra: ${STARTER_EXTRA_USER_MXN} MXN al mes. Precios en pesos mexicanos; IVA aparte.
                    </p>
                  </>
                ) : (
                  <div className="mt-6 rounded-lg border border-[color:var(--line)] bg-[#faf8f5]/80 px-3.5 py-3">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-2xl font-semibold tracking-tight text-[color:var(--ink)] tabular-nums">
                        ${STARTER_ANNUAL_TOTAL_MXN.toLocaleString("es-MX")}
                      </span>
                      <span className="text-sm text-[color:var(--muted)]">MXN / año</span>
                      <span className="rounded bg-[color:var(--accent-orange)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        −{Math.round(ANNUAL_DISCOUNT * 100)}%
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-[#78716c]">
                      <span
                        className="font-medium tabular-nums line-through decoration-2 [text-decoration-color:rgb(220_38_38)] [text-decoration-thickness:2px]"
                        aria-label={`Antes ${(STARTER_MONTHLY_MXN * 12).toLocaleString("es-MX")} MXN al año`}
                      >
                        ${(STARTER_MONTHLY_MXN * 12).toLocaleString("es-MX")} MXN
                      </span>
                      <span className="ml-1.5">al pagar mes a mes</span>
                    </p>
                    <p className="mt-1.5 text-xs leading-snug text-[color:var(--muted)]">
                      ≈ ${STARTER_ANNUAL_EQUIV_MONTHLY.toLocaleString("es-MX")} MXN/mes · un cobro al año · extras{" "}
                      ${STARTER_EXTRA_USER_MXN} c/u · IVA aparte
                    </p>
                  </div>
                )}

                <ul className="mt-6 flex-1 space-y-3 text-sm text-[#292524]" role="list">
                  {starterPlanFeatures.map((line) => (
                    <li key={line} className="flex gap-2.5">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-[color:var(--accent-orange)]"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => navigate(starterRegisterPath(billingTab))}
                  className="mt-8 w-full rounded-lg bg-[color:var(--accent-orange)] py-3 text-sm font-semibold text-white transition-colors hover:bg-[color:var(--accent-orange-hover)]"
                >
                  Empezar con este plan
                </button>
              </motion.article>

              <motion.article
                variants={fadeUp}
                whileHover={reduceMotion ? undefined : { y: -3 }}
                className="flex flex-col rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] p-8 shadow-sm ring-1 ring-[#ca8a04]/20 transition-shadow hover:shadow-md"
              >
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#57534e]">
                  <Sparkles className="size-3.5 text-[#ca8a04]" aria-hidden />
                  A tu medida
                </p>
                <h3 className="mt-3 text-2xl [font-family:Georgia,'Times_New_Roman',serif]">
                  Hablemos de lo que necesitas
                </h3>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  Si tu operación pide conectar con otros sistemas, reglas muy específicas o algo que no existe en el
                  plan de siempre, escríbenos. Te decimos si se puede, en qué tiempo y a qué costo.
                </p>
                <p className="mt-6 rounded-lg bg-[#fffbeb] px-4 py-3 text-sm font-medium text-[#78350f]">
                  Precio según lo que acordemos.
                </p>
                <ul className="mt-6 flex-1 space-y-3 text-sm text-[#292524]" role="list">
                  {customContactBullets.map((line) => (
                    <li key={line} className="flex gap-2.5">
                      <Check
                        className="mt-0.5 size-4 shrink-0 text-[#ca8a04]"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => navigate("/registro-empresa?plan=custom")}
                  className="mt-6 w-full rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] py-3 text-sm font-semibold text-[color:var(--ink)] transition-colors hover:bg-[color:var(--surface-soft)]"
                >
                  Pedir una propuesta
                </button>
              </motion.article>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[color:var(--line)] bg-[#f7f5f0] py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 md:flex-row md:items-center md:justify-between md:px-6">
          <p className="text-sm text-[color:var(--muted)]">
            © {new Date().getFullYear()} System NestWork
          </p>
          <div className="flex flex-wrap gap-6 text-sm font-medium">
            <Link to="/signin" className="text-[color:var(--muted)] hover:text-[color:var(--ink)]">
              Iniciar sesión
            </Link>
            <Link
              to={starterRegisterPath("monthly")}
              className="text-[color:var(--muted)] hover:text-[color:var(--ink)]"
            >
              Registrar empresa
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
