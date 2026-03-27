import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, Users, Eye, DollarSign, AlertCircle, LogOut, Plus, BarChart3 } from "lucide-react";
import { toast } from "sonner";

const mockUsers = [
  { id: 1, name: "João Silva", email: "joao@email.com", plan: "Prata", balance: "$1.23", status: "Ativo" },
  { id: 2, name: "Maria Santos", email: "maria@email.com", plan: "Ouro", balance: "$5.67", status: "Ativo" },
  { id: 3, name: "Carlos Lima", email: "carlos@email.com", plan: "Free", balance: "$0.12", status: "Bloqueado" },
];

const mockWithdrawals = [
  { id: 1, user: "Maria Santos", amount: "$5.00", date: "27/03/2026", status: "Pendente" },
  { id: 2, user: "Pedro Alves", amount: "$10.00", date: "26/03/2026", status: "Pendente" },
];

const Admin = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "ads" | "withdrawals">("overview");
  const [showAdForm, setShowAdForm] = useState(false);

  const tabs = [
    { key: "overview" as const, label: "Visão Geral", icon: BarChart3 },
    { key: "users" as const, label: "Usuários", icon: Users },
    { key: "ads" as const, label: "Anúncios", icon: Eye },
    { key: "withdrawals" as const, label: "Saques", icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/50 glass-card">
        <div className="container mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-heading text-lg font-bold">ClickPay</span>
            <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full font-semibold">Admin</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Usuários", value: "12,450", icon: Users },
                { label: "Cliques Hoje", value: "8,230", icon: Eye },
                { label: "Receita Total", value: "$45,200", icon: DollarSign },
                { label: "Saques Pendentes", value: "15", icon: AlertCircle },
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
          </div>
        )}

        {/* Users */}
        {activeTab === "users" && (
          <div className="animate-fade-in">
            <div className="glass-card rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-4 text-muted-foreground font-medium">Nome</th>
                    <th className="text-left p-4 text-muted-foreground font-medium hidden sm:table-cell">Email</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Plano</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Saldo</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mockUsers.map((u) => (
                    <tr key={u.id} className="border-b border-border/30 hover:bg-secondary/30">
                      <td className="p-4 font-medium">{u.name}</td>
                      <td className="p-4 text-muted-foreground hidden sm:table-cell">{u.email}</td>
                      <td className="p-4"><span className="text-primary font-semibold">{u.plan}</span></td>
                      <td className="p-4">{u.balance}</td>
                      <td className="p-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.status === "Ativo" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                          {u.status}
                        </span>
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
              <Button size="sm" onClick={() => setShowAdForm(!showAdForm)}>
                <Plus className="h-4 w-4 mr-1" /> Novo Anúncio
              </Button>
            </div>
            {showAdForm && (
              <div className="glass-card rounded-xl p-6 space-y-4 animate-slide-up">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input placeholder="Nome do anúncio" className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <Input placeholder="https://..." className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tempo obrigatório (segundos)</Label>
                    <Input type="number" defaultValue={10} className="bg-secondary border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Input placeholder="Ativo" className="bg-secondary border-border" />
                  </div>
                </div>
                <Button onClick={() => { setShowAdForm(false); toast.success("Anúncio criado!"); }}>
                  Salvar Anúncio
                </Button>
              </div>
            )}
            <div className="glass-card rounded-xl divide-y divide-border/50">
              {[
                { title: "Curso de Marketing Digital", status: "Ativo", clicks: 230 },
                { title: "Plataforma de Investimentos", status: "Ativo", clicks: 185 },
                { title: "App de Finanças", status: "Pausado", clicks: 92 },
              ].map((ad, i) => (
                <div key={i} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{ad.title}</p>
                    <p className="text-muted-foreground text-xs">{ad.clicks} cliques</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${ad.status === "Ativo" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
                    {ad.status}
                  </span>
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
              {mockWithdrawals.map((w) => (
                <div key={w.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{w.user}</p>
                    <p className="text-muted-foreground text-xs">{w.date} — {w.amount}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => toast.success(`Saque de ${w.user} aprovado!`)}>Aprovar</Button>
                    <Button size="sm" variant="outline" onClick={() => toast.error(`Saque de ${w.user} recusado`)}>Recusar</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
