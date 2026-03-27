import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DollarSign, Eye, TrendingUp, Zap, LogOut, Copy, Gift, Clock, ArrowUpRight } from "lucide-react";
import AdTimer from "@/components/AdTimer";
import { toast } from "sonner";

const mockAds = [
  { id: 1, title: "Curso de Marketing Digital", url: "https://example.com", reward: "$0.01" },
  { id: 2, title: "Plataforma de Investimentos", url: "https://example.com", reward: "$0.01" },
  { id: 3, title: "App de Finanças", url: "https://example.com", reward: "$0.01" },
  { id: 4, title: "Loja Online Premium", url: "https://example.com", reward: "$0.01" },
  { id: 5, title: "Serviço de Streaming", url: "https://example.com", reward: "$0.01" },
];

const mockHistory = [
  { date: "27/03/2026", ad: "Curso de Marketing Digital", value: "$0.01" },
  { date: "27/03/2026", ad: "App de Finanças", value: "$0.01" },
  { date: "26/03/2026", ad: "Loja Online Premium", value: "$0.01" },
  { date: "26/03/2026", ad: "Plataforma de Investimentos", value: "$0.01" },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeAd, setActiveAd] = useState<typeof mockAds[0] | null>(null);
  const [viewedAds, setViewedAds] = useState<Set<number>>(new Set());
  const [balance, setBalance] = useState(0.04);
  const referralLink = "https://clickpay.com/ref/USR123";

  const handleAdComplete = (adId: number) => {
    setViewedAds((prev) => new Set(prev).add(adId));
    setBalance((b) => +(b + 0.01).toFixed(4));
    toast.success("Recompensa creditada!");
  };

  const copyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Link copiado!");
  };

  const availableAds = mockAds.filter((a) => !viewedAds.has(a.id));

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <nav className="border-b border-border/50 glass-card">
        <div className="container mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-heading text-lg font-bold">ClickPay</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Plano: <span className="text-primary font-semibold">Prata</span></span>
            <Button variant="ghost" size="sm" onClick={() => { navigate("/"); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Saldo Atual", value: `$${balance.toFixed(4)}`, icon: DollarSign, glow: true },
            { label: "Anúncios Hoje", value: `${viewedAds.size}/${mockAds.length}`, icon: Eye, glow: false },
            { label: "Ganhos Hoje", value: `$${(viewedAds.size * 0.01).toFixed(2)}`, icon: TrendingUp, glow: false },
            { label: "Indicações", value: "3", icon: Gift, glow: false },
          ].map((stat) => (
            <div key={stat.label} className={`glass-card rounded-xl p-5 ${stat.glow ? "glow-primary border-primary/30" : ""}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm">{stat.label}</span>
                <stat.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="font-heading text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Referral */}
        <div className="glass-card rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold mb-1">Seu link de indicação</p>
            <p className="text-muted-foreground text-xs break-all">{referralLink}</p>
          </div>
          <Button variant="outline" size="sm" onClick={copyReferral}>
            <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Ads */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-heading text-xl font-bold">Anúncios Disponíveis</h2>
            {availableAds.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center">
                <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Você já viu todos os anúncios de hoje!</p>
                <p className="text-muted-foreground text-sm mt-1">Volte amanhã para mais.</p>
              </div>
            ) : (
              availableAds.map((ad) => (
                <div key={ad.id} className="glass-card rounded-xl p-4 flex items-center justify-between hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Eye className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{ad.title}</p>
                      <p className="text-muted-foreground text-xs">Ganhe {ad.reward}</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setActiveAd(ad)}>
                    Ver Anúncio <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* History */}
          <div className="space-y-4">
            <h2 className="font-heading text-xl font-bold">Histórico</h2>
            <div className="glass-card rounded-xl divide-y divide-border/50">
              {mockHistory.map((h, i) => (
                <div key={i} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{h.ad}</p>
                    <p className="text-muted-foreground text-xs">{h.date}</p>
                  </div>
                  <span className="text-primary font-semibold text-sm">+{h.value}</span>
                </div>
              ))}
            </div>
            <Button variant="gold" className="w-full" onClick={() => toast.info("Saque mínimo: $5.00")}>
              Solicitar Saque
            </Button>
          </div>
        </div>
      </div>

      {activeAd && (
        <AdTimer ad={activeAd} onComplete={handleAdComplete} onClose={() => setActiveAd(null)} />
      )}
    </div>
  );
};

export default Dashboard;
