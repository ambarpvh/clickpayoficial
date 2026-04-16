import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Users, Eye, DollarSign, AlertCircle, LogOut, Plus, BarChart3, Pencil, Trash2, Ban, ShieldCheck, Settings, Link2, Link2Off, CreditCard, CheckCircle, XCircle, Image, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { format, subDays, parseISO } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";

const Admin = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "ads" | "withdrawals" | "plans" | "payments" | "settings">("overview");
  const [minWithdrawal, setMinWithdrawal] = useState("150");
  const [savingSettings, setSavingSettings] = useState(false);
  const [showAdForm, setShowAdForm] = useState(false);
  const [editingAd, setEditingAd] = useState<any>(null);
  const [adTitle, setAdTitle] = useState("");
  const [adUrl, setAdUrl] = useState("");
  const [adTime, setAdTime] = useState(10);
  const [adOpenLink, setAdOpenLink] = useState(true);
  const [adRewardValue, setAdRewardValue] = useState<string>("");
  const [adSubmitting, setAdSubmitting] = useState(false);

  // Plan editing
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planName, setPlanName] = useState("");
  const [planPrice, setPlanPrice] = useState(0);
  const [planClickValue, setPlanClickValue] = useState(0.001);
  const [planDailyLimit, setPlanDailyLimit] = useState(10);
  const [planReferralCommission, setPlanReferralCommission] = useState(1.00);
  const [showPlanForm, setShowPlanForm] = useState(false);

  // Plan deletion
  const [deletingPlan, setDeletingPlan] = useState<any>(null);
  const [deletePlanUsers, setDeletePlanUsers] = useState<number>(0);
  const [transferPlanId, setTransferPlanId] = useState<string>("");
  const [deletePlanStep, setDeletePlanStep] = useState<"confirm" | "transfer" | null>(null);

  // Balance adjustment
  const [adjustingBalance, setAdjustingBalance] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustType, setAdjustType] = useState<"add" | "remove">("add");

  // Plan change for user
  const [changingPlanUser, setChangingPlanUser] = useState<string | null>(null);
  const [selectedNewPlan, setSelectedNewPlan] = useState<string>("");

  // Data
  const [users, setUsers] = useState<any[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(0);
  const [usersSortKey, setUsersSortKey] = useState<"date" | "name" | "plan" | "balance">("date");
  const [usersSortAsc, setUsersSortAsc] = useState(false);
  const USERS_PER_PAGE = 20;
  const [ads, setAds] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [adMetrics, setAdMetrics] = useState<Record<string, { clicks: number; earned: number }>>({});
  const [clicksPerDay, setClicksPerDay] = useState<{ date: string; clicks: number }[]>([]);
  const [revenuePerDay, setRevenuePerDay] = useState<{ date: string; revenue: number }[]>([]);
  const [stats, setStats] = useState({ users: 0, clicks: 0, pendingWithdrawals: 0, activeAds: 0, totalPaid: 0 });

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) { navigate("/dashboard"); return; }
    if (user && isAdmin) loadData();
  }, [user, isAdmin, authLoading]);

  const loadData = async () => {
    try {
      const [
        { count: userCount, error: userCountError },
        { count: clickCount, error: clickCountError },
        { count: pendingCount, error: pendingCountError },
        { count: activeAdsCount, error: activeAdsCountError },
        { data: approvedW, error: approvedWError },
        { data: profilesData, error: profilesError },
        { data: adsData, error: adsError },
        { data: plansData, error: plansError },
        { data: withdrawalsData, error: withdrawalsError },
        { data: paymentsData, error: paymentsError },
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("clicks").select("id", { count: "exact", head: true }),
        supabase.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("ads").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("withdrawals").select("amount").eq("status", "approved"),
        supabase.from("profiles").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(0, 9999),
        supabase.from("ads").select("*").order("created_at", { ascending: false }),
        supabase.from("plans").select("*").order("price", { ascending: true }),
        supabase.from("withdrawals").select("*").eq("status", "pending").order("requested_at", { ascending: false }),
        supabase.from("payments").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      ]);

      const firstError = userCountError || clickCountError || pendingCountError || activeAdsCountError || approvedWError || profilesError || adsError || plansError || withdrawalsError || paymentsError;

      if (firstError) {
        console.error("Erro ao carregar dados do admin:", firstError);
        toast.error(`Erro ao carregar painel: ${firstError.message}`);
        return;
      }

      const totalPaid = approvedW?.reduce((s, w) => s + Number(w.amount), 0) || 0;

      setStats({ users: userCount || 0, clicks: clickCount || 0, pendingWithdrawals: pendingCount || 0, activeAds: activeAdsCount || 0, totalPaid });
      // Fetch balances for each user
      const userIds = (profilesData || []).map((p: any) => p.user_id);
      const [
        { data: allClicks },
        { data: allAdjustments },
        { data: allWithdrawalsAll },
        { data: allUserPlans },
      ] = await Promise.all([
        supabase.from("clicks").select("user_id, earned_value").in("user_id", userIds),
        supabase.from("balance_adjustments").select("user_id, amount").in("user_id", userIds),
        supabase.from("withdrawals").select("user_id, amount, status").in("user_id", userIds),
        supabase.from("user_plans").select("user_id, plan_id, is_active").eq("is_active", true).in("user_id", userIds),
      ]);

      const balanceMap: Record<string, number> = {};
      (allClicks || []).forEach((c: any) => { balanceMap[c.user_id] = (balanceMap[c.user_id] || 0) + Number(c.earned_value); });
      (allAdjustments || []).forEach((a: any) => { balanceMap[a.user_id] = (balanceMap[a.user_id] || 0) + Number(a.amount); });
      (allWithdrawalsAll || []).forEach((w: any) => { if (w.status === "approved" || w.status === "pending") { balanceMap[w.user_id] = (balanceMap[w.user_id] || 0) - Number(w.amount); } });

      const planMap: Record<string, string> = {};
      (allUserPlans || []).forEach((up: any) => { planMap[up.user_id] = up.plan_id; });

      const enrichedUsers = (profilesData || []).map((p: any) => ({
        ...p,
        balance: balanceMap[p.user_id] || 0,
        activePlanId: planMap[p.user_id] || null,
      }));

      setUsers(enrichedUsers);
      setUsersTotal(userCount || 0);
      setAds(adsData || []);
      setPlans(plansData || []);
      setWithdrawals(withdrawalsData || []);
      setPendingPayments(paymentsData || []);

      // Fetch click metrics per ad + clicks per day chart
      const thirtyDaysAgo = subDays(new Date(), 29).toISOString();
      const { data: clicksData } = await supabase.from("clicks").select("ad_id, earned_value, clicked_at").gte("clicked_at", thirtyDaysAgo);
      const metrics: Record<string, { clicks: number; earned: number }> = {};
      const dayMap: Record<string, number> = {};
      const revMap: Record<string, number> = {};
      (clicksData || []).forEach((c: any) => {
        if (!metrics[c.ad_id]) metrics[c.ad_id] = { clicks: 0, earned: 0 };
        metrics[c.ad_id].clicks += 1;
        metrics[c.ad_id].earned += Number(c.earned_value);
        const day = format(parseISO(c.clicked_at), "dd/MM");
        dayMap[day] = (dayMap[day] || 0) + 1;
        revMap[day] = (revMap[day] || 0) + Number(c.earned_value);
      });
      setAdMetrics(metrics);
      const days: { date: string; clicks: number }[] = [];
      const revDays: { date: string; revenue: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = format(subDays(new Date(), i), "dd/MM");
        days.push({ date: d, clicks: dayMap[d] || 0 });
        revDays.push({ date: d, revenue: Number((revMap[d] || 0).toFixed(4)) });
      }
      setClicksPerDay(days);
      setRevenuePerDay(revDays);

      // Load settings
      const { data: settingsData } = await supabase.from("settings").select("*").eq("key", "min_withdrawal").maybeSingle();
      if (settingsData) setMinWithdrawal(settingsData.value);
    } catch (error: any) {
      console.error("Exceção ao carregar admin:", error);
      toast.error(`Erro inesperado no painel: ${error.message}`);
    }
  };

  const saveMinWithdrawal = async () => {
    setSavingSettings(true);
    const { error } = await supabase.from("settings").update({ value: minWithdrawal, updated_at: new Date().toISOString() }).eq("key", "min_withdrawal");
    if (error) { toast.error("Erro ao salvar configuração"); setSavingSettings(false); return; }
    toast.success("Valor mínimo de saque atualizado!");
    setSavingSettings(false);
  };

  // --- Ad CRUD ---
  const resetAdForm = () => { setAdTitle(""); setAdUrl(""); setAdTime(10); setAdOpenLink(true); setAdRewardValue(""); setEditingAd(null); setShowAdForm(false); };

  const saveAd = async () => {
    if (!adTitle || !adUrl) { toast.error("Preencha todos os campos"); return; }
    if (adSubmitting) return;

    setAdSubmitting(true);

    try {
      const adData = { title: adTitle, url: adUrl, view_time: adTime, open_link: adOpenLink, reward_value: adRewardValue ? Number(adRewardValue) : null };
      if (editingAd) {
        const { error } = await supabase.from("ads").update(adData).eq("id", editingAd.id);
        if (error) { console.error("Erro ao editar anúncio:", error); toast.error("Erro ao editar: " + error.message); setAdSubmitting(false); return; }
        toast.success("Anúncio atualizado!");
      } else {
        const { data, error } = await supabase.from("ads").insert([adData]).select();
        console.log("Insert result:", data, error);
        if (error) { console.error("Erro ao criar anúncio:", error); toast.error("Erro ao criar: " + error.message); setAdSubmitting(false); return; }
        toast.success("Anúncio criado!");
      }
      resetAdForm();
      loadData();
    } catch (e: any) {
      console.error("Exceção ao salvar anúncio:", e);
      toast.error("Erro inesperado: " + (e?.message || "desconhecido"));
    }
    setAdSubmitting(false);
  };

  const toggleAd = async (id: string, active: boolean) => {
    const { error } = await supabase.from("ads").update({ is_active: !active }).eq("id", id);
    if (error) {
      console.error("Erro ao alterar status do anúncio:", error);
      toast.error("Erro ao alterar status: " + error.message);
      return;
    }
    toast.success(active ? "Anúncio pausado" : "Anúncio ativado");
    await loadData();
  };

  const deleteAd = async (id: string) => {
    const { error } = await supabase.from("ads").delete().eq("id", id);
    if (error) {
      console.error("Erro ao excluir anúncio:", error);
      toast.error("Erro ao excluir: " + error.message);
      return;
    }
    toast.success("Anúncio excluído");
    await loadData();
  };

  const startEditAd = (ad: any) => {
    setEditingAd(ad);
    setAdTitle(ad.title);
    setAdUrl(ad.url);
    setAdTime(ad.view_time);
    setAdOpenLink(ad.open_link !== false);
    setAdRewardValue(ad.reward_value != null ? String(ad.reward_value) : "");
    setShowAdForm(true);
  };

  // --- Plan CRUD ---
  const resetPlanForm = () => { setPlanName(""); setPlanPrice(0); setPlanClickValue(0.001); setPlanDailyLimit(10); setPlanReferralCommission(1.00); setEditingPlan(null); setShowPlanForm(false); };

  const savePlan = async () => {
    if (!planName) { toast.error("Nome obrigatório"); return; }
    if (editingPlan) {
      const { error } = await supabase.from("plans").update({ name: planName, price: planPrice, click_value: planClickValue, daily_click_limit: planDailyLimit, referral_commission: planReferralCommission } as any).eq("id", editingPlan.id);
      if (error) { toast.error("Erro ao editar plano"); return; }
      toast.success("Plano atualizado!");
    } else {
      const { error } = await supabase.from("plans").insert({ name: planName, price: planPrice, click_value: planClickValue, daily_click_limit: planDailyLimit, referral_commission: planReferralCommission } as any);
      if (error) { toast.error("Erro ao criar plano"); return; }
      toast.success("Plano criado!");
    }
    resetPlanForm();
    loadData();
  };

  const startEditPlan = (plan: any) => {
    setEditingPlan(plan);
    setPlanName(plan.name);
    setPlanPrice(plan.price);
    setPlanClickValue(plan.click_value);
    setPlanDailyLimit(plan.daily_click_limit);
    setPlanReferralCommission(plan.referral_commission ?? 1.00);
    setShowPlanForm(true);
  };

  const startDeletePlan = async (plan: any) => {
    const { count } = await supabase.from("user_plans").select("id", { count: "exact", head: true }).eq("plan_id", plan.id).eq("is_active", true);
    setDeletingPlan(plan);
    setDeletePlanUsers(count || 0);
    setTransferPlanId("");
    setDeletePlanStep((count || 0) > 0 ? "transfer" : "confirm");
  };

  const confirmDeletePlan = async (forceDelete: boolean) => {
    if (!deletingPlan) return;
    try {
      if (deletePlanUsers > 0 && !forceDelete && transferPlanId) {
        const { error: transferErr } = await supabase.from("user_plans").update({ plan_id: transferPlanId }).eq("plan_id", deletingPlan.id).eq("is_active", true);
        if (transferErr) { toast.error("Erro ao transferir usuários: " + transferErr.message); return; }
        toast.success(`${deletePlanUsers} usuário(s) transferido(s)!`);
      }
      const { error } = await supabase.from("plans").delete().eq("id", deletingPlan.id);
      if (error) { toast.error("Erro ao excluir plano: " + error.message); return; }
      toast.success("Plano excluído!");
      setDeletingPlan(null);
      setDeletePlanStep(null);
      loadData();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  };

  // --- Users ---
  const handleWithdrawal = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("withdrawals").update({ status, processed_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error("Erro"); return; }
    toast.success(status === "approved" ? "Saque aprovado!" : "Saque recusado");
    loadData();
  };

  const adjustBalance = async (userId: string) => {
    const amount = parseFloat(adjustAmount);
    if (!amount || amount <= 0) { toast.error("Valor inválido"); return; }
    const finalAmount = adjustType === "remove" ? -amount : amount;
    const { error } = await supabase.from("balance_adjustments").insert({
      user_id: userId,
      admin_id: user!.id,
      amount: finalAmount,
      note: adjustNote || (adjustType === "add" ? "Crédito manual" : "Débito manual"),
    });
    if (error) { toast.error("Erro ao ajustar saldo"); return; }
    toast.success(adjustType === "add" ? `${formatBRL(amount)} creditado!` : `${formatBRL(amount)} debitado!`);
    setAdjustingBalance(null);
    setAdjustAmount("");
    setAdjustNote("");
    loadData();
  };

  const changeUserPlan = async (userId: string) => {
    if (!selectedNewPlan) { toast.error("Selecione um plano"); return; }
    // Deactivate current plans
    await supabase.from("user_plans").update({ is_active: false }).eq("user_id", userId).eq("is_active", true);
    // Insert new plan
    const { error } = await supabase.from("user_plans").insert({ user_id: userId, plan_id: selectedNewPlan, is_active: true });
    if (error) { toast.error("Erro ao mudar plano: " + error.message); return; }
    toast.success("Plano do usuário atualizado!");
    setChangingPlanUser(null);
    setSelectedNewPlan("");
    loadData();
  };

  const handlePaymentAction = async (paymentId: string, action: "approved" | "rejected") => {
    if (action === "approved") {
      const payment = pendingPayments.find((p: any) => p.id === paymentId);
      if (!payment) return;

      // Deactivate current plan
      await supabase.from("user_plans").update({ is_active: false }).eq("user_id", payment.user_id).eq("is_active", true);
      // Activate new plan
      const { error: planError } = await supabase.from("user_plans").insert({ user_id: payment.user_id, plan_id: payment.plan_id, is_active: true });
      if (planError) { toast.error("Erro ao ativar plano: " + planError.message); return; }

      // Credit referral commissions for paid plan upgrade
      const planPrice = Number(payment.amount);
      const { data: refs } = await supabase
        .from("referrals")
        .select("referrer_id, level, commission_rate")
        .eq("referred_id", payment.user_id)
        .eq("level", 1);

      if (refs && refs.length > 0) {
        for (const ref of refs) {
          const commission = planPrice * ref.commission_rate;
          await supabase.from("balance_adjustments").insert({
            user_id: ref.referrer_id,
            admin_id: user!.id,
            amount: commission,
            note: `Comissão (${(ref.commission_rate * 100).toFixed(0)}%): Upgrade de plano`,
          });
        }
      }
    }
    const { error } = await supabase.from("payments").update({ status: action, updated_at: new Date().toISOString() }).eq("id", paymentId);
    if (error) { toast.error("Erro ao atualizar pagamento"); return; }
    toast.success(action === "approved" ? "Pagamento aprovado! Plano ativado e comissões creditadas." : "Pagamento recusado.");
    loadData();
  };

  const tabs = [
    { key: "overview" as const, label: "Visão Geral", icon: BarChart3 },
    { key: "users" as const, label: "Usuários", icon: Users },
    { key: "ads" as const, label: "Anúncios", icon: Eye },
    { key: "plans" as const, label: "Planos", icon: Settings },
    { key: "payments" as const, label: "Pagamentos", icon: CreditCard },
    { key: "withdrawals" as const, label: "Saques", icon: DollarSign },
    { key: "settings" as const, label: "Configurações", icon: Settings },
  ];

  if (authLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Zap className="h-8 w-8 text-primary animate-pulse" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 glass-card">
        <div className="container mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-heading text-lg font-bold">ClickPay</span>
            <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full font-semibold">Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>Dashboard</Button>
            <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate("/"); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
              <tab.icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
            {[
              { label: "Total Usuários", value: String(stats.users), icon: Users },
              { label: "Total Cliques", value: String(stats.clicks), icon: Eye },
              { label: "Anúncios Ativos", value: String(stats.activeAds), icon: Eye },
              { label: "Saques Pendentes", value: String(stats.pendingWithdrawals), icon: AlertCircle },
            ].map((s) => (
              <div key={s.label} className="glass-card rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground text-sm">{s.label}</span>
                  <s.icon className="h-4 w-4 text-primary" />
                </div>
                <p className="font-heading text-2xl font-bold">{s.value}</p>
              </div>
            ))}
            <div className="glass-card rounded-xl p-5 sm:col-span-2 lg:col-span-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-sm">Total Pago</span>
                <DollarSign className="h-4 w-4 text-accent" />
              </div>
              <p className="font-heading text-2xl font-bold gradient-text-gold">{formatBRL(stats.totalPaid)}</p>
            </div>
            <div className="glass-card rounded-xl p-5 sm:col-span-2 lg:col-span-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground text-sm font-medium">Cliques por Dia (últimos 30 dias)</span>
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <ChartContainer config={{ clicks: { label: "Cliques", color: "hsl(var(--primary))" } }} className="h-[250px] w-full">
                <BarChart data={clicksPerDay}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="clicks" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
            <div className="glass-card rounded-xl p-5 sm:col-span-2 lg:col-span-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-muted-foreground text-sm font-medium">Receita por Dia (últimos 30 dias)</span>
                <DollarSign className="h-4 w-4 text-accent" />
              </div>
              <ChartContainer config={{ revenue: { label: "Receita (R$)", color: "hsl(var(--accent))" } }} className="h-[250px] w-full">
                <BarChart data={revenuePerDay}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        )}

        {/* Users */}
        {activeTab === "users" && (
          <div className="animate-fade-in glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    {([
                      { key: "date" as const, label: "Data", hiddenSm: false },
                      { key: "name" as const, label: "Nome", hiddenSm: false },
                      { key: null as null, label: "Email", hiddenSm: true },
                      { key: "plan" as const, label: "Plano", hiddenSm: false },
                      { key: "balance" as const, label: "Valor Geral", hiddenSm: false },
                      { key: null as null, label: "Ações", hiddenSm: false },
                    ]).map((col, i) => (
                      <th
                        key={i}
                        className={`text-left p-4 text-muted-foreground font-medium ${col.hiddenSm ? "hidden sm:table-cell" : ""} ${col.key ? "cursor-pointer select-none hover:text-foreground transition-colors" : ""}`}
                        onClick={() => {
                          if (!col.key) return;
                          if (usersSortKey === col.key) setUsersSortAsc(!usersSortAsc);
                          else { setUsersSortKey(col.key); setUsersSortAsc(col.key === "name"); }
                        }}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {col.key && (
                            usersSortKey === col.key
                              ? (usersSortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)
                              : <ArrowUpDown className="h-3 w-3 opacity-40" />
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...users].sort((a, b) => {
                    const dir = usersSortAsc ? 1 : -1;
                    switch (usersSortKey) {
                      case "date": return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                      case "name": return dir * (a.name || "").localeCompare(b.name || "", "pt-BR");
                      case "plan": {
                        const pa = plans.find((p: any) => p.id === a.activePlanId);
                        const pb = plans.find((p: any) => p.id === b.activePlanId);
                        return dir * ((pa?.price || 0) - (pb?.price || 0));
                      }
                      case "balance": return dir * ((a.balance || 0) - (b.balance || 0));
                      default: return 0;
                    }
                  }).slice(usersPage * USERS_PER_PAGE, (usersPage + 1) * USERS_PER_PAGE).map((u: any) => (
                    <tr key={u.id} className="border-b border-border/30 hover:bg-secondary/30">
                      <td className="p-4 text-muted-foreground text-xs whitespace-nowrap">{new Date(u.created_at).toLocaleDateString("pt-BR")}</td>
                      <td className="p-4 font-medium">{u.name || "Sem nome"}</td>
                      <td className="p-4 text-muted-foreground hidden sm:table-cell">{u.email}</td>
                      <td className="p-4"><span className="text-primary font-semibold">{plans.find((p: any) => p.id === u.activePlanId)?.name || "Free"}</span></td>
                      <td className="p-4 font-semibold">{formatBRL(u.balance || 0)}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap items-start gap-2">
                          {adjustingBalance === u.user_id ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1">
                                <select value={adjustType} onChange={(e) => setAdjustType(e.target.value as "add" | "remove")} className="h-8 text-xs rounded-md bg-secondary border border-border px-1">
                                  <option value="add">+ Adicionar</option>
                                  <option value="remove">- Remover</option>
                                </select>
                                <Input type="number" placeholder="Valor" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} className="w-20 h-8 bg-secondary border-border text-xs" />
                              </div>
                              <Input placeholder="Observação..." value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} className="h-8 bg-secondary border-border text-xs" />
                              <div className="flex gap-1">
                                <Button size="sm" className="h-7 text-xs" onClick={() => adjustBalance(u.user_id)}>Confirmar</Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAdjustingBalance(null); setAdjustAmount(""); setAdjustNote(""); }}>✕</Button>
                              </div>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setAdjustingBalance(u.user_id); setAdjustType("add"); setAdjustAmount(""); setAdjustNote(""); }}>
                              <DollarSign className="h-3 w-3 mr-1" /> Saldo
                            </Button>
                          )}
                          {changingPlanUser === u.user_id ? (
                            <div className="flex items-center gap-1">
                              <select
                                value={selectedNewPlan}
                                onChange={(e) => setSelectedNewPlan(e.target.value)}
                                className="h-8 text-xs rounded-md bg-secondary border border-border px-2"
                              >
                                <option value="">Selecione...</option>
                                {plans.map((p: any) => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                              <Button size="sm" className="h-8 text-xs" onClick={() => changeUserPlan(u.user_id)}>OK</Button>
                              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setChangingPlanUser(null)}>✕</Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setChangingPlanUser(u.user_id); setSelectedNewPlan(""); }}>
                              <Settings className="h-3 w-3 mr-1" /> Plano
                            </Button>
                          )}
                          <Button size="sm" variant="default" className="h-8 text-xs" onClick={() => window.open(`/dashboard?view_as=${u.user_id}`, '_blank')} title="Ver painel do usuário">
                            <Eye className="h-4 w-4 mr-1" /> Ver Painel
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {usersTotal > USERS_PER_PAGE && (
              <div className="flex items-center justify-between p-4 border-t border-border/50">
                <span className="text-xs text-muted-foreground">
                  Mostrando {usersPage * USERS_PER_PAGE + 1}–{Math.min((usersPage + 1) * USERS_PER_PAGE, usersTotal)} de {usersTotal}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={usersPage === 0} onClick={() => setUsersPage(p => p - 1)}>Anterior</Button>
                  <Button size="sm" variant="outline" disabled={(usersPage + 1) * USERS_PER_PAGE >= usersTotal} onClick={() => setUsersPage(p => p + 1)}>Próximo</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ads */}
        {activeTab === "ads" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="font-heading text-xl font-bold">Gerenciar Anúncios</h2>
              <Button size="sm" onClick={() => { resetAdForm(); setShowAdForm(!showAdForm); }}>
                <Plus className="h-4 w-4 mr-1" /> Novo Anúncio
              </Button>
            </div>
            {showAdForm && (
              <div className="glass-card rounded-xl p-6 space-y-4 animate-slide-up">
                <h3 className="font-heading font-semibold">{editingAd ? "Editar Anúncio" : "Novo Anúncio"}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input placeholder="Nome do anúncio" value={adTitle} onChange={(e) => setAdTitle(e.target.value)} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <Input placeholder="https://..." value={adUrl} onChange={(e) => setAdUrl(e.target.value)} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tempo (s)</Label>
                    <Input type="number" value={adTime} onChange={(e) => setAdTime(Number(e.target.value))} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor por visualização (R$)</Label>
                    <Input type="number" step="0.01" placeholder="Usar valor do plano" value={adRewardValue} onChange={(e) => setAdRewardValue(e.target.value)} className="bg-secondary border-border" />
                    <p className="text-xs text-muted-foreground">Deixe vazio para usar o valor do plano do usuário</p>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <Switch checked={adOpenLink} onCheckedChange={setAdOpenLink} />
                    <Label className="text-sm">{adOpenLink ? "Abrir link do anúncio" : "Somente contagem de tempo"}</Label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveAd} disabled={adSubmitting}>{adSubmitting ? "Salvando..." : editingAd ? "Salvar Alterações" : "Criar Anúncio"}</Button>
                  <Button variant="ghost" onClick={resetAdForm}>Cancelar</Button>
                </div>
              </div>
            )}
            <div className="glass-card rounded-xl divide-y divide-border/50">
              {ads.map((ad: any) => {
                const m = adMetrics[ad.id] || { clicks: 0, earned: 0 };
                return (
                <div key={ad.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{ad.title}</p>
                    <p className="text-muted-foreground text-xs truncate">{ad.url}</p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-muted-foreground"><Eye className="h-3 w-3 inline mr-0.5" />{m.clicks} cliques</span>
                      <span className="text-xs text-muted-foreground"><DollarSign className="h-3 w-3 inline mr-0.5" />{formatBRL(m.earned)} ganho</span>
                      <span className="text-xs text-muted-foreground">
                        {ad.open_link !== false ? <Link2 className="h-3 w-3 inline mr-0.5" /> : <Link2Off className="h-3 w-3 inline mr-0.5" />}
                        {ad.open_link !== false ? "Abre link" : "Só timer"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${ad.is_active ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                      {ad.is_active ? "Ativo" : "Pausado"}
                    </span>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title={ad.open_link !== false ? "Desativar abertura de link" : "Ativar abertura de link"} onClick={async () => {
                      const { error } = await supabase.from("ads").update({ open_link: !(ad.open_link !== false) }).eq("id", ad.id);
                      if (error) { toast.error("Erro: " + error.message); return; }
                      toast.success(ad.open_link !== false ? "Link desativado" : "Link ativado");
                      loadData();
                    }}>
                      {ad.open_link !== false ? <Link2 className="h-3.5 w-3.5" /> : <Link2Off className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => startEditAd(ad)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => toggleAd(ad.id, ad.is_active)}>
                      {ad.is_active ? <Ban className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => deleteAd(ad.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                );
              })}
              {ads.length === 0 && <p className="p-4 text-muted-foreground text-sm text-center">Nenhum anúncio</p>}
            </div>
          </div>
        )}

        {/* Plans */}
        {activeTab === "plans" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="font-heading text-xl font-bold">Gerenciar Planos</h2>
              <Button size="sm" onClick={() => { resetPlanForm(); setShowPlanForm(!showPlanForm); }}>
                <Plus className="h-4 w-4 mr-1" /> Novo Plano
              </Button>
            </div>
            {showPlanForm && (
              <div className="glass-card rounded-xl p-6 space-y-4 animate-slide-up">
                <h3 className="font-heading font-semibold">{editingPlan ? "Editar Plano" : "Novo Plano"}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input value={planName} onChange={(e) => setPlanName(e.target.value)} className="bg-secondary border-border" />
                  </div>
                   <div className="space-y-2">
                    <Label>Preço (R$)</Label>
                    <Input type="number" step="0.01" value={planPrice} onChange={(e) => setPlanPrice(Number(e.target.value))} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor/Clique (R$)</Label>
                    <Input type="number" step="0.001" value={planClickValue} onChange={(e) => setPlanClickValue(Number(e.target.value))} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label>Limite diário</Label>
                    <Input type="number" value={planDailyLimit} onChange={(e) => setPlanDailyLimit(Number(e.target.value))} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label>Comissão por indicação (R$)</Label>
                    <Input type="number" step="0.01" value={planReferralCommission} onChange={(e) => setPlanReferralCommission(Number(e.target.value))} className="bg-secondary border-border" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={savePlan}>{editingPlan ? "Salvar" : "Criar Plano"}</Button>
                  <Button variant="ghost" onClick={resetPlanForm}>Cancelar</Button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {plans.map((plan: any) => (
                <div key={plan.id} className="glass-card rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-heading text-lg font-bold">{plan.name}</h3>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => startEditPlan(plan)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => startDeletePlan(plan)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="gradient-text-gold text-2xl font-bold mb-3">{plan.price === 0 ? "Grátis" : formatBRL(plan.price)}</p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Clique: <span className="text-primary font-semibold">{formatBRL(Number(plan.click_value), 3)}</span></p>
                    <p>Limite: <span className="text-foreground font-semibold">{plan.daily_click_limit}/dia</span></p>
                    <p>Comissão indicação: <span className="text-green-400 font-semibold">{formatBRL(Number(plan.referral_commission ?? 1))}</span></p>
                  </div>
                </div>
              ))}
            </div>

            {/* Delete plan dialog */}
            {deletePlanStep && deletingPlan && (
              <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => { setDeletingPlan(null); setDeletePlanStep(null); }}>
                <div className="bg-background border border-border rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
                  <h3 className="font-heading text-lg font-bold">Excluir plano "{deletingPlan.name}"</h3>
                  {deletePlanStep === "confirm" && (
                    <>
                      <p className="text-sm text-muted-foreground">Nenhum usuário está neste plano. Deseja excluí-lo?</p>
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={() => { setDeletingPlan(null); setDeletePlanStep(null); }}>Cancelar</Button>
                        <Button variant="destructive" onClick={() => confirmDeletePlan(true)}>Excluir</Button>
                      </div>
                    </>
                  )}
                  {deletePlanStep === "transfer" && (
                    <>
                      <p className="text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4 inline mr-1 text-destructive" />
                        Existem <strong>{deletePlanUsers}</strong> usuário(s) neste plano. Escolha uma ação:
                      </p>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>Transferir para outro plano:</Label>
                          <select
                            value={transferPlanId}
                            onChange={(e) => setTransferPlanId(e.target.value)}
                            className="w-full rounded-md border border-border bg-secondary p-2 text-sm"
                          >
                            <option value="">Selecione um plano...</option>
                            {plans.filter((p: any) => p.id !== deletingPlan.id).map((p: any) => (
                              <option key={p.id} value={p.id}>{p.name} ({formatBRL(p.price)})</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2 justify-end flex-wrap">
                          <Button variant="ghost" onClick={() => { setDeletingPlan(null); setDeletePlanStep(null); }}>Cancelar</Button>
                          <Button variant="destructive" onClick={() => confirmDeletePlan(true)}>Excluir mesmo assim</Button>
                          <Button disabled={!transferPlanId} onClick={() => confirmDeletePlan(false)}>Transferir e Excluir</Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Payments */}
        {activeTab === "payments" && (
          <div className="animate-fade-in">
            <h2 className="font-heading text-xl font-bold mb-4">Pagamentos Pendentes</h2>
            <div className="glass-card rounded-xl divide-y divide-border/50">
              {pendingPayments.map((p: any) => {
                const plan = plans.find((pl: any) => pl.id === p.plan_id);
                return (
                  <div key={p.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">Usuário: <span className="text-muted-foreground">{p.user_id.slice(0, 8)}...</span></p>
                      <p className="text-sm">Plano: <span className="text-primary font-semibold">{plan?.name || "?"}</span> — {formatBRL(Number(p.amount))}</p>
                      <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")} às {new Date(p.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.proof_url && (
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={async () => {
                          const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(p.proof_url!, 300);
                          if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                          else toast.error("Erro ao gerar link do comprovante");
                        }}>
                          <Image className="h-3 w-3 mr-1" /> Comprovante
                        </Button>
                      )}
                      <Button size="sm" className="h-8 text-xs" onClick={() => handlePaymentAction(p.id, "approved")}>
                        <CheckCircle className="h-3 w-3 mr-1" /> Aprovar
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handlePaymentAction(p.id, "rejected")}>
                        <XCircle className="h-3 w-3 mr-1" /> Recusar
                      </Button>
                    </div>
                  </div>
                );
              })}
              {pendingPayments.length === 0 && <p className="p-4 text-muted-foreground text-sm text-center">Nenhum pagamento pendente</p>}
            </div>
          </div>
        )}


        {activeTab === "withdrawals" && (
          <div className="animate-fade-in">
            <h2 className="font-heading text-xl font-bold mb-4">Saques Pendentes</h2>
            <div className="glass-card rounded-xl divide-y divide-border/50">
              {withdrawals.map((w: any) => (
                <div key={w.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{w.holder_name || "Sem nome"}</p>
                    <p className="text-sm text-muted-foreground">CPF: {w.cpf || "N/A"} • Pix: {w.pix_key || "N/A"}</p>
                    <p className="text-sm text-muted-foreground">Tel: {w.phone || "N/A"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(w.requested_at).toLocaleDateString("pt-BR")} às {new Date(w.requested_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      {" — "}
                      <span className="text-primary font-bold">{formatBRL(Number(w.amount))}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleWithdrawal(w.id, "approved")}>
                      <CheckCircle className="h-3 w-3 mr-1" /> Pagar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleWithdrawal(w.id, "rejected")}>
                      <XCircle className="h-3 w-3 mr-1" /> Recusar
                    </Button>
                  </div>
                </div>
              ))}
              {withdrawals.length === 0 && <p className="p-4 text-muted-foreground text-sm text-center">Nenhum saque pendente</p>}
            </div>
          </div>
        )}
        {activeTab === "settings" && (
          <div className="animate-fade-in max-w-md">
            <h2 className="font-heading text-xl font-bold mb-4">Configurações</h2>
            <div className="glass-card rounded-xl p-6 space-y-4">
              <div>
                <Label className="text-sm font-medium">Valor Mínimo de Saque (R$)</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={minWithdrawal}
                    onChange={(e) => setMinWithdrawal(e.target.value)}
                    placeholder="150"
                  />
                  <Button onClick={saveMinWithdrawal} disabled={savingSettings}>
                    {savingSettings ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Valor mínimo que o afiliado precisa ter para solicitar saque.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
