import PageMeta from "@/components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "@/components/auth/SignInForm";
import { useEffect } from "react";

export default function SignIn() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.backgroundColor;
    const prevBody = body.style.backgroundColor;

    const applyBackgroundByTheme = () => {
      const isDark = html.classList.contains("dark");
      const bg = isDark ? "#0b1018" : "#f7f5f0";
      html.style.backgroundColor = bg;
      body.style.backgroundColor = bg;
    };

    applyBackgroundByTheme();
    const observer = new MutationObserver(applyBackgroundByTheme);
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
      html.style.backgroundColor = prevHtml;
      body.style.backgroundColor = prevBody;
    };
  }, []);

  return (
    <>
      <PageMeta
        title="Iniciar Sesión | Panel de Administración"
        description="Esta es la página de inicio de sesión para el Panel de Administración"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
