import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import { apiUrl } from "@/config/api";

export default function ActivateAccountPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = (params.get("token") || "").trim();

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [activatedUsername, setActivatedUsername] = useState("");

  const canSubmit = useMemo(() => !!token && password.length >= 8 && password2.length >= 8, [token, password, password2]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const res = await fetch(apiUrl("/api/onboarding/set-password/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, password2 }),
      });
      const data = await res.json().catch(() => ({ detail: "Respuesta invalida" }));
      if (!res.ok) throw new Error(data.detail || "No se pudo activar la cuenta");
      setActivatedUsername(data.username || "");
      setMessage("Cuenta activada correctamente. Ya puedes iniciar sesion.");
      setIsError(false);
    } catch (error: any) {
      setMessage(error.message || "No se pudo activar la cuenta.");
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground dark:bg-[#000000]">
      <PageMeta title="Activar cuenta | System Nestwork" description="Define tu contraseña para activar tu cuenta." />
      <div className="mx-auto w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#d6ebfd]/20 dark:bg-[#000000]">
        <h1 className="text-3xl font-medium [font-family:Georgia,'Times_New_Roman',serif] text-gray-900 dark:text-[#f0f0f0]">
          Activar cuenta
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-[#a1a4a5]">
          Crea tu contraseña para finalizar el acceso como administrador.
        </p>

        {!token && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300">
            Falta el enlace de activación.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field label="Contraseña" value={password} onChange={setPassword} />
          <Field label="Confirmar contraseña" value={password2} onChange={setPassword2} />

          {message && (
            <p
              className={`rounded-xl border px-3 py-2 text-sm ${
                isError
                  ? "border-red-200 bg-red-50 text-red-700 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-300"
                  : "border-[#ff801f]/30 bg-[#ff801f]/10 text-[#ff801f] dark:text-[#ffa057]"
              }`}
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full rounded-xl border border-[#ff801f] bg-[#ff801f] px-4 py-2.5 font-semibold text-black transition-colors hover:bg-[#ff6a00] disabled:opacity-70"
          >
            {loading ? "Activando..." : "Activar cuenta"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between text-sm">
          <Link to="/" className="text-gray-600 hover:text-gray-900 dark:text-[#a1a4a5] dark:hover:text-[#f0f0f0]">
            Volver al inicio
          </Link>
          <button
            type="button"
            onClick={() =>
              navigate(
                activatedUsername
                  ? `/signin?username=${encodeURIComponent(activatedUsername)}`
                  : "/signin"
              )
            }
            className="text-[#ff801f] hover:text-[#ff6a00] dark:text-[#ffa057]"
          >
            Ir a iniciar sesion
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-[#f0f0f0]">{label}</span>
      <input
        required
        minLength={8}
        value={value}
        type="password"
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-gray-300 bg-white px-3.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#ff801f] focus:ring-2 focus:ring-[#ff801f]/20 dark:border-[#d6ebfd]/20 dark:bg-[#000000] dark:text-[#f0f0f0]"
      />
    </label>
  );
}
