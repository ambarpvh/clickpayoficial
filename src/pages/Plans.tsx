import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, Crown, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Plan {
  id: string;
  name: string;
  price: number;
  click_value: number;
  daily_click_limit: number;
}

const Plans = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) { navigate("/login"); return; }
    if (user) loadPlans();
  }, [user, authLoading]);

  const loadPlans = async () => {
    if (!user) return;
    const { data: plansData } = await supabase.from("plans").select("*").eq("is_active", true).order("price", { ascending: true });
    setPlans(plansData || []);

    const { data: userPlan } = await supabase
      .from("user_plans")
      .select("plan_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    setCurrentPlanId(userPlan?.plan_id || null);
  };

  const handleUpgrade = async (planId: string) => {
    if (!user) return;
    setUpgrading(planId);

    // Deactivate current plan
    await supabase.from("user_plans").update({ is_active: false }).eq("user_id", user.id).eq("is_active", true);

    // Activate new plan
    const { error } = await supabase.from("user_plans").insert({
      user_id: user.id,
      plan_id: planId,
    });

    setUpgrading(null);
    if (error) {
      toast.error("Erro ao trocar de plano");
    } else {
      toast.success("Plano atualizado com sucesso!");
      setCurrentPlanId(planId);
    }
  };

  const planColors: Record<string, string> = {
    "Free": "border-muted-foreground/30",
    "Bronze": "border-accent/50",
    "Prata": "border-primary",
    "Ouro": "border-accent",
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

      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <Crown className="h-12 w-12 text-accent mx-auto mb-4" />
          <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2">Upgrade de Plano</h1>
          <p className="text-muted-foreground">Escolha o plano ideal e ganhe mais por clique</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlanId;
            const color = planColors[plan.name] || "border-border";
            return (
              <div key={plan.id} className={`glass-card rounded-xl p-6 border-2 ${color} relative ${isCurrent ? "glow-primary" : ""} hover:scale-105 transition-transform duration-300`}>
                {isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                    Atual
                  </span>
                )}
                <h3 className="font-heading text-2xl font-bold mb-1">{plan.name}</h3>
                <p className="gradient-text-gold text-3xl font-bold my-4">
                  {plan.price === 0 ? "Grátis" : `$${plan.price}/mês`}
                </p>
                <div className="space-y-3 text-sm text-muted-foreground mb-6">
                  <p className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Ganho: <span className="text-primary font-semibold">${plan.click_value}</span></p>
                  <p className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Limite: <span className="text-foreground font-semibold">{plan.daily_click_limit}/dia</span></p>
                </div>
                <Button
                  variant={isCurrent ? "outline" : "hero"}
                  className="w-full"
                  disabled={isCurrent || upgrading === plan.id}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {isCurrent ? "Plano Atual" : upgrading === plan.id ? "Processando..." : "Selecionar"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Plans;
