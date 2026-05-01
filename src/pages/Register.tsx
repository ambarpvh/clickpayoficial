import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import FakeSignupPopups from "@/components/FakeSignupPopups";

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refId = searchParams.get("ref");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Persist referral across OAuth redirect + handle OAuth errors / auto-redirect
  useEffect(() => {
    if (refId) {
      localStorage.setItem("clickpay_ref", refId);
    }

    const parseParams = (str: string) => new URLSearchParams(str.startsWith("#") || str.startsWith("?") ? str.slice(1) : str);
    const hashParams = parseParams(window.location.hash);
    const queryParams = parseParams(window.location.search);
    const err = hashParams.get("error") || queryParams.get("error");
    const errDesc = hashParams.get("error_description") || queryParams.get("error_description");

    if (err) {
      const msg = decodeURIComponent(errDesc || err).replace(/\+/g, " ");
      toast.error(`Falha no cadastro: ${msg}`);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard", { replace: true });
      }
    });
  }, [refId, navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, ...(refId ? { referred_by: refId } : {}) },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Conta criada! Verifique seu email.");
      navigate("/dashboard");
    }
  };

  const handleSocialLogin = async (provider: "google" | "apple") => {
    if (refId) {
      localStorage.setItem("clickpay_ref", refId);
    }

    await supabase.auth.signOut();

    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
      extraParams: provider === "google" ? { prompt: "select_account" } : undefined,
    });

    if (result.error) toast.error(String(result.error));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative">
      <FakeSignupPopups />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(152_60%_48%/0.06),transparent_60%)]" />
      <div className="glass-card rounded-2xl p-8 w-full max-w-md animate-slide-up relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <Zap className="h-8 w-8 text-primary" />
            <span className="font-heading text-2xl font-bold">ClickPay</span>
          </Link>
          <h1 className="font-heading text-2xl font-bold">Criar Conta</h1>
          <p className="text-muted-foreground text-sm mt-1">Comece a ganhar dinheiro agora</p>
          {refId && <p className="text-primary text-xs mt-2">📎 Indicado por um amigo!</p>}
        </div>

        <div className="space-y-3 mb-6">
          <Button variant="outline" className="w-full" onClick={() => handleSocialLogin("apple")}>
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
            Cadastrar com Apple
          </Button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input id="name" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} required className="bg-secondary border-border" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-secondary border-border" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-secondary border-border" />
          </div>
          <Button type="submit" variant="hero" className="w-full" disabled={loading}>
            {loading ? "Criando..." : "Criar Conta Grátis"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          Já tem conta?{" "}
          <Link to="/login" className="text-primary hover:underline font-semibold">Entrar</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
