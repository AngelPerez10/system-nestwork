import type { CSSProperties, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { cubicBezier, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Lock, Mail, Sparkles, User, Building2 } from "lucide-react";
import PageMeta from "@/components/common/PageMeta";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/config/api";

type SubmitState = "idle" | "submitting" | "success" | "error";

type Pricing = {
  base_mxn: string;
  iva_rate: string;
  monthly_total_mxn: string;
  currency: string;
};

const easeOut = cubicBezier(0.19, 1, 0.22, 1);
const reveal = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.45, ease: easeOut, staggerChildren: 0.07 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: easeOut } },
};

/** Logo en `public/` (evita hotlink y coincide con la marca que subiste). */
const MERCADO_PAGO_LOGO_SRC = "/images/logo/Mercado_Pago.png";

function MercadoPagoLogo({ className, compact }: { className?: string; compact?: boolean }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={cn(
          "inline-flex items-baseline gap-0.5 rounded-md bg-[#009ee3] px-2 py-1 font-bold leading-none text-white",
          compact ? "text-xs" : "text-sm",
          className,
        )}
        role="img"
        aria-label="Mercado Pago"
      >
        <span className="font-serif font-medium tracking-tight text-white/95">mercado</span>
        <span className="rounded bg-white/15 px-1 text-white">pago</span>
      </div>
    );
  }

  return (
    <img
      src={MERCADO_PAGO_LOGO_SRC}
      alt="Mercado Pago"
      width={compact ? 120 : 160}
      height={compact ? 32 : 40}
      className={cn(
        "h-auto w-auto max-h-8 object-contain object-left max-w-[9rem] sm:max-h-9 sm:max-w-[10rem]",
        compact && "max-h-7 max-w-[6.5rem] sm:max-h-8 sm:max-w-[7.25rem]",
        className,
      )}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

export default function CompanyRegistrationPage() {
  const [params, setParams] = useSearchParams();
  const selectedPlan = (params.get("plan") || "starter_2_users").toLowerCase();
  const isCustomPlan = selectedPlan === "custom";
  const billing = (params.get("billing") || "monthly").toLowerCase();
  const isAnnualBilling = !isCustomPlan && billing === "annual";
  const mpStatus = (params.get("mp") || "").toLowerCase();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [customRequirements, setCustomRequirements] = useState("");
  const [status, setStatus] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const reduceMotion = useReducedMotion();

  const submitEndpoint = useMemo(
    () => (isCustomPlan ? "/api/onboarding/custom-plan-lead/" : "/api/onboarding/register-company/"),
    [isCustomPlan],
  );

  /** Evita franja negra: en dark el body usa fondo #000; vh/dvh o zoom pueden dejar un hueco visible. */
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.backgroundColor;
    const prevBody = body.style.backgroundColor;
    html.style.backgroundColor = "#f7f5f0";
    body.style.backgroundColor = "#f7f5f0";
    return () => {
      html.style.backgroundColor = prevHtml;
      body.style.backgroundColor = prevBody;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/onboarding/starter-pricing/"));
        const data = await res.json().catch(() => null);
        if (!cancelled && data?.monthly_total_mxn) setPricing(data);
      } catch {
        if (!cancelled) setPricing(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mpStatus) return;
    if (mpStatus === "success") {
      setMessage(
        "Si ya diste el sí en Mercado Pago, en unos minutos debería llegarte un correo para activar la cuenta. Revisa también la carpeta de spam.",
      );
      setStatus("success");
    } else if (mpStatus === "failure") {
      setMessage("No se pudo completar el cobro. No pasa nada: puedes intentar otra vez con los mismos datos.");
      setStatus("error");
    } else if (mpStatus === "pending") {
      setMessage("El pago sigue en revisión. Cuando se confirme, te avisamos por correo.");
      setStatus("success");
    } else if (mpStatus === "return") {
      setMessage(
        "Si terminaste el paso en Mercado Pago, revisa tu correo. Si cerraste antes de tiempo, vuelve a enviar el formulario.",
      );
      setStatus("success");
    }
  }, [mpStatus]);

  const clearMpQuery = () => {
    const next = new URLSearchParams(params);
    next.delete("mp");
    setParams(next, { replace: true });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setMessage("");

    if (isCustomPlan) {
      try {
        const res = await fetch(apiUrl(submitEndpoint), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            email,
            company_name: companyName,
            plan: selectedPlan,
            custom_requirements: customRequirements.trim(),
          }),
        });
        const data = await res.json().catch(() => ({ detail: "Respuesta inválida" }));
        if (!res.ok) throw new Error(data.detail || "No se pudo procesar la solicitud");
        setStatus("success");
        setMessage("Listo, recibimos tu mensaje. En breve alguien del equipo te contacta.");
      } catch (error: unknown) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "No se pudo completar el registro.");
      }
      return;
    }

    try {
      const checkoutRes = await fetch(apiUrl("/api/onboarding/create-checkout/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          company_name: companyName,
        }),
      });
      const checkoutData = await checkoutRes.json().catch(() => ({}));

      if (checkoutRes.ok && checkoutData.init_point) {
        window.location.href = checkoutData.init_point as string;
        return;
      }

      if (checkoutRes.status === 503) {
        const res = await fetch(apiUrl(submitEndpoint), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            email,
            company_name: companyName,
            plan: selectedPlan,
          }),
        });
        const data = await res.json().catch(() => ({ detail: "Respuesta inválida" }));
        if (!res.ok) throw new Error(data.detail || "No se pudo procesar la solicitud");
        setStatus("success");
        setMessage("Empresa creada. Revisa tu correo para activar tu cuenta.");
        return;
      }

      throw new Error(
        (checkoutData.detail as string) || "No se pudo abrir el pago con Mercado Pago. Intenta más tarde.",
      );
    } catch (error: unknown) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "No se pudo completar el registro.");
    }
  };

  const ivaPercent = pricing ? Math.round(Number(pricing.iva_rate) * 100) : 16;

  return (
    <div
      className="relative isolate min-h-dvh overflow-x-hidden bg-[#f7f5f0] text-[#1c1917]"
      style={
        {
          ["--ink" as string]: "#1c1917",
          ["--muted" as string]: "#57534e",
          ["--line" as string]: "rgba(28, 25, 23, 0.08)",
          ["--accent-orange" as string]: "#ea580c",
          ["--accent-orange-hover" as string]: "#c2410c",
          ["--surface" as string]: "#ffffff",
          ["--surface-soft" as string]: "#f5f2eb",
          ["--mp-blue" as string]: "#009ee3",
        } as CSSProperties
      }
    >
      <PageMeta
        title="Registro de empresa | System NestWork"
        description="Registra tu empresa para crear su espacio aislado."
      />

      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-24 top-20 h-[32rem] w-[32rem] rounded-full bg-[#009ee3]/[0.07] blur-[100px]" />
        <div className="absolute -left-20 bottom-0 h-[24rem] w-[24rem] rounded-full bg-[#fed7aa]/40 blur-[90px]" />
      </div>

      <header className="sticky top-0 z-20 border-b border-[color:var(--line)] bg-[#f7f5f0]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-5 md:h-16 md:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--muted)] transition-colors hover:text-[color:var(--ink)]"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">Volver al inicio</span>
            <span className="sm:hidden">Inicio</span>
          </Link>
          <Link
            to="/signin"
            className="text-sm font-medium text-[color:var(--accent-orange)] hover:text-[color:var(--accent-orange-hover)]"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10 pb-16 md:px-8 md:py-14">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12 lg:items-start">
          {/* Columna editorial */}
          <motion.div
            className="lg:col-span-5"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeOut }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#78716c]">System Nestwork</p>
            <h1 className="mt-3 text-3xl font-medium leading-[1.12] tracking-tight text-[color:var(--ink)] [font-family:Georgia,'Times_New_Roman',serif] md:text-[2.25rem]">
              {isCustomPlan ? "Cuéntanos qué tienes en mente" : "Crea tu espacio en unos minutos"}
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-[color:var(--muted)]">
              {isCustomPlan
                ? "Aquí solo pedimos lo básico para poder escribirte. Sin pagos en esta pantalla."
                : isAnnualBilling
                  ? "Vas por el pago anual con descuento. Llena el formulario y en el siguiente paso confirmas todo con Mercado Pago, de forma segura."
                  : "Rellena el formulario y te llevamos a Mercado Pago para activar la suscripción. Ahí pagas con lo que ya usas: tarjeta, transferencia, etc."}
            </p>

            {!isCustomPlan && (
              <div className="mt-8 rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)]/90 p-5 shadow-sm ring-1 ring-black/[0.02] backdrop-blur-sm">
                <div className="flex items-center justify-between gap-4 border-b border-[color:var(--line)] pb-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#78716c]">
                      Pagos con
                    </p>
                    <div className="mt-2">
                      <MercadoPagoLogo />
                    </div>
                  </div>
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#009ee3]/10 text-[color:var(--mp-blue)]">
                    <Lock className="size-5" strokeWidth={1.75} aria-hidden />
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-[#44403c]">
                  No guardamos datos de tu tarjeta aquí: el cobro lo hace Mercado Pago. Tú cancelas la suscripción
                  cuando quieras desde tu cuenta de ellos.
                </p>
                <div className="mt-4 rounded-xl bg-gradient-to-br from-[#e0f2fe]/50 to-[#fff7ed]/60 px-3 py-2.5 text-xs text-[#57534e]">
                  <span className="font-medium text-[#292524]">Suscripción mensual</span>
                  {isAnnualBilling ? " (modalidad anual en checkout según tu elección en el sitio)." : "."} Base{" "}
                  <span className="tabular-nums font-semibold text-[#292524]">${pricing?.base_mxn ?? "200.00"}</span>{" "}
                  + IVA {ivaPercent}% →{" "}
                  <span className="tabular-nums font-semibold text-[color:var(--accent-orange)]">
                    ${pricing?.monthly_total_mxn ?? "232.00"} MXN
                  </span>{" "}
                  / mes · IVA incluido en ese total.
                </div>
              </div>
            )}

            {isCustomPlan && (
              <div className="mt-8 flex items-start gap-3 rounded-2xl border border-[color:var(--line)] bg-[#fffbeb]/80 p-5">
                <Sparkles className="mt-0.5 size-5 shrink-0 text-[#ca8a04]" aria-hidden />
                <p className="text-sm leading-relaxed text-[#57534e]">
                  Si lo que buscas es distinto al plan de siempre, con gusto lo vemos contigo y te decimos si encaja y
                  cuánto podría costar.
                </p>
              </div>
            )}
          </motion.div>

          {/* Formulario */}
          <motion.div
            className="lg:col-span-7"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.06, ease: easeOut }}
          >
            <motion.div
              whileHover={reduceMotion ? undefined : { y: -2 }}
              className="relative overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] shadow-[0_28px_70px_-18px_rgba(28,25,23,0.14)]"
            >
              <div
                className="pointer-events-none absolute right-0 top-0 h-40 w-40 translate-x-1/4 -translate-y-1/4 rounded-full bg-[color:var(--accent-orange)]/[0.06] blur-3xl"
                aria-hidden
              />
              <div className="relative p-6 sm:p-8 md:p-9">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                      isCustomPlan
                        ? "border-[color:var(--line)] text-[#57534e]"
                        : "border-[color:var(--line)] bg-[#faf8f5] text-[#44403c]",
                    )}
                  >
                    {isCustomPlan ? (
                      <>
                        <Sparkles className="size-3.5 text-[#ca8a04]" aria-hidden />
                        Proyecto a medida
                      </>
                    ) : (
                      <>
                        <span className="size-1.5 rounded-full bg-[color:var(--accent-orange)]" aria-hidden />
                        Plan estándar
                      </>
                    )}
                  </span>
                  {!isCustomPlan && (
                    <span className="text-xs text-[#78716c]">
                      {isAnnualBilling ? "Facturación anual desde el inicio" : "Facturación mes a mes"}
                    </span>
                  )}
                </div>

                <h2 className="mt-4 text-xl font-medium text-[color:var(--ink)] [font-family:Georgia,'Times_New_Roman',serif] md:text-2xl">
                  {isCustomPlan ? "Tus datos de contacto" : "Quién administra la cuenta"}
                </h2>
                <p className="mt-2 text-sm text-[color:var(--muted)]">
                  {isCustomPlan
                    ? "Datos de contacto y, abajo, qué quieres construir o integrar."
                    : "La persona que recibirá el correo para poner su contraseña y entrar al sistema."}
                </p>

                <motion.form
                  onSubmit={handleSubmit}
                  variants={reveal}
                  initial="hidden"
                  animate="visible"
                  className="mt-8 space-y-5"
                >
                  <motion.div variants={fadeUp} className="grid gap-5 sm:grid-cols-2">
                    <motion.div variants={fadeUp}>
                      <Field
                      label="Nombre"
                      value={firstName}
                      onChange={setFirstName}
                      autoComplete="given-name"
                      icon={<User className="size-4" strokeWidth={1.75} aria-hidden />}
                    />
                    </motion.div>
                    <motion.div variants={fadeUp}>
                      <Field
                      label="Apellidos"
                      value={lastName}
                      onChange={setLastName}
                      autoComplete="family-name"
                      icon={<User className="size-4" strokeWidth={1.75} aria-hidden />}
                    />
                    </motion.div>
                  </motion.div>
                  <motion.div variants={fadeUp}>
                    <Field
                    label="Correo electrónico"
                    value={email}
                    onChange={setEmail}
                    type="email"
                    autoComplete="email"
                    icon={<Mail className="size-4" strokeWidth={1.75} aria-hidden />}
                  />
                  </motion.div>
                  <motion.div variants={fadeUp}>
                    <Field
                    label="Nombre de la empresa"
                    value={companyName}
                    onChange={setCompanyName}
                    autoComplete="organization"
                    icon={<Building2 className="size-4" strokeWidth={1.75} aria-hidden />}
                  />
                  </motion.div>

                  {isCustomPlan && (
                    <motion.div variants={fadeUp}>
                      <TextAreaField
                      label="Qué necesitas del sistema"
                      value={customRequirements}
                      onChange={setCustomRequirements}
                      required
                      hint="Describe módulos, integraciones, flujos o cualquier funcionalidad nueva que tengas en mente. Entre más contexto, mejor."
                      placeholder="Ej.: integración con inventario, reportes por sucursal, permisos por rol, app móvil para técnicos…"
                    />
                    </motion.div>
                  )}

                  {message && (
                    <motion.div
                      variants={fadeUp}
                      role="status"
                      className={cn(
                        "rounded-xl border px-4 py-3.5 text-sm leading-relaxed",
                        status === "success"
                          ? "border-[color:var(--accent-orange)]/25 bg-[#fff7ed] text-[#7c2d12]"
                          : "border-red-200 bg-red-50 text-red-800",
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p>{message}</p>
                        {mpStatus && (
                          <button
                            type="button"
                            onClick={clearMpQuery}
                            className="shrink-0 text-xs font-medium text-[color:var(--muted)] underline underline-offset-2 hover:text-[color:var(--ink)]"
                          >
                            Cerrar
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}

                  <motion.button
                    variants={fadeUp}
                    type="submit"
                    disabled={status === "submitting"}
                    whileHover={reduceMotion ? undefined : { scale: 1.01 }}
                    whileTap={reduceMotion ? undefined : { scale: 0.99 }}
                    className="group relative mt-2 flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-[color:var(--accent-orange)] px-4 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-[color:var(--accent-orange-hover)] disabled:opacity-65"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 transition-opacity group-hover:opacity-100" />
                    {status === "submitting" ? (
                      <span className="relative">Un momento…</span>
                    ) : isCustomPlan ? (
                      <span className="relative">Enviar mensaje</span>
                    ) : (
                      <>
                        <span className="relative">Continuar con</span>
                        <span className="relative flex items-center rounded-md bg-white px-2 py-1 shadow-sm">
                          <MercadoPagoLogo compact className="max-w-[5.25rem]" />
                        </span>
                      </>
                    )}
                  </motion.button>

                  {!isCustomPlan && (
                    <motion.p variants={fadeUp} className="text-center text-xs leading-relaxed text-[#78716c]">
                      Al continuar abres el checkout de Mercado Pago en esta misma ventana o en una nueva, según tu
                      navegador.
                    </motion.p>
                  )}
                </motion.form>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[color:var(--line)] pt-6 text-sm text-[color:var(--muted)]">
                  <Link to="/" className="font-medium hover:text-[color:var(--ink)]">
                    ← Portada
                  </Link>
                  <p className="text-xs text-[#a8a29e]">¿Dudas? Escríbenos desde el plan a medida.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  required: isRequired,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[#44403c]">{label}</span>
      <textarea
        required={isRequired}
        value={value}
        rows={5}
        placeholder={placeholder}
        maxLength={8000}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "min-h-[7.5rem] w-full resize-y rounded-xl border border-[color:var(--line)] bg-[#fafaf9] px-3.5 py-3 text-sm leading-relaxed text-[color:var(--ink)] outline-none transition-all placeholder:text-[#a8a29e] focus:border-[color:var(--accent-orange)]/40 focus:bg-[color:var(--surface)] focus:ring-2 focus:ring-[color:var(--accent-orange)]/12",
        )}
      />
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#a8a29e]">
        {hint ? <span className="max-w-prose text-[color:var(--muted)]">{hint}</span> : <span />}
        <span className="tabular-nums">{value.length} / 8000</span>
      </div>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
  icon?: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[#44403c]">{label}</span>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a8a29e]">{icon}</span>
        )}
        <input
          required
          value={value}
          type={type}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "h-12 w-full rounded-xl border border-[color:var(--line)] bg-[#fafaf9] px-3.5 text-sm text-[color:var(--ink)] outline-none transition-all placeholder:text-[#a8a29e] focus:border-[color:var(--accent-orange)]/40 focus:bg-[color:var(--surface)] focus:ring-2 focus:ring-[color:var(--accent-orange)]/12",
            icon && "pl-11",
          )}
        />
      </div>
    </label>
  );
}
