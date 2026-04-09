import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DollarSign, Eye, TrendingUp, Zap, LogOut, Copy, Check, Gift, Clock, ArrowUpRight, Crown, History as HistoryIcon, UserCog, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import AdTimer from "@/components/AdTimer";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";

interface Ad {
  id: string;
  title: string;
  url: string;
  view_time: number;
  open_link?: boolean;
  reward_value?: number | null;
}

interface Click {
  id: string;
  ad_id: string;
  earned_value: number;
  clicked_at: string;
  referral_commission_paid?: boolean | null;
  ads?: { title: string } | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAdmin, signOut, loading: authLoading } = useAuth();
  const viewAsUserId = isAdmin ? searchParams.get("view_as") : null;
  const targetUserId = viewAsUserId || user?.id;
  const [ads, setAds] = useState<Ad[]>([]);
  const [historyItems, setHistoryItems] = useState<Array<{ id: string; type: string; label: string; sublabel: string; amount: number; date: Date }>>([]);
  
  const [balance, setBalance] = useState(0);
  const [clickValue, setClickValue] = useState(0.001);
  const [planName, setPlanName] = useState("Free");
  const [dailyLimit, setDailyLimit] = useState(10);
  const [todayClicks, setTodayClicks] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [todayClickedAdIds, setTodayClickedAdIds] = useState<Set<string>>(new Set());
  const [activeAd, setActiveAd] = useState<{ id: string; title: string; url: string; reward: string; view_time: number; open_link: boolean } | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [minWithdrawal, setMinWithdrawal] = useState(150);
  const [allPlans, setAllPlans] = useState<Array<{ name: string; referral_commission: number }>>([]);

  useEffect(() => {
    if (!authLoading && !user) { navigate("/login"); return; }
    if (user && targetUserId) loadData();
  }, [user, authLoading, targetUserId]);

  const loadData = async () => {
    if (!user || !targetUserId) return;

    const { data: userPlan } = await supabase
      .from("user_plans")
      .select("plan_id, plans(name, click_value, daily_click_limit)")
      .eq("user_id", targetUserId)
      .eq("is_active", true)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (userPlan?.plans) {
      const plan = userPlan.plans as unknown as { name: string; click_value: number; daily_click_limit: number };
      setPlanName(plan.name);
      setClickValue(plan.click_value);
      setDailyLimit(plan.daily_click_limit);
    }

    const { data: adsData } = await supabase.from("ads").select("*").eq("is_active", true);
    setAds(adsData || []);

    const today = new Date().toISOString().split("T")[0];
    const { data: todayClicksData } = await supabase
      .from("clicks")
      .select("*, ads(title)")
      .eq("user_id", targetUserId)
      .gte("clicked_at", today);

    setTodayClicks(todayClicksData?.length || 0);
    setTodayEarnings(todayClicksData?.reduce((sum, c) => sum + Number(c.earned_value), 0) || 0);
    setTodayClickedAdIds(new Set((todayClicksData || []).map((c) => c.ad_id)));

    const { data: allClicks } = await supabase.from("clicks").select("earned_value").eq("user_id", targetUserId);
    const totalEarned = allClicks?.reduce((sum, c) => sum + Number(c.earned_value), 0) || 0;

    const { data: withdrawals } = await supabase.from("withdrawals").select("amount, status").eq("user_id", targetUserId).in("status", ["approved", "pending"]);
    const totalWithdrawn = withdrawals?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;

    const { data: adjustmentsData } = await supabase.from("balance_adjustments").select("amount").eq("user_id", targetUserId);
    const totalAdjustments = adjustmentsData?.reduce((sum, a) => sum + Number(a.amount), 0) || 0;

    setBalance(totalEarned + totalAdjustments - totalWithdrawn);

    // Load min withdrawal setting
    const { data: settingData } = await supabase.from("settings").select("value").eq("key", "min_withdrawal").maybeSingle();
    if (settingData) setMinWithdrawal(Number(settingData.value));

    // Load all plans for commission display
    const { data: plansData } = await supabase.from("plans").select("name, referral_commission").eq("is_active", true).order("price", { ascending: true });
    setAllPlans(plansData || []);

    // Load profile data for withdrawal pre-fill
    const { data: profileData } = await supabase.from("profiles").select("name, cpf, pix_key, phone").eq("user_id", targetUserId).maybeSingle();
    if (profileData) {
      setWName(profileData.name || "");
      setWCpf(profileData.cpf || "");
      setWPix(profileData.pix_key || "");
      setWPhone(profileData.phone || "");
    }

    const [{ data: recentClicks }, { data: recentAdjustments }] = await Promise.all([
      supabase.from("clicks").select("*, ads(title)").eq("user_id", targetUserId).order("clicked_at", { ascending: false }).limit(10),
      supabase.from("balance_adjustments").select("*").eq("user_id", targetUserId).order("created_at", { ascending: false }).limit(10),
    ]);

    const items: Array<{ id: string; type: string; label: string; sublabel: string; amount: number; date: Date }> = [];
    (recentClicks || []).forEach((c: any) => {
      const isCommission = c.referral_commission_paid === true;
      items.push({
        id: c.id,
        type: isCommission ? "comissao" : "anuncio",
        label: isCommission ? "Comissão de indicação" : "Visualização de anúncio",
        sublabel: c.ads?.title || "Anúncio",
        amount: Number(c.earned_value),
        date: new Date(c.clicked_at),
      });
    });
    (recentAdjustments || []).forEach((a: any) => {
      items.push({
        id: a.id,
        type: "ajuste",
        label: a.note || "Ajuste de saldo",
        sublabel: "",
        amount: Number(a.amount),
        date: new Date(a.created_at),
      });
    });
    items.sort((a, b) => b.date.getTime() - a.date.getTime());
    setHistoryItems(items.slice(0, 10));

    const { count } = await supabase.from("referrals").select("id", { count: "exact", head: true }).eq("referrer_id", targetUserId);
    setReferralCount(count || 0);
  };

  const handleAdComplete = async (adId: string) => {
    if (!user) return;
    const ad = ads.find((a) => a.id === adId);
    if (!ad) return;

    const adEarnedValue = ad.reward_value != null ? ad.reward_value : clickValue;

    const { error } = await supabase.from("clicks").insert({
      user_id: user.id,
      ad_id: ad.id,
      earned_value: adEarnedValue,
    });

    if (error) {
      toast.error("Erro ao registrar clique");
    } else {
      toast.success("Recompensa creditada!");
      loadData();
    }
  };

  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [wName, setWName] = useState("");
  const [wCpf, setWCpf] = useState("");
  const [wPix, setWPix] = useState("");
  const [wPhone, setWPhone] = useState("");
  const [wSubmitting, setWSubmitting] = useState(false);

  const handleWithdrawal = async () => {
    if (!user) return;
    if (balance < minWithdrawal) { toast.info(`Saque mínimo: ${formatBRL(minWithdrawal)}`); return; }
    if (!wName || !wCpf || !wPix || !wPhone) { toast.error("Preencha todos os campos"); return; }
    if (wCpf.replace(/\D/g, "").length !== 11) { toast.error("CPF inválido"); return; }

    if (!window.confirm("⚠️ ATENÇÃO: Confira se os dados estão corretos antes de enviar.\n\nNome: " + wName + "\nCPF: " + wCpf + "\nChave Pix: " + wPix + "\nTelefone: " + wPhone + "\n\nO saque será processado em até 3 dias úteis. Os dados devem ser os mesmos da conta que receberá o Pix.\n\nDeseja continuar?")) return;

    setWSubmitting(true);
    const { error } = await supabase.from("withdrawals").insert({
      user_id: user.id, amount: balance,
      holder_name: wName, cpf: wCpf, pix_key: wPix, phone: wPhone,
    });
    setWSubmitting(false);
    if (error) { toast.error("Erro ao solicitar saque"); return; }
    toast.success("Saque solicitado! Será processado em até 3 dias úteis.");
    setShowWithdrawForm(false);
    setWName(""); setWCpf(""); setWPix(""); setWPhone("");
    loadData();
  };

  const referralBaseUrl = window.location.hostname.includes('preview--') 
    ? window.location.origin.replace('preview--', '') 
    : window.location.origin;

  const [copied, setCopied] = useState(false);
  const copyReferral = useCallback(() => {
    const link = `${referralBaseUrl}/register?ref=${user?.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [referralBaseUrl, user?.id]);

  const availableAds = ads.filter((a) => !todayClickedAdIds.has(a.id));
  const canClick = todayClicks < dailyLimit;
  const allAdsViewed = canClick && availableAds.length === 0 && ads.length > 0;
  const showCountdown = !canClick || allAdsViewed;
  const progressPercent = Math.min((todayClicks / dailyLimit) * 100, 100);

  // Countdown to next day (midnight)
  const [countdown, setCountdown] = useState("");
  useEffect(() => {
    if (!showCountdown) { setCountdown(""); return; }
    const tick = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [showCountdown]);

  if (authLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Zap className="h-8 w-8 text-primary animate-pulse" /></div>;

  return (
    <div className="min-h-screen bg-background">
      {viewAsUserId && (
        <div className="bg-yellow-500/20 border-b border-yellow-500/50 text-yellow-200 text-center py-2 text-sm font-medium">
          ⚠️ Visualizando painel do usuário (modo admin) — <button className="underline" onClick={() => window.close()}>Fechar</button>
        </div>
      )}
      <nav className="border-b border-border/50 glass-card">
        <div className="container mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-heading text-lg font-bold">ClickPay</span>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>Admin</Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
              <UserCog className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Meu Cadastro</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/history")}>
              <HistoryIcon className="h-4 w-4" />
            </Button>
            <Button variant="gold" size="sm" onClick={() => navigate("/plans")}>
              <Crown className="h-4 w-4 mr-1" /> Upgrade
            </Button>
            <span className="text-sm text-muted-foreground hidden sm:inline">Plano: <span className="text-primary font-semibold">{planName}</span></span>
            <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate("/"); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Saldo Atual", value: formatBRL(balance), icon: DollarSign, glow: true },
            { label: "Anúncios Hoje", value: `${todayClicks}/${dailyLimit}`, icon: Eye, glow: false },
            { label: "Ganhos Hoje", value: formatBRL(todayEarnings), icon: TrendingUp, glow: false },
            { label: "Indicações", value: String(referralCount), icon: Gift, glow: false },
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

        {/* Daily progress bar */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Progresso diário</span>
            <span className="text-muted-foreground text-xs">{todayClicks}/{dailyLimit} cliques</span>
          </div>
          <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progressPercent}%`,
                background: "var(--gradient-primary)",
              }}
            />
          </div>
          <p className="text-muted-foreground text-xs mt-2">
            Ganhos hoje: <span className="text-primary font-semibold">{formatBRL(todayEarnings)}</span>
          </p>
        </div>

        {/* Referral link */}
        <div className="glass-card rounded-xl p-5 flex flex-col gap-3">
          <div>
            <p className="text-sm font-semibold mb-1">Seu link de indicação</p>
            <p className="text-muted-foreground text-xs break-all">{referralBaseUrl}/register?ref={user?.id?.slice(0, 8)}...</p>
            <p className="text-accent text-xs mt-1 flex items-center gap-1 flex-wrap">
              <span>Comissões:</span>
              {allPlans.map((p, i) => (
                <span key={p.name}>{i > 0 ? " | " : ""}{p.name}: <span className="font-semibold">{formatBRL(p.referral_commission)}</span></span>
              ))}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-center">
                    <p>Você recebe esta comissão quando alguém se cadastra pelo seu link de indicação</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </p>
          </div>
          <Button
            variant="hero"
            size="lg"
            className={`w-full text-base font-bold gap-2 transition-all duration-300 ${copied ? "bg-green-600 hover:bg-green-600 scale-105" : ""}`}
            onClick={copyReferral}
          >
            {copied ? (
              <><Check className="h-5 w-5 animate-scale-in" /> Link Copiado!</>
            ) : (
              <><Copy className="h-5 w-5" /> Copiar Link de Indicação</>
            )}
          </Button>
        </div>

        {/* Ads + History */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-heading text-xl font-bold">Anúncios Disponíveis</h2>
            {showCountdown ? (
              <div className="glass-card rounded-xl p-8 text-center">
                <Clock className="h-10 w-10 text-primary mx-auto mb-3 animate-pulse" />
                <p className="text-foreground font-semibold text-lg mb-1">
                  {!canClick ? "Limite diário atingido!" : "Todos os anúncios foram visualizados!"}
                </p>
                <p className="text-muted-foreground text-sm mb-4">Próximos anúncios disponíveis em:</p>
                <div className="inline-flex items-center gap-1 bg-primary/10 border border-primary/30 rounded-xl px-6 py-3">
                  <span className="font-heading text-3xl font-bold text-primary tracking-widest">{countdown || "--:--:--"}</span>
                </div>
                <p className="text-muted-foreground text-xs mt-4">Ou faça upgrade para aumentar seu limite diário</p>
                <Button variant="gold" size="sm" className="mt-3" onClick={() => navigate("/plans")}>
                  <Crown className="h-4 w-4 mr-1" /> Fazer Upgrade
                </Button>
              </div>
            ) : (
              availableAds.map((ad) => {
                const adValue = ad.reward_value != null ? ad.reward_value : clickValue;
                return (
                  <div key={ad.id} className="glass-card rounded-xl p-4 flex items-center justify-between hover:border-primary/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Eye className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{ad.title}</p>
                        <p className="text-muted-foreground text-xs">Ganhe {formatBRL(adValue)} • {ad.view_time}s</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => setActiveAd({ id: ad.id, title: ad.title, url: ad.url, reward: formatBRL(adValue), view_time: ad.view_time, open_link: ad.open_link !== false })}>
                      Ver Anúncio <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-xl font-bold">Histórico</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate("/history")}>Ver tudo</Button>
            </div>
            <div className="glass-card rounded-xl divide-y divide-border/50">
              {historyItems.length === 0 ? (
                <p className="p-4 text-muted-foreground text-sm text-center">Nenhuma atividade ainda</p>
              ) : (
                historyItems.map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-muted-foreground text-xs">
                        {item.sublabel ? `${item.sublabel} • ` : ""}{item.date.toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <span className={`font-semibold text-sm ${item.amount >= 0 ? "text-primary" : "text-destructive"}`}>
                      {item.amount >= 0 ? "+" : ""}{formatBRL(item.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
            <Button variant="gold" className="w-full" onClick={() => setShowWithdrawForm(true)}>
              Solicitar Saque
            </Button>
            {showWithdrawForm && (
              <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowWithdrawForm(false)}>
                <div className="bg-background border border-border rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
                  <h3 className="font-heading text-lg font-bold">Solicitar Saque</h3>
                  <p className="text-sm text-muted-foreground">Valor: <span className="text-primary font-bold">{formatBRL(balance)}</span></p>
                  <div className="bg-accent/10 border border-accent/30 rounded-lg p-3">
                    <p className="text-xs text-accent font-medium">⚠️ Os dados devem ser iguais aos da conta que receberá o Pix. Confira antes de enviar. Processamento em até 3 dias úteis.</p>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Nome completo (titular)</label>
                      <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Nome completo" value={wName} onChange={(e) => setWName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">CPF</label>
                      <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="000.000.000-00" value={wCpf} onChange={(e) => setWCpf(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Chave Pix</label>
                      <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="CPF, e-mail, celular ou chave aleatória" value={wPix} onChange={(e) => setWPix(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Telefone</label>
                      <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="(00) 00000-0000" value={wPhone} onChange={(e) => setWPhone(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" onClick={() => setShowWithdrawForm(false)}>Cancelar</Button>
                    <Button variant="gold" disabled={wSubmitting} onClick={handleWithdrawal}>
                      {wSubmitting ? "Enviando..." : "Confirmar Saque"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
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
