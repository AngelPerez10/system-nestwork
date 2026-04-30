import PageMeta from "@/components/common/PageMeta";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";
import { apiUrl, resolveMediaUrl } from "@/config/api";
import { Link } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

type MePayload = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
};

const getToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const authHeaders = (): HeadersInit => {
  const t = getToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
};

function initials(first: string, last: string, username: string) {
  const a = (first || "").trim().charAt(0).toUpperCase();
  const b = (last || "").trim().charAt(0).toUpperCase();
  if (a && b) return a + b;
  if (a) return a;
  const u = (username || "U").trim();
  return u.slice(0, 2).toUpperCase();
}

const cardShellClass =
  "overflow-hidden rounded-3xl border border-[#e7ded0] bg-[#fffdfa]/95 shadow-[0_30px_80px_-40px_rgba(28,25,23,0.28)] backdrop-blur-sm dark:border-[#273244] dark:bg-[#111827]/80 dark:shadow-[0_30px_80px_-45px_rgba(0,0,0,0.55)]";

const accentSectionLabelClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ea580c] dark:text-[#fb923c] sm:text-[11px]";

const claudeHeroClass =
  "[font-family:Georgia,'Times_New_Roman',serif] text-[clamp(2.2rem,4.8vw,4rem)] font-medium leading-[1.10] text-gray-950 dark:text-[#f0f0f0]";

const claudeSectionHeadingClass =
  "[font-family:Georgia,'Times_New_Roman',serif] text-[clamp(1.6rem,2.9vw,2.8rem)] font-medium leading-[1.20] text-gray-950 dark:text-[#f0f0f0]";

const claudeSubheadingClass =
  "[font-family:Georgia,'Times_New_Roman',serif] text-[clamp(1.2rem,1.9vw,2rem)] font-medium leading-[1.20] text-gray-900 dark:text-[#f0f0f0]";

const claudeBodyClass =
  "text-base font-normal leading-[1.60] text-[#57534e] dark:text-[#b7c1d1]";

const claudeCaptionClass =
  "text-sm font-normal leading-[1.43] text-[#57534e] dark:text-[#8ea0b8]";

const resendInputClass =
  "!h-11 !rounded-xl !border-[#e2d9ca] !bg-[#fffdfa] !text-[#1c1917] !placeholder:text-[#7c7a74] focus:!border-[#ff801f]/70 focus:!ring-[#ff801f]/25 dark:!border-[#334155] dark:!bg-[#0f172a] dark:!text-[#e5e7eb] dark:!placeholder:text-[#8ea0b8] dark:focus:!border-[#fb923c] dark:focus:!ring-[#fb923c]/25";

const resendOutlineBtnClass =
  "!rounded-full !border !border-[#e2d9ca] !bg-white !text-[#57534e] hover:!bg-gray-50 dark:!border-[#334155] dark:!bg-[#111a2b] dark:!text-[#e5e7eb] dark:hover:!bg-white/10";

const resendPrimaryBtnClass =
  "!rounded-full !border !border-transparent !bg-[#ff801f] !text-black hover:!bg-[#ff6a00] dark:!border-[#334155] dark:!bg-[#ff801f] dark:!text-black dark:hover:!bg-[#ff6a00]";

const darkGlassPanelClass =
  "dark:bg-[#111827]/80 dark:border-[#273244]";

const resendCodeBodyClass =
  "[font-family:'SFMono-Regular',Menlo,Monaco,Consolas,'Liberation_Mono','Courier_New',monospace] text-[15px] font-normal leading-[1.60] tracking-[-0.02em] text-gray-900 dark:text-[#f0f0f0]";
const claudeSansStyle = { fontFamily: "Outfit, sans-serif" } as const;

const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

export default function ProfilePage() {
  const [me, setMe] = useState<MePayload | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{
    show: boolean;
    variant: "success" | "error" | "info";
    title: string;
    message: string;
  }>({ show: false, variant: "info", title: "", message: "" });

  const loadMe = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/me/"), {
        method: "GET",
        headers: authHeaders(),
        cache: "no-store" as RequestCache,
      });
      const data = (await res.json().catch(() => null)) as MePayload | null;
      if (!res.ok || !data) {
        setAlert({
          show: true,
          variant: "error",
          title: "No se pudo cargar el perfil",
          message: "Vuelva a iniciar sesión o intente más tarde.",
        });
        return;
      }
      setMe(data);
      setFirstName(data.first_name || "");
      setLastName(data.last_name || "");
      setEmail(data.email || "");
      setPreviewDataUrl(null);
      setRemovePhoto(false);
      try {
        localStorage.setItem("user", JSON.stringify(data));
        sessionStorage.setItem("user", JSON.stringify(data));
      } catch {
        /* ignore */
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const hasSavedAvatar = Boolean(me?.avatar_url) && !removePhoto;
  const avatarImgSrc = useMemo(() => {
    if (previewDataUrl) return previewDataUrl;
    if (hasSavedAvatar && me?.avatar_url) return resolveMediaUrl(me.avatar_url);
    return "";
  }, [previewDataUrl, hasSavedAvatar, me?.avatar_url]);

  const showInitials = !avatarImgSrc;

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setAlert({
        show: true,
        variant: "error",
        title: "Archivo no válido",
        message: "Seleccione una imagen (JPG, PNG o WEBP).",
      });
      return;
    }
    if (f.size > 4.5 * 1024 * 1024) {
      setAlert({
        show: true,
        variant: "error",
        title: "Imagen demasiado grande",
        message: "Use una imagen de menos de 5 MB.",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r === "string") {
        setPreviewDataUrl(r);
        setRemovePhoto(false);
      }
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const persistUser = (data: MePayload) => {
    setMe(data);
    try {
      localStorage.setItem("user", JSON.stringify(data));
      sessionStorage.setItem("user", JSON.stringify(data));
      window.dispatchEvent(new Event("user:updated"));
    } catch {
      /* ignore */
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setAlert((a) => ({ ...a, show: false }));
    try {
      const body: Record<string, string> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
      };
      if (previewDataUrl) {
        body.avatar = previewDataUrl;
      } else if (removePhoto && me?.avatar_url) {
        body.avatar = "";
      }

      const res = await fetch(apiUrl("/api/me/"), {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as MePayload & { detail?: string };
      if (!res.ok) {
        setAlert({
          show: true,
          variant: "error",
          title: "No se guardaron los cambios",
          message: typeof data?.detail === "string" ? data.detail : "Revise los datos e intente de nuevo.",
        });
        return;
      }
      persistUser(data as MePayload);
      setPreviewDataUrl(null);
      setRemovePhoto(false);
      setAlert({
        show: true,
        variant: "success",
        title: "Perfil actualizado",
        message: "Los cambios se guardaron correctamente.",
      });
    } catch {
      setAlert({
        show: true,
        variant: "error",
        title: "Error de red",
        message: "Compruebe su conexión e intente de nuevo.",
      });
    } finally {
      setSaving(false);
    }
  };

  const displayName = [firstName, lastName].filter(Boolean).join(" ") || me?.username || "";

  return (
    <>
      <PageMeta title="Mi Perfil | Digitalflow" description="Editar datos personales y foto de perfil" />
      <div className="min-h-[calc(100dvh-5rem)] overflow-x-hidden">

        <motion.div
          className="relative mx-auto w-full max-w-[min(100%,88rem)] space-y-6 px-4 pb-10 pt-6 sm:space-y-8 sm:px-6 sm:pb-12 sm:pt-8 lg:px-8 xl:px-10"
          style={claudeSansStyle}
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Breadcrumbs */}
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
            <span className="text-[#44403c] dark:text-[#cbd5e1]">Mi Perfil</span>
          </motion.nav>

          {/* Header principal */}
          <motion.header variants={fadeInUp} className={`${cardShellClass} ${darkGlassPanelClass}`}>
            <div className="relative overflow-hidden">
              {/* Franja decorativa superior */}
              <div className="absolute inset-x-0 top-0 h-px bg-[#e7ded0] dark:bg-[#334155]" />

              <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:p-6 lg:p-8">
                <div className="flex min-w-0 gap-3.5 sm:gap-4">
                  {/* Icono del header */}
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#e2d9ca] bg-white text-[#1c1917] sm:h-12 sm:w-12 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f8fafc]">
                    <svg className="h-5 w-5 sm:h-[18px] sm:w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <div className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#11ff99] dark:border-black" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={accentSectionLabelClass}>Configuración de cuenta</p>
                    <h1 className={`mt-1 ${claudeHeroClass}`}>
                      Mi Perfil
                    </h1>
                    <p className={`mt-2 max-w-xl ${claudeCaptionClass}`}>
                      Gestiona tu información personal y foto de perfil. Estos datos son visibles para tu equipo.
                    </p>
                  </div>
                </div>

                {/* Tarjeta de sesión */}
                {!loading && me && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                    className="shrink-0 rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] px-5 py-4 text-right sm:min-w-[220px] dark:border-[#334155] dark:bg-[#111a2b]"
                  >
                    <p className={accentSectionLabelClass}>Sesión activa</p>
                    <p className="mt-1 truncate text-base font-medium text-gray-900 dark:text-[#f0f0f0]">
                      {displayName}
                    </p>
                    <p className={`mt-1.5 truncate ${claudeCaptionClass}`}>{me.email}</p>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.header>

          {/* Alertas */}
          <AnimatePresence mode="wait">
            {alert.show && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <Alert variant={alert.variant} title={alert.title} message={alert.message} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Formulario principal */}
          <motion.form onSubmit={handleSubmit} variants={fadeInUp} className={`${cardShellClass} ${darkGlassPanelClass}`}>
            {/* Encabezado del formulario */}
            <div className="border-b border-[#e7ded0] bg-[#fcfaf6] px-5 py-5 sm:px-6 sm:py-6 lg:px-8 dark:border-[#334155] dark:bg-[#111827]/70">
              <p className={accentSectionLabelClass}>Información personal</p>
              <h2 className={`mt-1.5 ${claudeSectionHeadingClass}`}>
                Foto y datos personales
              </h2>
              <p className={`mt-1.5 max-w-3xl ${claudeBodyClass}`}>
                Actualiza tu foto de perfil y datos de contacto. Los cambios se reflejan en toda la aplicación.
              </p>
            </div>

            {/* Grid de contenido */}
            <div className="grid grid-cols-1 lg:grid-cols-12">
              {/* Columna izquierda: Avatar */}
              <div className="border-b border-[#e7ded0] px-5 py-7 sm:px-6 sm:py-8 lg:col-span-5 lg:border-b-0 lg:border-r lg:px-8 xl:col-span-4 dark:border-[#334155]">
                <p className={accentSectionLabelClass}>Imagen de perfil</p>
                <h3 className={`mt-1 ${claudeSubheadingClass}`}>Tu foto</h3>
                <p className={`mt-1 ${claudeCaptionClass}`}>
                  Visible para todos los miembros del equipo.
                </p>

                <div className="mt-7 flex flex-col items-start gap-6 sm:flex-row sm:items-start sm:gap-8">
                  {/* Avatar container */}
                  <div className="relative group">
                    <div className="relative h-32 w-32 overflow-hidden rounded-2xl border border-[#e2d9ca] bg-white shadow-sm sm:h-36 sm:w-36 sm:rounded-3xl dark:border-[#334155] dark:bg-[#0f172a] dark:shadow-[rgba(148,163,184,0.2)_0px_0px_0px_1px]">
                      {showInitials ? (
                        <div className="flex h-full w-full items-center justify-center bg-[#ff5900]/10 text-3xl font-semibold tracking-tight text-[#ff801f] dark:bg-[#ff5900]/15 dark:text-[#ffa057]">
                          {initials(firstName, lastName, me?.username || "")}
                        </div>
                      ) : (
                        <img src={avatarImgSrc} alt="" className="h-full w-full object-cover" />
                      )}

                      {/* Overlay hover */}
                      {!loading && (
                        <motion.div
                          initial={false}
                          whileHover={{ opacity: 1 }}
                          className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 hover:bg-black/55"
                        >
                          <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            disabled={saving}
                          className="rounded-full border border-[#e2d9ca] bg-white px-3.5 py-2 text-xs font-semibold text-black transition-all hover:bg-gray-100 dark:border-[#334155] dark:bg-white dark:hover:bg-[#f0f0f0]"
                            aria-label="Cambiar foto de perfil"
                          >
                            Cambiar
                          </button>
                        </motion.div>
                      )}
                    </div>

                    {/* Indicador de estado */}
                    {!loading && hasSavedAvatar && !previewDataUrl && (
                      <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#11ff99] shadow-sm sm:-bottom-1.5 sm:-right-1.5 sm:h-7 sm:w-7 dark:border-black">
                        <svg className="h-3 w-3 text-white sm:h-3.5 sm:w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Controles de avatar */}
                  <div className="min-w-0 flex-1 space-y-4 text-left">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={onFile}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" size="sm" className={resendOutlineBtnClass} onClick={() => fileRef.current?.click()} disabled={loading || saving}>
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
                          <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
                          <line x1="12" x2="12" y1="3" y2="15" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Subir imagen
                      </Button>
                      {(Boolean(me?.avatar_url) || previewDataUrl) && !removePhoto && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className={resendOutlineBtnClass}
                          onClick={() => {
                            setPreviewDataUrl(null);
                            setRemovePhoto(true);
                          }}
                          disabled={loading || saving}
                        >
                          Quitar
                        </Button>
                      )}
                      {removePhoto && !previewDataUrl && (
                        <Button type="button" size="sm" variant="outline" className={resendOutlineBtnClass} onClick={() => setRemovePhoto(false)} disabled={loading || saving}>
                          Deshacer
                        </Button>
                      )}
                    </div>
                    <div className={`rounded-xl border border-[#e7ded0] bg-[#fcfaf6] px-3.5 py-2.5 ${claudeCaptionClass} dark:border-[#334155] dark:bg-[#111a2b]`}>
                      <span className="font-mono font-medium text-gray-900 dark:text-[#f0f0f0]">Tip:</span> Sin foto se muestran tus iniciales. Pulse{" "}
                      <span className="font-medium text-gray-900 dark:text-[#f0f0f0]">Guardar cambios</span> para aplicar.
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna derecha: Campos del formulario */}
              <div className="px-5 py-7 sm:px-6 sm:py-8 lg:col-span-7 lg:px-8 xl:col-span-8">
                <p className={accentSectionLabelClass}>Datos de contacto</p>
                <h3 className={`mt-1 ${claudeSubheadingClass}`}>Información personal</h3>
                <p className={`mt-1 ${claudeCaptionClass}`}>
                  El nombre de usuario solo puede ser modificado por un administrador.
                </p>

                <div className="mt-7">
                  {loading ? (
                    <div className="flex items-center gap-3 py-4">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-[#ff801f] dark:border-[#334155] dark:border-t-[#fb923c]" />
                      <p className={claudeCaptionClass}>Cargando datos…</p>
                    </div>
                  ) : (
                    <motion.div
                      variants={staggerContainer}
                      initial="initial"
                      animate="animate"
                      className="space-y-5"
                    >
                      <motion.div variants={fadeInUp} className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="profile-first" className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] !text-gray-700 dark:!text-[#c9d3dc]">Nombre</Label>
                          <Input
                            id="profile-first"
                            name="first_name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Tu nombre"
                            required
                            className={resendInputClass}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="profile-last" className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] !text-gray-700 dark:!text-[#c9d3dc]">Apellidos</Label>
                          <Input
                            id="profile-last"
                            name="last_name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Tus apellidos"
                            className={resendInputClass}
                          />
                        </div>
                      </motion.div>

                      <motion.div variants={fadeInUp} className="space-y-2">
                        <Label htmlFor="profile-email" className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] !text-gray-700 dark:!text-[#c9d3dc]">Correo electrónico</Label>
                        <Input
                          id="profile-email"
                          name="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="correo@empresa.com"
                          required
                          className={resendInputClass}
                        />
                      </motion.div>

                      {/* Campo de solo lectura: Usuario */}
                      <motion.div
                        variants={fadeInUp}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-[#e7ded0] bg-[#fcfaf6] px-4 py-3.5 text-sm dark:border-[#334155] dark:bg-[#111a2b]"
                      >
                        <span className="text-xs font-medium tracking-[0.12px] text-gray-600 dark:text-[#a1a4a5]">Nombre de usuario</span>
                        <code className={`rounded-md border border-[#e2d9ca] bg-white px-2.5 py-1 dark:border-[#334155] dark:bg-[#0f172a] ${resendCodeBodyClass}`}>
                          {me?.username ?? "—"}
                        </code>
                      </motion.div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer con acciones */}
            <div className="flex flex-col-reverse gap-3 border-t border-[#e7ded0] bg-[#fcfaf6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 lg:px-8 dark:border-[#334155] dark:bg-[#0f172a]/80">
              <p className={claudeCaptionClass}>
                {saving ? "Guardando cambios..." : "Los cambios se aplicarán inmediatamente"}
              </p>
              <div className="flex items-center gap-2.5">
                <Button type="button" variant="outline" className={resendOutlineBtnClass} onClick={() => loadMe()} disabled={loading || saving}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3 21v-5h5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Restaurar
                </Button>
                <Button type="submit" className={resendPrimaryBtnClass} disabled={loading || saving}>
                  {saving ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Guardando…
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" strokeLinecap="round" strokeLinejoin="round" />
                        <polyline points="17 21 17 13 7 13 7 21" strokeLinecap="round" strokeLinejoin="round" />
                        <polyline points="7 3 7 8 15 8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Guardar cambios
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.form>
        </motion.div>
      </div>
    </>
  );
}
