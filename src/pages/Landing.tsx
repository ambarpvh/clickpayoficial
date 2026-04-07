import { useState, useEffect, useRef } from "react";
import { ArrowRight, Eye, DollarSign, Shield, Users, Zap, Star, TrendingUp, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";

interface Plan {
  id: string;
  name: string;
  price: number;
  click_value: number;
  daily_click_limit: number;
}

const stats = [
  { label: "Usuários Ativos", value: "12,450+", icon: Users },
  { label: "Anúncios Visualizados", value: "2.5M+", icon: Eye },
  { label: "Pagos aos Afiliados", value: "R$185K+", icon: DollarSign },
];

const Landing = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    const loadPlans = async () => {
      const { data } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("click_value", { ascending: true });
      setPlans(data || []);
    };
    loadPlans();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 glass-card border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="font-heading text-xl font-bold text-foreground">ClickPay</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/login")}>Entrar</Button>
            <Button variant="hero" size="sm" onClick={() => navigate("/register")}>
              Começar Agora
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(152_60%_48%/0.08),transparent_60%)]" />
        <div className="container mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary mb-6 animate-fade-in">
            <Star className="h-3.5 w-3.5" />
            Plataforma #1 de PTC no Brasil
          </div>
          <h1 className="font-heading text-5xl md:text-7xl font-bold mb-6 animate-slide-up">
            Ganhe Dinheiro{" "}
            <span className="gradient-text-primary">Assistindo</span>
            <br />
            Anúncios Online
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-10 animate-slide-up">
            Cadastre-se gratuitamente, assista anúncios e receba pagamentos instantâneos.
            Quanto melhor seu plano, mais você ganha por clique.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
            <Button variant="hero" size="lg" onClick={() => navigate("/register")}>
              Criar Conta Grátis <ArrowRight className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })}>
              Ver Planos
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 border-y border-border/50">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-card rounded-xl p-6 text-center glow-primary">
              <stat.icon className="h-8 w-8 text-primary mx-auto mb-3" />
              <p className="font-heading text-3xl font-bold text-foreground">{stat.value}</p>
              <p className="text-muted-foreground text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">Como Funciona</h2>
          <p className="text-muted-foreground mb-12 max-w-lg mx-auto">3 passos simples para começar a ganhar</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Cadastre-se", desc: "Crie sua conta gratuita em segundos", icon: Users },
              { step: "02", title: "Assista Anúncios", desc: "Clique nos anúncios e aguarde 10 segundos", icon: Eye },
              { step: "03", title: "Receba Pagamento", desc: "Saque seus ganhos quando quiser", icon: TrendingUp },
            ].map((item) => (
              <div key={item.step} className="glass-card rounded-xl p-8 group hover:border-primary/50 transition-all duration-300">
                <span className="gradient-text-primary font-heading text-4xl font-bold">{item.step}</span>
                <item.icon className="h-10 w-10 text-primary mx-auto my-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-heading text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="py-20 px-4 bg-secondary/20">
        <div className="container mx-auto text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">Escolha Seu Plano</h2>
          <p className="text-muted-foreground mb-12">Quanto maior o plano, mais você ganha por clique</p>
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${plans.length >= 4 ? "lg:grid-cols-4" : plans.length === 3 ? "lg:grid-cols-3" : ""} gap-6`}>
            {plans.map((plan, index) => {
              const isPopular = index === Math.floor(plans.length / 2);
              return (
                <div
                  key={plan.id}
                  className={`glass-card rounded-xl p-6 border-2 border-primary/20 relative ${isPopular ? "glow-primary border-primary" : ""} hover:scale-105 transition-transform duration-300`}
                >
                  {isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                      Popular
                    </span>
                  )}
                  <h3 className="font-heading text-2xl font-bold mb-1">{plan.name}</h3>
                  <p className="gradient-text-gold text-3xl font-bold my-4">
                    {plan.price === 0 ? "Grátis" : formatBRL(plan.price)}
                  </p>
                  <div className="space-y-3 text-sm text-muted-foreground mb-6">
                    <p>Ganho por clique: <span className="text-primary font-semibold">{formatBRL(plan.click_value)}</span></p>
                    <p>Limite diário: <span className="text-foreground font-semibold">{plan.daily_click_limit} anúncios</span></p>
                  </div>
                  <Button
                    variant={isPopular ? "hero" : "outline"}
                    className="w-full"
                    onClick={() => navigate("/register")}
                  >
                    {plan.price === 0 ? "Começar Grátis" : "Assinar"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="font-heading text-3xl font-bold mb-4">Segurança Anti-Fraude</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Nosso sistema possui verificação por IP, limite de cliques diários, CAPTCHA e detecção
            de múltiplas contas para garantir a integridade da plataforma.
          </p>
        </div>
      </section>

      {/* Social Proof */}
      <SocialProofSection />

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-heading font-bold">ClickPay</span>
          </div>
          <p className="text-muted-foreground text-sm">© 2026 ClickPay. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
