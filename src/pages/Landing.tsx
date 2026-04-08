import { useState, useEffect, useRef } from "react";
import { ArrowRight, Eye, DollarSign, Shield, Users, Zap, Star, TrendingUp, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";

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

const testimonials = [
  { name: "Mariana S.", city: "São Paulo, SP", text: "Comecei sem acreditar muito, mas no primeiro mês já tinha sacado R$ 320,00. Uso no horário de almoço e à noite.", avatar: "MS" },
  { name: "Carlos R.", city: "Belo Horizonte, MG", text: "Indiquei para 5 amigos e agora ganho comissão dos cliques deles também. Já saquei mais de R$ 1.200,00!", avatar: "CR" },
  { name: "Ana Paula F.", city: "Recife, PE", text: "Sou mãe solo e o ClickPay me ajuda a complementar a renda. Consigo fazer pelo celular enquanto as crianças dormem.", avatar: "AF" },
  { name: "Lucas M.", city: "Curitiba, PR", text: "No início achei que era golpe, mas o primeiro saque caiu na hora. Hoje faço R$ 50,00 por dia com o plano Premium.", avatar: "LM" },
  { name: "Fernanda O.", city: "Salvador, BA", text: "Trabalho como freelancer e o ClickPay virou uma renda extra fixa. Já são 4 meses sacando toda semana.", avatar: "FO" },
  { name: "Roberto A.", city: "Manaus, AM", text: "Minha esposa e eu usamos juntos. Com os dois planos, tiramos quase R$ 800,00 por mês extra.", avatar: "RA" },
  { name: "Juliana T.", city: "Porto Alegre, RS", text: "Indiquei no meu grupo de WhatsApp e agora tenho uma rede de 20 pessoas. A comissão de rede é real!", avatar: "JT" },
  { name: "Pedro H.", city: "Goiânia, GO", text: "Desempregado há 3 meses, o ClickPay tem sido essencial para pagar as contas básicas. Muito grato!", avatar: "PH" },
];

const SocialProofSection = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const amount = 320;
      scrollRef.current.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          scrollRef.current.scrollBy({ left: 320, behavior: "smooth" });
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isPaused]);

  return (
    <section className="py-20 px-4 bg-secondary/20">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <Quote className="h-10 w-10 text-primary mx-auto mb-4 opacity-60" />
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">O Que Nossos Usuários Dizem</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">Pessoas reais que estão transformando tempo livre em renda extra</p>
        </div>
        <div className="relative">
          <button
            onClick={() => scroll("left")}
            className="absolute -left-2 md:left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background border border-border shadow-md flex items-center justify-center hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          <div ref={scrollRef} onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)} className="flex gap-5 overflow-x-auto scrollbar-hide py-4 px-8 snap-x snap-mandatory" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {testimonials.map((t, i) => (
              <div key={i} className="glass-card rounded-xl p-6 min-w-[290px] max-w-[310px] shrink-0 snap-center border border-border/50 hover:border-primary/40 transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-11 w-11 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm">{t.avatar}</div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{t.name}</p>
                    <p className="text-muted-foreground text-xs">{t.city}</p>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">"{t.text}"</p>
                <div className="flex gap-0.5 mt-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => scroll("right")}
            className="absolute -right-2 md:right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-background border border-border shadow-md flex items-center justify-center hover:bg-accent transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-foreground" />
          </button>
        </div>
      </div>
    </section>
  );
};


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
