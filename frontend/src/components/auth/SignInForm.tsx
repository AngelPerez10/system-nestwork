import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import Checkbox from "@/components/form/input/Checkbox";
import Button from "@/components/ui/button/Button";
import { apiUrl } from "@/config/api";
import { motion } from "motion/react";
import { useAuth } from "@/context/AuthContext";

async function login(loginValue: string, password: string) {
  const res = await fetch(apiUrl("/api/login/"), {
    method: "POST",
    credentials: 'include',  // Include cookies for httpOnly tokens
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      loginValue.includes('@')
        ? { email: loginValue, password }
        : { username: loginValue, password }
    ),
  });
  const data = await res.json().catch(() => ({ detail: "Respuesta inválida" }));
  if (!res.ok) throw new Error(data.detail || "Error");
  return data;
}

export default function SignInForm() {
  const { login: authLogin } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState<boolean>(false);
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation() as any;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const data = await login(loginValue, password);
      
      // Use AuthContext login method - handles all storage securely
      authLogin(data);
      
      setMessage(null);

      // Redirigir según el rol del usuario
      const isAdmin = data.is_superuser || data.is_staff;
      const from = location?.state?.from?.pathname;

      let to = '/dashboard';
      if (isAdmin) {
        // Admins van a la ruta original si existe o al dashboard principal
        to = from && from !== '/' ? from : '/dashboard';
      } else {
        // Operadores/Técnicos van directo a Órdenes Técnico
        to = '/ordenes-tecnico';
      }

      navigate(to, { replace: true });
    } catch (err: any) {
      setMessage(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a8a29e] dark:text-[#8ea0b8]">
          Acceso
        </p>
        <h1 className="mt-2 [font-family:Georgia,'Times_New_Roman',serif] text-[34px] font-medium leading-[1.05] text-[#1c1917] dark:text-[#f8fafc]">
          Iniciar sesión
        </h1>
      </div>

      <motion.form
        onSubmit={handleSubmit}
        className="space-y-5"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
        }}
      >
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 6 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.26 } },
          }}
        >
          <label className="mb-1.5 block text-sm font-medium text-[#57534e] dark:text-[#c7d1df]">
            Correo o usuario <span className="text-error-500">*</span>
          </label>
          <input
            value={loginValue}
            onChange={(e: any) => setLoginValue(e.target.value)}
            placeholder="correo@ejemplo.com"
            autoComplete="username"
            spellCheck={false}
            className="h-12 w-full rounded-2xl border border-[#e7ded0] bg-[#fffdfa] px-4 text-sm text-[#1c1917] placeholder:text-[#a8a29e] caret-[#1c1917] shadow-none outline-none transition-[border-color,box-shadow,transform] duration-200 focus:border-[#ff801f] focus:ring-2 focus:ring-[#ff801f]/20 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:placeholder:text-[#8ea0b8] dark:caret-[#e5e7eb] dark:focus:border-[#fb923c] dark:focus:ring-[#fb923c]/25"
          />
        </motion.div>

        <motion.div
          variants={{
            hidden: { opacity: 0, y: 6 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.26 } },
          }}
        >
          <label className="mb-1.5 block text-sm font-medium text-[#57534e] dark:text-[#c7d1df]">
            Contraseña <span className="text-error-500">*</span>
          </label>
          <div className="relative">
            <input
              value={password}
              onChange={(e: any) => setPassword(e.target.value)}
              type={showPassword ? "text" : "password"}
              placeholder="Ingresa tu contraseña"
              autoComplete="current-password"
            className="h-12 w-full rounded-2xl border border-[#e7ded0] bg-[#fffdfa] px-4 pr-11 text-sm text-[#1c1917] placeholder:text-[#a8a29e] caret-[#1c1917] shadow-none outline-none transition-[border-color,box-shadow,transform] duration-200 focus:border-[#ff801f] focus:ring-2 focus:ring-[#ff801f]/20 dark:border-[#334155] dark:bg-[#0f172a] dark:text-[#e5e7eb] dark:placeholder:text-[#8ea0b8] dark:caret-[#e5e7eb] dark:focus:border-[#fb923c] dark:focus:ring-[#fb923c]/25"
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 z-10 -translate-y-1/2 cursor-pointer"
            >
              {showPassword ? (
                <EyeIcon className="size-5 fill-[#78716c] dark:fill-[#9aa9bd]" />
              ) : (
                <EyeCloseIcon className="size-5 fill-[#78716c] dark:fill-[#9aa9bd]" />
              )}
            </span>
          </div>
        </motion.div>

        {message && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {message}
          </p>
        )}

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-3">
            <Checkbox checked={remember} onChange={setRemember} className="checked:!bg-[#ff801f]" />
            <span className="block text-sm font-normal text-[#57534e] dark:text-[#b8c4d5]">Recordarme</span>
          </label>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full !rounded-2xl !border-transparent !bg-[#ff801f] !text-[15px] !font-semibold !text-black hover:!bg-[#ff6a00]"
          size="sm"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => navigate("/registro-empresa?plan=starter_2_users")}
            className="text-sm font-medium text-[#ea580c] transition-colors hover:text-[#c2410c]"
          >
            Registrar mi empresa
          </button>
        </div>
      </motion.form>
    </div>
  );
}