import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Users, Eye, DollarSign, AlertCircle, LogOut, Plus, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Admin = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "ads" | "withdrawals">("overview");
  const [showAdForm, setShowAdForm] = useState(false);
  const [adTitle, setAdTitle] = useState("");
  const [adUrl, setAdUrl] = useState("");
  const [adTime, setAdTime] = useState(10);

  // Data
  const [users, setUsers] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [stats, setStats] = useState({ users: 0, clicks: 0, pendingWithdrawals: 0 });

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/dashboard");
      return;
    }
    if (user && isAdmin) loadData();
  }, [user, isAdmin, authLoading]);

  const loadData = async () => {
    // Stats
    const { count: userCount } = await supabase.from("profiles").select("id", { count: "exact", head: true });
    const { count: clickCount } = await supabase.from("clicks").select("id", { count: "exact", head: true });
    const { count: pendingCount } = await supabase.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "pending");
    setStats({ users: userCount || 0, clicks: clickCount || 0, pendingWithdrawals: pendingCount || 0 });

    // Users
    const { data: profilesData } = await supabase.from("profiles").select("*, user_plans(plan_id, plans(name))").limit(50);
    setUsers(profilesData || []);

    // Ads
    const { data: adsData } = await supabase.from("ads").select("*").order("created_at", { ascending: false });
    setAds(adsData || []);

    // Withdrawals
    const { data: withdrawalsData } = await supabase.from("withdrawals").select("*, profiles(name, email)").eq("status", "pending").order("requested_at", { ascending: false });
    setWithdrawals(withdrawalsData || []);
  };

  const createAd = async () => {
    if (!adTitle || !adUrl) { toast.error("Preencha todos os campos"); return; }
    const { error } = await supabase.from("ads").insert({ title: adTitle, url: adUrl, view_time: adTime });
    if (error) { toast.error("Erro ao criar anúncio"); return; }
    toast.success("Anúncio criado!");
    setShowAdForm(false);
    setAdTitle(""); setAdUrl(""); setAdTime(10);
    loadData();
  };

  const handleWithdrawal = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase.from("withdrawals").update({ status, processed_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error("Erro"); return; }
    toast.success(status === "approved" ? "Saque aprovado!" : "Saque recusado");
    loadData();
  };

  const tabs = [
    { key: "overview" as const, label: "Visão Geral", icon: BarChart3 },
    { key: "users" as const, label: "Usuários", icon: Users },
    { key: "ads" as const, label: "Anúncios", icon: Eye },
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
          <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate("/"); }}>
            <LogOut className="h-4 w-4" />
          </Button>
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

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
            {[
              { label: "Total Usuários", value: String(stats.users), icon: Users },
              { label: "Total Cliques", value: String(stats.clicks), icon: Eye },
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
          </div>
        )}

        {activeTab === "users" && (
          <div className="animate-fade-in glass-card rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-4 text-muted-foreground font-medium">Nome</th>
                  <th className="text-left p-4 text-muted-foreground font-medium hidden sm:table-cell">Email</th>
                  <th className="text-left p-4 text-muted-foreground font-medium">Plano</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.id} className="border-b border-border/30 hover:bg-secondary/30">
                    <td className="p-4 font-medium">{u.name || "Sem nome"}</td>
                    <td className="p-4 text-muted-foreground hidden sm:table-cell">{u.email}</td>
                    <td className="p-4"><span className="text-primary font-semibold">{u.user_plans?.[0]?.plans?.name || "Free"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "ads" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <h2 className="font-heading text-xl font-bold">Gerenciar Anúncios</h2>
              <Button size="sm" onClick={() => setShowAdForm(!showAdForm)}>
                <Plus className="h-4 w-4 mr-1" /> Novo Anúncio
              </Button>
            </div>
            {showAdForm && (
              <div className="glass-card rounded-xl p-6 space-y-4 animate-slide-up">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input placeholder="Nome do anúncio" value={adTitle} onChange={(e) => setAdTitle(e.target.value)} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <Input placeholder="https://..." value={adUrl} onChange={(e) => setAdUrl(e.target.value)} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tempo (segundos)</Label>
                    <Input type="number" value={adTime} onChange={(e) => setAdTime(Number(e.target.value))} className="bg-secondary border-border" />
                  </div>
                </div>
                <Button onClick={createAd}>Salvar Anúncio</Button>
              </div>
            )}
            <div className="glass-card rounded-xl divide-y divide-border/50">
              {ads.map((ad: any) => (
                <div key={ad.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{ad.title}</p>
                    <p className="text-muted-foreground text-xs">{ad.url}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${ad.is_active ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
                    {ad.is_active ? "Ativo" : "Pausado"}
                  </span>
                </div>
              ))}
              {ads.length === 0 && <p className="p-4 text-muted-foreground text-sm text-center">Nenhum anúncio</p>}
            </div>
          </div>
        )}

        {activeTab === "withdrawals" && (
          <div className="animate-fade-in">
            <h2 className="font-heading text-xl font-bold mb-4">Saques Pendentes</h2>
            <div className="glass-card rounded-xl divide-y divide-border/50">
              {withdrawals.map((w: any) => (
                <div key={w.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{w.profiles?.name || w.profiles?.email}</p>
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
