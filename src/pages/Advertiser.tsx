import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import {
  ArrowRight, Zap, Eye, Target, TrendingUp, Users, ShieldCheck,
  MousePointerClick, BarChart3, Globe, CheckCircle2, Sparkles, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";

const CLICK_PRICE = 0.25;
const MIN_CLICKS = 100;
const MAX_CLICKS = 10000;
const STEP_CLICKS = 50;

const benefits = [
  {
    icon: MousePointerClick,
    title: "Cliques 100% Reais",
    desc: "Usuários ativos e verificados que entram diariamente para visualizar anúncios. Zero bots.",
  },
  {
    icon: Users,
    title: "Audiência Engajada",
    desc: "Mais de 2.500 usuários acessam a plataforma todos os dias com intenção de interagir.",
  },
  {
    icon: TrendingUp,
    title: "Conversão em Vendas",
    desc: "Tráfego segmentado que converte: visitantes interessados em produtos e ofertas reais.",
  },
  {
    icon: ShieldCheck,
    title: "Anti-Fraude Avançado",
    desc: "Verificação por IP, CAPTCHA e detecção de múltiplas contas garantem cliques legítimos.",
  },
  {
    icon: BarChart3,
    title: "Resultados Mensuráveis",
    desc: "Você compra a quantidade exata de cliques que precisa, sem surpresas no orçamento.",
  },
  {
    icon: Clock,
    title: "Entrega Rápida",
    desc: "Seu anúncio entra em rotação rapidamente e os cliques são entregues em poucos dias.",
  },
];

const advertiserSchema = z.object({
  full_name: z.string().trim().min(2, "Nome muito curto").max(100, "Máximo 100 caracteres"),
  email: z.string().trim().email("Email inválido").max(255),
  phone: z.string().trim().min(8, "Telefone inválido").max(20),
  ad_link: z.string().trim().url("Link inválido (inclua https://)").max(500),
  ad_description: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
});

const Advertiser = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [clicks, setClicks] = useState(1000);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    ad_link: "",
    ad_description: "",
  });

  const totalValue = useMemo(() => clicks * CLICK_PRICE, [clicks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = advertiserSchema.safeParse(form);
    if (!result.success) {
      toast({
        title: "Verifique os dados",
        description: result.error.issues[0]?.message ?? "Dados inválidos",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        full_name: result.data.full_name,
        email: result.data.email,
        phone: result.data.phone,
        ad_link: result.data.ad_link,
        ad_description: result.data.ad_description ?? null,
        clicks_amount: clicks,
        total_value: totalValue,
      };

      const { error: insertError } = await supabase
        .from("advertiser_leads")
        .insert([payload]);

      if (insertError) throw insertError;

      toast({
        title: "Pedido enviado!",
        description: "Recebemos sua solicitação. Nossa equipe entrará em contato em breve.",
      });
      setDialogOpen(false);
      setForm({ full_name: "", email: "", phone: "", ad_link: "", ad_description: "" });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro ao enviar",
        description: err.message ?? "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="advertiser-theme min-h-screen"
      style={{
        // Paleta de negócios: azul royal/corporativo + dourado
        // Escopo local — não afeta o restante do app
        ['--adv-bg' as any]: '218 50% 6%',
        ['--adv-surface' as any]: '218 45% 10%',
        ['--adv-primary' as any]: '218 90% 58%',          // azul royal vibrante
        ['--adv-primary-foreground' as any]: '218 50% 6%',
        ['--adv-accent' as any]: '42 95% 58%',            // dourado
        ['--adv-border' as any]: '218 35% 20%',
        ['--adv-muted' as any]: '218 15% 65%',
        backgroundColor: 'hsl(var(--adv-bg))',
        backgroundImage:
          'radial-gradient(ellipse at top, hsl(var(--adv-primary) / 0.18), transparent 60%), radial-gradient(ellipse at bottom right, hsl(var(--adv-accent) / 0.10), transparent 55%)',
      }}
    >
      <style>{`
        .advertiser-theme .adv-glass {
          background: hsl(var(--adv-surface) / 0.6);
          border: 1px solid hsl(var(--adv-border) / 0.7);
          backdrop-filter: blur(12px);
        }
        .advertiser-theme .adv-text-primary { color: hsl(var(--adv-primary)); }
        .advertiser-theme .adv-text-accent { color: hsl(var(--adv-accent)); }
        .advertiser-theme .adv-gradient-text {
          background: linear-gradient(135deg, hsl(var(--adv-primary)), hsl(var(--adv-accent)));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .advertiser-theme .adv-btn-primary {
          background: linear-gradient(135deg, hsl(var(--adv-primary)), hsl(218 95% 50%));
          color: hsl(var(--adv-primary-foreground));
          font-weight: 700;
          box-shadow: 0 10px 30px -8px hsl(var(--adv-primary) / 0.55);
        }
        .advertiser-theme .adv-btn-primary:hover { filter: brightness(1.08); }
        .advertiser-theme .adv-btn-outline {
          border: 1px solid hsl(var(--adv-primary) / 0.5);
          color: hsl(var(--adv-primary));
          background: transparent;
        }
        .advertiser-theme .adv-btn-outline:hover { background: hsl(var(--adv-primary) / 0.1); }
        .advertiser-theme .adv-glow { box-shadow: 0 0 50px hsl(var(--adv-primary) / 0.18); }
        .advertiser-theme .adv-muted { color: hsl(var(--adv-muted)); }
        .advertiser-theme .adv-icon-bg {
          background: hsl(var(--adv-primary) / 0.15);
          color: hsl(var(--adv-primary));
        }
        .advertiser-theme [data-radix-slider-range] { background: hsl(var(--adv-primary)) !important; }
        .advertiser-theme [data-radix-slider-thumb] {
          border-color: hsl(var(--adv-primary)) !important;
          background: hsl(var(--adv-bg)) !important;
        }
      `}</style>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 adv-glass border-b" style={{ borderColor: 'hsl(var(--adv-border) / 0.6)' }}>
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <Zap className="h-6 w-6 adv-text-accent" />
            <span className="font-heading text-xl font-bold text-foreground">ClickPay <span className="adv-text-accent text-sm font-medium">· Anunciantes</span></span>
          </button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/")}>Voltar</Button>
            <Button className="adv-btn-primary" size="sm" onClick={() => document.getElementById("comprar")?.scrollIntoView({ behavior: "smooth" })}>
              Comprar Cliques
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="container mx-auto text-center relative z-10 max-w-4xl">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm mb-6 animate-fade-in"
            style={{
              background: 'hsl(var(--adv-accent) / 0.12)',
              border: '1px solid hsl(var(--adv-accent) / 0.4)',
              color: 'hsl(var(--adv-accent))',
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Para Anunciantes · Invista em tráfego real
          </div>
          <h1 className="font-heading text-5xl md:text-6xl font-bold mb-6 animate-slide-up text-foreground">
            Coloque seu Link na <span className="adv-gradient-text">Frente de Milhares</span> de Usuários Ativos
          </h1>
          <p className="adv-muted text-lg md:text-xl max-w-2xl mx-auto mb-10 animate-slide-up">
            Pague apenas pelos cliques reais que recebe. Audiência engajada, anti-fraude robusto
            e resultados mensuráveis a partir de R$ 0,25 por clique.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
            <Button size="lg" className="adv-btn-primary" onClick={() => document.getElementById("comprar")?.scrollIntoView({ behavior: "smooth" })}>
              Quero Anunciar Agora <ArrowRight className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="adv-btn-outline" onClick={() => document.getElementById("beneficios")?.scrollIntoView({ behavior: "smooth" })}>
              Ver Benefícios
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 border-y" style={{ borderColor: 'hsl(var(--adv-border) / 0.5)' }}>
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Users, value: "2.500+", label: "Usuários ativos diariamente" },
            { icon: Eye, value: "2.5M+", label: "Anúncios já visualizados" },
            { icon: Target, value: "R$ 0,25", label: "Por clique real" },
          ].map((s) => (
            <div key={s.label} className="adv-glass rounded-xl p-6 text-center adv-glow">
              <s.icon className="h-8 w-8 adv-text-primary mx-auto mb-3" />
              <p className="font-heading text-3xl font-bold text-foreground">{s.value}</p>
              <p className="adv-muted text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section id="beneficios" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Por Que Anunciar no <span className="adv-gradient-text">ClickPay</span>?
            </h2>
            <p className="adv-muted">
              Diferente de outras plataformas de tráfego, aqui você atinge pessoas reais
              que entram todos os dias com a intenção de interagir com anúncios.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="adv-glass rounded-xl p-6 transition-all duration-300"
                style={{ transition: 'border-color .3s' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'hsl(var(--adv-primary) / 0.6)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'hsl(var(--adv-border) / 0.7)')}
              >
                <div className="h-12 w-12 rounded-lg adv-icon-bg flex items-center justify-center mb-4">
                  <b.icon className="h-6 w-6" />
                </div>
                <h3 className="font-heading text-lg font-semibold mb-2 text-foreground">{b.title}</h3>
                <p className="adv-muted text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4" style={{ background: 'hsl(var(--adv-surface) / 0.4)' }}>
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4 text-foreground">Como Funciona</h2>
            <p className="adv-muted">3 passos simples para começar a anunciar</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { step: "01", title: "Escolha sua quantidade", desc: "Use o controle deslizante e defina quantos cliques deseja comprar.", icon: MousePointerClick },
              { step: "02", title: "Envie seus dados", desc: "Preencha link do anúncio e dados de contato em segundos.", icon: Globe },
              { step: "03", title: "Receba os cliques", desc: "Seu anúncio entra em rotação e você acompanha os resultados.", icon: CheckCircle2 },
            ].map((s) => (
              <div key={s.step} className="adv-glass rounded-xl p-8 text-center group transition-all">
                <span className="adv-gradient-text font-heading text-4xl font-bold">{s.step}</span>
                <s.icon className="h-10 w-10 adv-text-primary mx-auto my-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-heading text-xl font-semibold mb-2 text-foreground">{s.title}</h3>
                <p className="adv-muted text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Calculator / Buy */}
      <section id="comprar" className="py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-10">
            <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Calcule seu <span className="adv-gradient-text">Pacote de Cliques</span>
            </h2>
            <p className="adv-muted">
              Arraste a barra abaixo e veja em tempo real quantos cliques você compra e o investimento total.
            </p>
          </div>

          <div
            className="adv-glass rounded-2xl p-6 md:p-10 adv-glow"
            style={{ borderWidth: '2px', borderColor: 'hsl(var(--adv-primary) / 0.5)' }}
          >
            <div className="text-center mb-8">
              <p className="text-sm adv-muted mb-2">Você está comprando</p>
              <p className="font-heading text-5xl md:text-6xl font-bold adv-gradient-text mb-2">
                {clicks.toLocaleString("pt-BR")}
              </p>
              <p className="text-foreground font-semibold">cliques reais</p>
            </div>

            <div className="space-y-3 mb-8">
              <Slider
                value={[clicks]}
                onValueChange={(v) => setClicks(v[0])}
                min={MIN_CLICKS}
                max={MAX_CLICKS}
                step={STEP_CLICKS}
                className="my-4"
              />
              <div className="flex justify-between text-xs adv-muted">
                <span>{MIN_CLICKS.toLocaleString("pt-BR")} cliques</span>
                <span>{MAX_CLICKS.toLocaleString("pt-BR")} cliques</span>
              </div>
            </div>

            <div
              className="rounded-xl p-6 text-center mb-6"
              style={{
                background: 'hsl(var(--adv-accent) / 0.10)',
                border: '1px solid hsl(var(--adv-accent) / 0.35)',
              }}
            >
              <p className="text-sm adv-muted mb-1">Valor total do investimento</p>
              <p className="font-heading text-4xl md:text-5xl font-bold adv-text-accent">
                {formatBRL(totalValue)}
              </p>
              <p className="text-xs adv-muted mt-2">
                {formatBRL(CLICK_PRICE)} por clique real entregue
              </p>
            </div>

            <Button
              size="lg"
              className="w-full text-lg adv-btn-primary"
              onClick={() => setDialogOpen(true)}
            >
              Comprar Cliques <ArrowRight className="h-5 w-5" />
            </Button>
            <p className="text-xs adv-muted text-center mt-4">
              Após enviar, nossa equipe entra em contato com instruções de pagamento.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4 mt-10" style={{ borderColor: 'hsl(var(--adv-border) / 0.5)' }}>
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 adv-text-accent" />
            <span className="font-heading font-bold text-foreground">ClickPay</span>
          </div>
          <p className="adv-muted text-sm">© 2026 ClickPay. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="advertiser-theme max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Finalizar pedido de anúncio</DialogTitle>
            <DialogDescription>
              Você está comprando <strong className="adv-text-primary">{clicks.toLocaleString("pt-BR")} cliques</strong> por <strong className="adv-text-accent">{formatBRL(totalValue)}</strong>. Preencha seus dados abaixo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome completo *</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Seu nome"
                maxLength={100}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="voce@email.com"
                  maxLength={255}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone / WhatsApp *</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  maxLength={20}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ad_link">Link a anunciar *</Label>
              <Input
                id="ad_link"
                type="url"
                value={form.ad_link}
                onChange={(e) => setForm({ ...form, ad_link: e.target.value })}
                placeholder="https://seusite.com/oferta"
                maxLength={500}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ad_description">Descrição do anúncio (opcional)</Label>
              <Textarea
                id="ad_description"
                value={form.ad_description}
                onChange={(e) => setForm({ ...form, ad_description: e.target.value })}
                placeholder="Conte brevemente sobre o que você está anunciando..."
                maxLength={500}
                rows={3}
              />
            </div>

            <div className="rounded-lg p-4 text-sm" style={{ background: 'hsl(var(--adv-surface) / 0.7)', border: '1px solid hsl(var(--adv-border) / 0.6)' }}>
              <div className="flex justify-between mb-1">
                <span className="adv-muted">Cliques:</span>
                <span className="font-semibold">{clicks.toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="adv-muted">Valor por clique:</span>
                <span className="font-semibold">{formatBRL(CLICK_PRICE)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t mt-2" style={{ borderColor: 'hsl(var(--adv-border) / 0.6)' }}>
                <span className="text-foreground font-bold">Total:</span>
                <span className="adv-text-accent font-bold text-lg">{formatBRL(totalValue)}</span>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" className="adv-btn-primary" disabled={submitting}>
                {submitting ? "Enviando..." : "Comprar Cliques"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Advertiser;
