import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, ArrowLeft, TrendingUp, Users, Clock, Wallet, Banknote } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";

interface ClickRecord {
  id: string;
  earned_value: number;
  clicked_at: string;
  ads?: { title: string } | null;
}

interface AdjustmentRecord {
  id: string;
  amount: number;
  note: string;
  created_at: string;
}

interface WithdrawalRecord {
  id: string;
  amount: number;
  status: string;
  requested_at: string;
  processed_at: string | null;
  holder_name: string | null;
  pix_key: string | null;
}

interface ReferralWithProfile {
  id: string;
  level: number;
  commission_rate: number;
  created_at: string;
  referred_id: string;
  profile?: { name: string; email: string } | null;
  planName?: string;
  commissionValue?: number;
}

const History = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<"clicks" | "adjustments" | "withdrawals" | "referrals" | "ranking">("clicks");
  const [clicks, setClicks] = useState<ClickRecord[]>([]);
  const [adjustments, setAdjustments] = useState<AdjustmentRecord[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [referrals, setReferrals] = useState<ReferralWithProfile[]>([]);
  const [ranking, setRanking] = useState<{ name: string; total: number }[]>([]);
  const [directCount, setDirectCount] = useState(0);
  const [indirectCount, setIndirectCount] = useState(0);
  const [clickValue, setClickValue] = useState(1);

  useEffect(() => {
    if (!authLoading && !user) { navigate("/login"); return; }
    if (user) loadData();
  }, [user, authLoading]);

  const loadData = async () => {
    if (!user) return;

    // Load user's click value
    const { data: userPlan } = await supabase
      .from("user_plans")
      .select("plan_id, plans(click_value)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (userPlan?.plans) {
      const plan = userPlan.plans as unknown as { click_value: number };
      setClickValue(plan.click_value);
    }

    const [
      { data: clicksData },
      { data: adjustmentsData },
      { data: withdrawalsData },
      { data: referralsData },
    ] = await Promise.all([
      supabase.from("clicks").select("id, earned_value, clicked_at, ads(title)").eq("user_id", user.id).order("clicked_at", { ascending: false }).limit(100),
      supabase.from("balance_adjustments").select("id, amount, note, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("withdrawals").select("id, amount, status, requested_at, processed_at, holder_name, pix_key").eq("user_id", user.id).order("requested_at", { ascending: false }),
      supabase.from("referrals").select("*").eq("referrer_id", user.id).order("created_at", { ascending: false }),
    ]);

    setClicks(clicksData || []);
    setAdjustments(adjustmentsData || []);
    setWithdrawals((withdrawalsData || []) as WithdrawalRecord[]);

    const refs = referralsData || [];
    const direct = refs.filter(r => r.level === 1);
    const indirect = refs.filter(r => r.level > 1);
    setDirectCount(direct.length);
    setIndirectCount(indirect.length);

    // Fetch profiles and plans for direct referrals
    if (direct.length > 0) {
      const directIds = direct.map(r => r.referred_id);
      const [{ data: profiles }, { data: userPlans }] = await Promise.all([
        supabase.from("profiles").select("user_id, name, email").in("user_id", directIds),
        supabase.from("user_plans").select("user_id, plans(name, price)").in("user_id", directIds).eq("is_active", true),
      ]);
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      const planMap = new Map((userPlans || []).map((up: any) => [up.user_id, up.plans]));
      const enriched: ReferralWithProfile[] = refs.map(r => {
        const plan = planMap.get(r.referred_id) as { name: string; price: number } | undefined;
        const commissionValue = plan && plan.price > 0 ? plan.price * r.commission_rate : (r.level === 1 ? 1.0 : 0);
        return {
          ...r,
          profile: r.level === 1 ? (profileMap.get(r.referred_id) || null) : null,
          planName: plan?.name || "Free",
          commissionValue,
        };
      });
      setReferrals(enriched);
    } else {
      setReferrals(refs.map(r => ({ ...r, profile: null, planName: "Free", commissionValue: r.level === 1 ? 1.0 : 0 })));
    }

    // Ranking
    const { data: allProfiles } = await supabase.from("profiles").select("name, user_id").limit(50);
    if (allProfiles) {
      const rankingData = await Promise.all(
        allProfiles.slice(0, 20).map(async (p) => {
          const { count } = await supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", p.user_id);
          return { name: p.name || "Anônimo", total: count || 0 };
        })
      );
      setRanking(rankingData.filter(r => r.total > 0).sort((a, b) => b.total - a.total).slice(0, 10));
    }
  };

  const statusLabel = (s: string) => {
    if (s === "pending") return <span className="text-yellow-500 font-medium text-xs">⏳ Pendente</span>;
    if (s === "approved") return <span className="text-green-500 font-medium text-xs">✅ Pago</span>;
    if (s === "rejected") return <span className="text-destructive font-medium text-xs">❌ Recusado</span>;
    return <span className="text-muted-foreground text-xs">{s}</span>;
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
            { key: "clicks" as const, label: "Cliques", icon: Clock },
            { key: "adjustments" as const, label: "Ajustes de Saldo", icon: Wallet },
            { key: "withdrawals" as const, label: "Saques", icon: Banknote },
            { key: "referrals" as const, label: "Indicações", icon: Users },
            { key: "ranking" as const, label: "Ranking", icon: TrendingUp },
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
              clicks.map((c) => {
                const isCommission = (c as any).referral_commission_paid === true;
                return (
                  <div key={c.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{isCommission ? "Comissão de indicação" : "Visualização de anúncio"}</p>
                      <p className="text-muted-foreground text-xs">
                        {(c.ads as unknown as { title: string })?.title || "Anúncio"} • {new Date(c.clicked_at).toLocaleDateString("pt-BR")} às {new Date(c.clicked_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <span className="text-primary font-semibold text-sm">+{formatBRL(Number(c.earned_value))}</span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "adjustments" && (
          <div className="glass-card rounded-xl divide-y divide-border/50 animate-fade-in">
            {adjustments.length === 0 ? (
              <p className="p-8 text-muted-foreground text-sm text-center">Nenhum ajuste de saldo registrado</p>
            ) : (
              adjustments.map((a) => (
                <div key={a.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{a.note || (a.amount >= 0 ? "Crédito manual" : "Débito manual")}</p>
                    <p className="text-muted-foreground text-xs">
                      {new Date(a.created_at).toLocaleDateString("pt-BR")} às {new Date(a.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className={`font-semibold text-sm ${a.amount >= 0 ? "text-primary" : "text-destructive"}`}>
                    {a.amount >= 0 ? "+" : ""}{formatBRL(Number(a.amount))}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "withdrawals" && (
          <div className="glass-card rounded-xl divide-y divide-border/50 animate-fade-in">
            {withdrawals.length === 0 ? (
              <p className="p-8 text-muted-foreground text-sm text-center">Nenhum saque solicitado</p>
            ) : (
              withdrawals.map((w) => (
                <div key={w.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{formatBRL(Number(w.amount))}</p>
                    <p className="text-muted-foreground text-xs">
                      {new Date(w.requested_at).toLocaleDateString("pt-BR")} — Pix: {w.pix_key || "N/A"}
                    </p>
                  </div>
                  {statusLabel(w.status)}
                </div>
              ))
            )}
          </div>
        )}

        {tab === "referrals" && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-card rounded-xl p-5">
                <p className="text-sm text-muted-foreground mb-1">Total na rede</p>
                <p className="font-heading text-3xl font-bold text-primary">{directCount + indirectCount}</p>
              </div>
              <div className="glass-card rounded-xl p-5">
                <p className="text-sm text-muted-foreground mb-1">Cadastros diretos</p>
                <p className="font-heading text-3xl font-bold text-primary">{directCount}</p>
              </div>
              <div className="glass-card rounded-xl p-5">
                <p className="text-sm text-muted-foreground mb-1">Cadastros indiretos</p>
                <p className="font-heading text-3xl font-bold text-accent">{indirectCount}</p>
              </div>
            </div>

            <h3 className="font-heading text-lg font-semibold mt-4">Meus indicados diretos</h3>
            <div className="glass-card rounded-xl divide-y divide-border/50">
              {referrals.filter(r => r.level === 1).length === 0 ? (
                <p className="p-8 text-muted-foreground text-sm text-center">Nenhuma indicação direta ainda. Compartilhe seu link!</p>
              ) : (
                referrals.filter(r => r.level === 1).map((r) => (
                  <div key={r.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{r.profile?.name || "Afiliado"}</p>
                      <p className="text-muted-foreground text-xs">{new Date(r.created_at).toLocaleDateString("pt-BR")} • {(r.commission_rate * 100).toFixed(0)}% comissão</p>
                    </div>
                    <span className="text-accent font-semibold text-sm">Nível {r.level}</span>
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
