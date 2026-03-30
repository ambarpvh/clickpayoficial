import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Users, Eye, DollarSign, AlertCircle, LogOut, Plus, BarChart3, Pencil, Trash2, Ban, ShieldCheck, Settings } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Admin = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "ads" | "withdrawals" | "plans">("overview");
  const [showAdForm, setShowAdForm] = useState(false);
  const [editingAd, setEditingAd] = useState<any>(null);
  const [adTitle, setAdTitle] = useState("");
  const [adUrl, setAdUrl] = useState("");
  const [adTime, setAdTime] = useState(10);

  // Plan editing
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planName, setPlanName] = useState("");
  const [planPrice, setPlanPrice] = useState(0);
  const [planClickValue, setPlanClickValue] = useState(0.001);
  const [planDailyLimit, setPlanDailyLimit] = useState(10);
  const [showPlanForm, setShowPlanForm] = useState(false);

  // Balance editing
  const [editingBalance, setEditingBalance] = useState<string | null>(null);
  const [balanceAmount, setBalanceAmount] = useState("");

  // Data
  const [users, setUsers] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: 0, clicks: 0, pendingWithdrawals: 0, activeAds: 0, totalPaid: 0 });

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) { navigate("/dashboard"); return; }
    if (user && isAdmin) loadData();
  }, [user, isAdmin, authLoading]);

  const loadData = async () => {
    const { count: userCount } = await supabase.from("profiles").select("id", { count: "exact", head: true });
    const { count: clickCount } = await supabase.from("clicks").select("id", { count: "exact", head: true });
    const { count: pendingCount } = await supabase.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "pending");
    const { count: activeAdsCount } = await supabase.from("ads").select("id", { count: "exact", head: true }).eq("is_active", true);

    const { data: approvedW } = await supabase.from("withdrawals").select("amount").eq("status", "approved");
    const totalPaid = approvedW?.reduce((s, w) => s + Number(w.amount), 0) || 0;

    setStats({ users: userCount || 0, clicks: clickCount || 0, pendingWithdrawals: pendingCount || 0, activeAds: activeAdsCount || 0, totalPaid });

    const { data: profilesData } = await supabase.from("profiles").select("*, user_plans(plan_id, plans(name)), user_roles(role)").limit(100);
    setUsers(profilesData || []);

    const { data: adsData } = await supabase.from("ads").select("*").order("created_at", { ascending: false });
    setAds(adsData || []);

    const { data: plansData } = await supabase.from("plans").select("*").order("price", { ascending: true });
    setPlans(plansData || []);

    const { data: withdrawalsData } = await supabase.from("withdrawals").select("*").eq("status", "pending").order("requested_at", { ascending: false });
    setWithdrawals(withdrawalsData || []);
  };

  // --- Ad CRUD ---
  const resetAdForm = () => { setAdTitle(""); setAdUrl(""); setAdTime(10); setEditingAd(null); setShowAdForm(false); };

  const saveAd = async () => {
    if (!adTitle || !adUrl) { toast.error("Preencha todos os campos"); return; }
    try {
      if (editingAd) {
        const { error } = await supabase.from("ads").update({ title: adTitle, url: adUrl, view_time: adTime }).eq("id", editingAd.id);
        if (error) { console.error("Erro ao editar anúncio:", error); toast.error("Erro ao editar: " + error.message); return; }
        toast.success("Anúncio atualizado!");
      } else {
        const { error } = await supabase.from("ads").insert([{ title: adTitle, url: adUrl, view_time: adTime }]);
        if (error) { console.error("Erro ao criar anúncio:", error); toast.error("Erro ao criar: " + error.message); return; }
        toast.success("Anúncio criado!");
      }
      resetAdForm();
      loadData();
    } catch (e: any) {
      console.error("Exceção ao salvar anúncio:", e);
      toast.error("Erro inesperado: " + e.message);
    }
  };

  const toggleAd = async (id: string, active: boolean) => {
    await supabase.from("ads").update({ is_active: !active }).eq("id", id);
    toast.success(active ? "Anúncio pausado" : "Anúncio ativado");
    loadData();
  };

  const deleteAd = async (id: string) => {
    await supabase.from("ads").delete().eq("id", id);
    toast.success("Anúncio excluído");
    loadData();
  };

  const startEditAd = (ad: any) => {
    setEditingAd(ad);
    setAdTitle(ad.title);
    setAdUrl(ad.url);
    setAdTime(ad.view_time);
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
    toast.success(`$${amount.toFixed(2)} creditado!`);
    setEditingBalance(null);
    setBalanceAmount("");
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
              <p className="font-heading text-2xl font-bold gradient-text-gold">${stats.totalPaid.toFixed(2)}</p>
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
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveAd}>{editingAd ? "Salvar Alterações" : "Criar Anúncio"}</Button>
                  <Button variant="ghost" onClick={resetAdForm}>Cancelar</Button>
                </div>
              </div>
            )}
            <div className="glass-card rounded-xl divide-y divide-border/50">
              {ads.map((ad: any) => (
                <div key={ad.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{ad.title}</p>
                    <p className="text-muted-foreground text-xs truncate">{ad.url}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${ad.is_active ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                      {ad.is_active ? "Ativo" : "Pausado"}
                    </span>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => startEditAd(ad)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => toggleAd(ad.id, ad.is_active)}>
                      {ad.is_active ? <Ban className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => deleteAd(ad.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
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
                    <Label>Preço ($)</Label>
                    <Input type="number" step="0.01" value={planPrice} onChange={(e) => setPlanPrice(Number(e.target.value))} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor/Clique ($)</Label>
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
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => startEditPlan(plan)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="gradient-text-gold text-2xl font-bold mb-3">{plan.price === 0 ? "Grátis" : `$${plan.price}`}</p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Clique: <span className="text-primary font-semibold">${Number(plan.click_value).toFixed(3)}</span></p>
                    <p>Limite: <span className="text-foreground font-semibold">{plan.daily_click_limit}/dia</span></p>
                  </div>
                </div>
              ))}
            </div>
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
                    <p className="text-muted-foreground text-xs">{new Date(w.requested_at).toLocaleDateString("pt-BR")} — ${Number(w.amount).toFixed(2)}</p>
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
