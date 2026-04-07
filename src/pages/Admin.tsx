import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Users, Eye, DollarSign, AlertCircle, LogOut, Plus, BarChart3, Pencil, Trash2, Ban, ShieldCheck, Settings, Link2, Link2Off, CreditCard, CheckCircle, XCircle, Image } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "ads" | "withdrawals" | "plans" | "payments">("overview");
  const [showAdForm, setShowAdForm] = useState(false);
  const [editingAd, setEditingAd] = useState<any>(null);
  const [adTitle, setAdTitle] = useState("");
  const [adUrl, setAdUrl] = useState("");
  const [adTime, setAdTime] = useState(10);
  const [adOpenLink, setAdOpenLink] = useState(true);
  const [adSubmitting, setAdSubmitting] = useState(false);

  // Plan editing
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planName, setPlanName] = useState("");
  const [planPrice, setPlanPrice] = useState(0);
  const [planClickValue, setPlanClickValue] = useState(0.001);
  const [planDailyLimit, setPlanDailyLimit] = useState(10);
  const [showPlanForm, setShowPlanForm] = useState(false);

  // Plan deletion
  const [deletingPlan, setDeletingPlan] = useState<any>(null);
  const [deletePlanUsers, setDeletePlanUsers] = useState<number>(0);
  const [transferPlanId, setTransferPlanId] = useState<string>("");
  const [deletePlanStep, setDeletePlanStep] = useState<"confirm" | "transfer" | null>(null);

  // Balance editing
  const [editingBalance, setEditingBalance] = useState<string | null>(null);
  const [balanceAmount, setBalanceAmount] = useState("");

  // Plan change for user
  const [changingPlanUser, setChangingPlanUser] = useState<string | null>(null);
  const [selectedNewPlan, setSelectedNewPlan] = useState<string>("");

  // Data
  const [users, setUsers] = useState<any[]>([]);
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
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("clicks").select("id", { count: "exact", head: true }),
        supabase.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("ads").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("withdrawals").select("amount").eq("status", "approved"),
        supabase.from("profiles").select("*").limit(100),
        supabase.from("ads").select("*").order("created_at", { ascending: false }),
        supabase.from("plans").select("*").order("price", { ascending: true }),
        supabase.from("withdrawals").select("*").eq("status", "pending").order("requested_at", { ascending: false }),
      ]);

      const firstError = userCountError || clickCountError || pendingCountError || activeAdsCountError || approvedWError || profilesError || adsError || plansError || withdrawalsError;

      if (firstError) {
        console.error("Erro ao carregar dados do admin:", firstError);
        toast.error(`Erro ao carregar painel: ${firstError.message}`);
        return;
      }

      const totalPaid = approvedW?.reduce((s, w) => s + Number(w.amount), 0) || 0;

      setStats({ users: userCount || 0, clicks: clickCount || 0, pendingWithdrawals: pendingCount || 0, activeAds: activeAdsCount || 0, totalPaid });
      setUsers(profilesData || []);
      setAds(adsData || []);
      setPlans(plansData || []);
      setWithdrawals(withdrawalsData || []);

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
    } catch (error: any) {
      console.error("Exceção ao carregar admin:", error);
      toast.error(`Erro inesperado no painel: ${error.message}`);
    }
  };

  // --- Ad CRUD ---
  const resetAdForm = () => { setAdTitle(""); setAdUrl(""); setAdTime(10); setAdOpenLink(true); setEditingAd(null); setShowAdForm(false); };

  const saveAd = async () => {
    if (!adTitle || !adUrl) { toast.error("Preencha todos os campos"); return; }
    if (adSubmitting) return;

    setAdSubmitting(true);

    try {
      if (editingAd) {
        const { error } = await supabase.from("ads").update({ title: adTitle, url: adUrl, view_time: adTime, open_link: adOpenLink }).eq("id", editingAd.id);
        if (error) { console.error("Erro ao editar anúncio:", error); toast.error("Erro ao editar: " + error.message); setAdSubmitting(false); return; }
        toast.success("Anúncio atualizado!");
      } else {
        const { data, error } = await supabase.from("ads").insert([{ title: adTitle, url: adUrl, view_time: adTime, open_link: adOpenLink }]).select();
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
    setShowAdForm(true);
  };

  // --- Plan CRUD ---
  const resetPlanForm = () => { setPlanName(""); setPlanPrice(0); setPlanClickValue(0.001); setPlanDailyLimit(10); setEditingPlan(null); setShowPlanForm(false); };

  const savePlan = async () => {
    if (!planName) { toast.error("Nome obrigatório"); return; }
    if (editingPlan) {
      const { error } = await supabase.from("plans").update({ name: planName, price: planPrice, click_value: planClickValue, daily_click_limit: planDailyLimit }).eq("id", editingPlan.id);
      if (error) { toast.error("Erro ao editar plano"); return; }
      toast.success("Plano atualizado!");
    } else {
      const { error } = await supabase.from("plans").insert({ name: planName, price: planPrice, click_value: planClickValue, daily_click_limit: planDailyLimit });
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

  const addBalance = async (userId: string) => {
    const amount = parseFloat(balanceAmount);
    if (!amount || amount <= 0) { toast.error("Valor inválido"); return; }
    // Insert a "manual credit" click
    const { data: anyAd } = await supabase.from("ads").select("id").limit(1).maybeSingle();
    if (!anyAd) { toast.error("Crie um anúncio primeiro"); return; }
    const { error } = await supabase.from("clicks").insert({
      user_id: userId,
      ad_id: anyAd.id,
      earned_value: amount,
    });
    if (error) { toast.error("Erro ao creditar"); return; }
    toast.success(`${formatBRL(amount)} creditado!`);
    setEditingBalance(null);
    setBalanceAmount("");
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

  const tabs = [
    { key: "overview" as const, label: "Visão Geral", icon: BarChart3 },
    { key: "users" as const, label: "Usuários", icon: Users },
    { key: "ads" as const, label: "Anúncios", icon: Eye },
    { key: "plans" as const, label: "Planos", icon: Settings },
    { key: "withdrawals" as const, label: "Saques", icon: DollarSign },
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
                    <th className="text-left p-4 text-muted-foreground font-medium">Nome</th>
                    <th className="text-left p-4 text-muted-foreground font-medium hidden sm:table-cell">Email</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Plano</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: any) => (
                    <tr key={u.id} className="border-b border-border/30 hover:bg-secondary/30">
                      <td className="p-4 font-medium">{u.name || "Sem nome"}</td>
                      <td className="p-4 text-muted-foreground hidden sm:table-cell">{u.email}</td>
                      <td className="p-4"><span className="text-primary font-semibold">{u.user_plans?.[0]?.plans?.name || "Free"}</span></td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {editingBalance === u.user_id ? (
                            <div className="flex items-center gap-1">
                              <Input type="number" placeholder="$" value={balanceAmount} onChange={(e) => setBalanceAmount(e.target.value)} className="w-20 h-8 bg-secondary border-border text-xs" />
                              <Button size="sm" className="h-8 text-xs" onClick={() => addBalance(u.user_id)}>OK</Button>
                              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditingBalance(null)}>✕</Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setEditingBalance(u.user_id)}>
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

        {/* Withdrawals */}
        {activeTab === "withdrawals" && (
          <div className="animate-fade-in">
            <h2 className="font-heading text-xl font-bold mb-4">Saques Pendentes</h2>
            <div className="glass-card rounded-xl divide-y divide-border/50">
              {withdrawals.map((w: any) => (
                <div key={w.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{w.profiles?.name || w.profiles?.email || "Usuário"}</p>
                    <p className="text-muted-foreground text-xs">{new Date(w.requested_at).toLocaleDateString("pt-BR")} — {formatBRL(Number(w.amount))}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleWithdrawal(w.id, "approved")}>Aprovar</Button>
                    <Button size="sm" variant="outline" onClick={() => handleWithdrawal(w.id, "rejected")}>Recusar</Button>
                  </div>
                </div>
              ))}
              {withdrawals.length === 0 && <p className="p-4 text-muted-foreground text-sm text-center">Nenhum saque pendente</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
