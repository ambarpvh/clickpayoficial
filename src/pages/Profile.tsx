import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, ArrowLeft, Save, KeyRound, User as UserIcon, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SupportTickets } from "@/components/SupportTickets";

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "support">("profile");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { navigate("/login"); return; }
    if (user) loadProfile();
  }, [user, authLoading]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("name, email, cpf, pix_key, phone")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setName(data.name || "");
      setEmail(data.email || user.email || "");
      setCpf(data.cpf || "");
      setPixKey(data.pix_key || "");
      setPhone(data.phone || "");
      return;
    }

    setName(user.user_metadata?.full_name || user.user_metadata?.name || "");
    setEmail(user.email || "");
    setCpf("");
    setPixKey("");
    setPhone("");
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ name, cpf, pix_key: pixKey, phone })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar dados");
    } else {
      toast.success("Dados salvos com sucesso!");
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Senha alterada com sucesso! Um email de confirmação foi enviado.");
      setNewPassword("");
      setConfirmPassword("");
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

      <div className="container mx-auto px-4 py-8 max-w-lg space-y-6">
        <h1 className="font-heading text-2xl font-bold">Meu Cadastro</h1>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === "profile" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
          >
            <UserIcon className="h-4 w-4" /> Perfil
          </button>
          <button
            onClick={() => setActiveTab("support")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === "support" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}
          >
            <LifeBuoy className="h-4 w-4" /> Suporte
          </button>
        </div>

        {activeTab === "profile" && (
          <div className="space-y-8 animate-fade-in">
            <div className="glass-card rounded-xl p-6 space-y-4">
              <h2 className="font-heading text-lg font-semibold">Dados Pessoais</h2>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Nome completo</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input value={email} disabled className="opacity-60" />
                  <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
                </div>
                <div className="space-y-1">
                  <Label>CPF</Label>
                  <Input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" />
                </div>
                <div className="space-y-1">
                  <Label>Chave PIX</Label>
                  <Input value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="CPF, e-mail, celular ou chave aleatória" />
                </div>
                <div className="space-y-1">
                  <Label>Telefone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
                </div>
              </div>
              <Button variant="hero" className="w-full" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-1" />
                {saving ? "Salvando..." : "Salvar Dados"}
              </Button>
            </div>

            <div className="glass-card rounded-xl p-6 space-y-4">
              <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" /> Alterar Senha
              </h2>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Nova senha</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                </div>
                <div className="space-y-1">
                  <Label>Confirmar nova senha</Label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a nova senha" />
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={handleChangePassword} disabled={changingPassword}>
                {changingPassword ? "Alterando..." : "Alterar Senha"}
              </Button>
            </div>
          </div>
        )}

        {activeTab === "support" && (
          <div className="animate-fade-in">
            <SupportTickets />
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
