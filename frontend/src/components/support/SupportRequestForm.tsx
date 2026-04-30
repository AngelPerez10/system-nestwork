import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useReducedMotion, motion, AnimatePresence } from "motion/react";
import { apiUrl } from "@/config/api";

export type SupportCategory = "bug" | "plan";

const DRAFT_KEY = "nestwork-support-draft-v1";
const SUBJECT_MAX = 120;
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 8000;

type Props = {
  contactHintEmail?: string;
  className?: string;
};

const getToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token") || "";

function loadDraft(): { category: SupportCategory; subject: string; message: string } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as {
      category?: string;
      subject?: string;
      message?: string;
    };
    const category = j.category === "plan" ? "plan" : "bug";
    return {
      category,
      subject: typeof j.subject === "string" ? j.subject.slice(0, SUBJECT_MAX) : "",
      message: typeof j.message === "string" ? j.message.slice(0, MESSAGE_MAX) : "",
    };
  } catch {
    return null;
  }
}

function saveDraft(category: SupportCategory, subject: string, message: string) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ category, subject, message }));
  } catch {
    /* ignore quota */
  }
}

export function SupportRequestForm({ contactHintEmail = "", className = "" }: Props) {
  const reduceMotion = useReducedMotion();
  const formId = useId();
  const subjectId = `${formId}-subject`;
  const messageId = `${formId}-message`;
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const [supportCategory, setSupportCategory] = useState<SupportCategory>("bug");
  const [subject, setSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [messageTouched, setMessageTouched] = useState(false);
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportBanner, setSupportBanner] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    const d = loadDraft();
    if (d && (d.subject.trim().length > 0 || d.message.trim().length > 0)) {
      setSupportCategory(d.category);
      setSubject(d.subject);
      setSupportMessage(d.message);
      setDraftRestored(true);
    }
  }, []);

  useEffect(() => {
    if (!draftRestored) return;
    const id = window.setTimeout(() => setDraftRestored(false), 7000);
    return () => window.clearTimeout(id);
  }, [draftRestored]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      saveDraft(supportCategory, subject, supportMessage);
    }, 400);
    return () => window.clearTimeout(t);
  }, [supportCategory, subject, supportMessage]);

  const trimmedMessage = supportMessage.trim();
  const trimmedSubject = subject.trim();
  const messageTooShort = trimmedMessage.length > 0 && trimmedMessage.length < MESSAGE_MIN;
  const showMessageHint = messageTouched && messageTooShort;

  const composedLength = useMemo(() => {
    const prefix = trimmedSubject ? `[Resumen: ${trimmedSubject}]\n\n` : "";
    return prefix.length + trimmedMessage.length;
  }, [trimmedSubject, trimmedMessage]);

  const overLimit = composedLength > MESSAGE_MAX;

  const buildPayloadMessage = useCallback(() => {
    const body = trimmedMessage;
    if (!trimmedSubject) return body;
    return `[Resumen: ${trimmedSubject}]\n\n${body}`;
  }, [trimmedMessage, trimmedSubject]);

  async function handleSupportSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessageTouched(true);
    const token = getToken();
    if (!token) {
      setSupportBanner({ type: "err", text: "No hay sesión activa. Vuelve a iniciar sesión." });
      return;
    }
    if (trimmedMessage.length < MESSAGE_MIN) {
      setSupportBanner({
        type: "err",
        text: `El mensaje debe tener al menos ${MESSAGE_MIN} caracteres.`,
      });
      messageRef.current?.focus();
      return;
    }
    if (overLimit) {
      setSupportBanner({
        type: "err",
        text: `El texto total supera ${MESSAGE_MAX} caracteres (incluye resumen + mensaje).`,
      });
      return;
    }
    setSupportSubmitting(true);
    setSupportBanner(null);
    try {
      const res = await fetch(apiUrl("/api/me/support/"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category: supportCategory,
          message: buildPayloadMessage(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setSupportBanner({
          type: "err",
          text: "Límite de envíos alcanzado. Espera unos minutos e inténtalo de nuevo.",
        });
        return;
      }
      if (!res.ok) {
        setSupportBanner({
          type: "err",
          text: (data as { detail?: string })?.detail || "No se pudo enviar. Intenta de nuevo.",
        });
        return;
      }
      setSupportBanner({
        type: "ok",
        text:
          (data as { detail?: string })?.detail ||
          "Gracias. Recibimos tu mensaje y el equipo te contactará cuando corresponda.",
      });
      setSupportMessage("");
      setSubject("");
      setMessageTouched(false);
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
    } catch {
      setSupportBanner({ type: "err", text: "Error de red. Intenta más tarde." });
    } finally {
      setSupportSubmitting(false);
    }
  }

  function handleSendAnother() {
    setSupportBanner(null);
    setSupportCategory("bug");
  }

  return (
    <div className={`[font-family:'Arial','Helvetica_Neue',Helvetica,sans-serif] ${className}`.trim()}>
      <AnimatePresence mode="wait">
        {supportBanner?.type === "ok" ? (
          <motion.div
            key="success"
            role="status"
            initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl border border-emerald-200 bg-emerald-50/95 px-5 py-6 dark:border-emerald-900/50 dark:bg-emerald-950/40"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M20 6L9 17l-5-5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-100">
                    Envío correcto
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-emerald-900/90 dark:text-emerald-100/90">
                    {supportBanner.text}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSendAnother}
                className="shrink-0 cursor-pointer rounded-xl border border-emerald-300/80 bg-white px-4 py-2 text-sm font-medium text-emerald-900 transition-colors duration-200 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100 dark:hover:bg-emerald-900/40"
              >
                Enviar otro mensaje
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            id={`${formId}-support-form`}
            onSubmit={handleSupportSubmit}
            initial={reduceMotion ? undefined : { opacity: 0, y: 6 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-6"
            noValidate
          >
            {draftRestored && (
              <p className="text-xs text-[#8b7b69] dark:text-[#8ea0b8]" role="status">
                Se restauró un borrador guardado en este dispositivo.
              </p>
            )}

            {supportBanner?.type === "err" && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100"
              >
                {supportBanner.text}
              </div>
            )}

            <div>
              <label
                htmlFor={subjectId}
                className="mb-1.5 flex items-baseline justify-between gap-2"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8b7b69] dark:text-[#8ea0b8]">
                  Resumen breve <span className="font-normal normal-case text-[#a8a29e]"></span>
                </span>
                <span className="text-xs tabular-nums text-[#8b7b69] dark:text-[#8ea0b8]">
                  {subject.length}/{SUBJECT_MAX}
                </span>
              </label>
              <input
                id={subjectId}
                type="text"
                maxLength={SUBJECT_MAX}
                value={subject}
                onChange={(ev) => {
                  setSubject(ev.target.value);
                  if (supportBanner?.type === "err") setSupportBanner(null);
                }}
                placeholder="Escribe un resumen breve de tu mensaje..."
                className="w-full rounded-xl border border-[#e2d9ca] bg-[#fffdfa] px-3 py-2.5 text-sm text-[#1c1917] placeholder:text-[#a8a29e] focus:border-[#ff801f] focus:outline-none focus:ring-2 focus:ring-[#ff801f]/20 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:placeholder:text-[#64748b] dark:focus:border-[#fb923c] dark:focus:ring-[#fb923c]/25"
              />
            </div>

            <div>
              <label htmlFor={messageId} className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[#8b7b69] dark:text-[#8ea0b8]">
                Detalle
              </label>
              <textarea
                ref={messageRef}
                id={messageId}
                value={supportMessage}
                onChange={(ev) => {
                  setSupportMessage(ev.target.value);
                  if (supportBanner?.type === "err") setSupportBanner(null);
                }}
                onBlur={() => setMessageTouched(true)}
                rows={9}
                maxLength={MESSAGE_MAX}
                aria-invalid={showMessageHint || overLimit}
                aria-describedby={`${formId}-msg-help ${formId}-msg-count`}
                placeholder="Escribe tu mensaje aquí..."
                className="min-h-[200px] w-full resize-y rounded-xl border border-[#e2d9ca] bg-[#fffdfa] px-3 py-3 text-sm leading-relaxed text-[#1c1917] placeholder:text-[#a8a29e] focus:border-[#ff801f] focus:outline-none focus:ring-2 focus:ring-[#ff801f]/20 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:placeholder:text-[#64748b] dark:focus:border-[#fb923c] dark:focus:ring-[#fb923c]/25"
              />
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <p
                  id={`${formId}-msg-help`}
                  className={
                    showMessageHint || overLimit
                      ? "font-medium text-red-700 dark:text-red-300"
                      : "text-[#8b7b69] dark:text-[#8ea0b8]"
                  }
                >
                  {overLimit
                    ? `Supera ${MESSAGE_MAX} caracteres en total. Acorta resumen o detalle.`
                    : showMessageHint
                      ? `Mínimo ${MESSAGE_MIN} caracteres en el detalle.`
                      : `Mínimo ${MESSAGE_MIN} caracteres · se guarda borrador localmente`}
                </p>
                <span
                  id={`${formId}-msg-count`}
                  className={`tabular-nums ${overLimit ? "font-semibold text-red-700 dark:text-red-300" : "text-[#8b7b69] dark:text-[#8ea0b8]"}`}
                >
                  {composedLength}/{MESSAGE_MAX}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-[#efe6d9] pt-2 dark:border-[#334155] sm:flex-row sm:items-center sm:justify-between">
              {contactHintEmail ? (
                <p className="order-2 text-xs text-[#7a6b5b] dark:text-[#9fb0c7] sm:order-1">
                  Respuesta a:{" "}
                  <span className="break-all font-medium text-[#57534e] dark:text-[#cbd5e1]">
                    {contactHintEmail}
                  </span>
                </p>
              ) : (
                <p className="order-2 text-xs text-[#7a6b5b] dark:text-[#9fb0c7] sm:order-1">
                  Usaremos el correo de tu cuenta.
                </p>
              )}
              <button
                type="submit"
                disabled={supportSubmitting || overLimit || trimmedMessage.length < MESSAGE_MIN}
                className="order-1 cursor-pointer rounded-xl border border-transparent bg-[#ff801f] px-5 py-2.5 text-sm font-semibold text-[#1c1917] shadow-sm transition-colors duration-200 hover:bg-[#ff6a00] disabled:pointer-events-none disabled:opacity-50 sm:order-2 dark:text-[#1c1917]"
              >
                {supportSubmitting ? "Enviando…" : "Enviar solicitud"}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
