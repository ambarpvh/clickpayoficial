import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, ArrowLeft, TrendingUp, Users, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ClickRecord {
  id: string;
  earned_value: number;
  clicked_at: string;
  ads?: { title: string } | null;
}

interface ReferralRecord {
  id: string;
  referred_id: string;
  level: number;
  commission_rate: number;
  created_at: string;
}

const History = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<"clicks" | "referrals" | "ranking">("clicks");
  const [clicks, setClicks] = useState<ClickRecord[]>([]);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [ranking, setRanking] = useState<{ name: string; total: number }[]>([]);

  useEffect(() => {
    if (!authLoading && !user) { navigate("/login"); return; }
    if (user) loadData();
  }, [user, authLoading]);

  const loadData = async () => {
    if (!user) return;

    const { data: clicksData } = await supabase
      .from("clicks")
      .select("id, earned_value, clicked_at, ads(title)")
      .eq("user_id", user.id)
      .order("clicked_at", { ascending: false })
      .limit(100);
    setClicks(clicksData || []);

    const { data: referralsData } = await supabase
      .from("referrals")
      .select("*")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });
    setReferrals(referralsData || []);

    // Simple ranking: top referrers by count
    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("name, user_id")
      .limit(50);

    if (allProfiles) {
      const rankingData = await Promise.all(
        allProfiles.slice(0, 20).map(async (p) => {
          const { count } = await supabase
            .from("referrals")
            .select("id", { count: "exact", head: true })
            .eq("referrer_id", p.user_id);
          return { name: p.name || "Anônimo", total: count || 0 };
        })
      );
      setRanking(rankingData.filter(r => r.total > 0).sort((a, b) => b.total - a.total).slice(0, 10));
    }
  };

  if (authLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Zap className="h-8 w-8 text-primary animate-pulse" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 glass-card">
        <div className="container mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-heading text-lg font-bold">ClickPay</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {[
            { key: "clicks" as const, label: "Histórico de Cliques", icon: Clock },
            { key: "referrals" as const, label: "Minhas Indicações", icon: Users },
            { key: "ranking" as const, label: "Ranking Afiliados", icon: TrendingUp },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "clicks" && (
          <div className="glass-card rounded-xl divide-y divide-border/50 animate-fade-in">
            {clicks.length === 0 ? (
              <p className="p-8 text-muted-foreground text-sm text-center">Nenhum clique registrado ainda</p>
            ) : (
              clicks.map((c) => (
                <div key={c.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{(c.ads as unknown as { title: string })?.title || "Anúncio"}</p>
                    <p className="text-muted-foreground text-xs">
                      {new Date(c.clicked_at).toLocaleDateString("pt-BR")} às {new Date(c.clicked_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className="text-primary font-semibold text-sm">+R${Number(c.earned_value).toFixed(4)}</span>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "referrals" && (
          <div className="space-y-4 animate-fade-in">
            <div className="glass-card rounded-xl p-5">
              <p className="text-sm font-semibold mb-1">Total de indicações</p>
              <p className="font-heading text-3xl font-bold text-primary">{referrals.length}</p>
            </div>
            <div className="glass-card rounded-xl divide-y divide-border/50">
              {referrals.length === 0 ? (
                <p className="p-8 text-muted-foreground text-sm text-center">Nenhuma indicação ainda. Compartilhe seu link!</p>
              ) : (
                referrals.map((r) => (
                  <div key={r.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Nível {r.level}</p>
                      <p className="text-muted-foreground text-xs">{new Date(r.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <span className="text-accent font-semibold text-sm">{(r.commission_rate * 100).toFixed(0)}% comissão</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === "ranking" && (
          <div className="glass-card rounded-xl divide-y divide-border/50 animate-fade-in">
            {ranking.length === 0 ? (
              <p className="p-8 text-muted-foreground text-sm text-center">Nenhum dado de ranking disponível</p>
            ) : (
              ranking.map((r, i) => (
                <div key={i} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i < 3 ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`}>
                      {i + 1}
                    </span>
                    <p className="text-sm font-medium">{r.name}</p>
                  </div>
                  <span className="text-primary font-semibold text-sm">{r.total} indicações</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
