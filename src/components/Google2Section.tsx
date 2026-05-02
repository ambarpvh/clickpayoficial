import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const GOOGLE_CLIENT_ID =
  "503892265808-po02j0m2oklbk7va5a0apdfp44f55660.apps.googleusercontent.com";

declare global {
  interface Window {
    google?: any;
  }
}

const loadGsiScript = () =>
  new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if (window.google?.accounts?.id) return resolve();
    const existing = document.getElementById("google-gsi-script") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Falha ao carregar Google")));
      return;
    }
    const s = document.createElement("script");
    s.id = "google-gsi-script";
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Falha ao carregar Google"));
    document.head.appendChild(s);
  });

export default function Google2Section() {
  const navigate = useNavigate();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const handleCredential = async (response: { credential?: string }) => {
      const idToken = response?.credential;
      if (!idToken) {
        toast.error("Não recebemos o token do Google.");
        return;
      }
      setLoading(true);
      try {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: idToken,
        });
        if (error) {
          console.error("signInWithIdToken error:", error);
          toast.error(error.message || "Falha ao autenticar com Google.");
          setLoading(false);
          return;
        }
        toast.success("Login realizado!");
        navigate("/dashboard");
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || "Erro inesperado.");
        setLoading(false);
      }
    };

    loadGsiScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredential,
          ux_mode: "popup",
          auto_select: false,
          itp_support: true,
        });
        if (buttonRef.current) {
          buttonRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(buttonRef.current, {
            type: "standard",
            theme: "filled_black",
            size: "large",
            text: "signin_with",
            shape: "pill",
            logo_alignment: "left",
            width: 320,
          });
        }
        setReady(true);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Não foi possível carregar o login do Google.");
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <section id="google2" className="py-12 px-4">
      <div className="container mx-auto max-w-md text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Entre direto com sua conta Google (popup nativo, sem redirecionamento):
        </p>
        <div className="flex justify-center">
          <div ref={buttonRef} aria-label="Entrar com Google" />
        </div>
        {!ready && (
          <p className="text-xs text-muted-foreground mt-3">Carregando Google...</p>
        )}
        {loading && (
          <p className="text-xs text-muted-foreground mt-3">Autenticando...</p>
        )}
      </div>
    </section>
  );
}
