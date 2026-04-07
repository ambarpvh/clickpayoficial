import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, ArrowLeft, Upload, CheckCircle, Clock, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";

interface Plan {
  id: string;
  name: string;
  price: number;
  click_value: number;
  daily_click_limit: number;
}

const Payment = () => {
  const navigate = useNavigate();
  const { planId } = useParams<{ planId: string }>();
  const { user, loading: authLoading } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingPayment, setExistingPayment] = useState<any>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);

  useEffect(() => {
    if (!authLoading && !user) { navigate("/login"); return; }
    if (user && planId) loadPlanAndPayment();
  }, [user, authLoading, planId]);

  const loadPlanAndPayment = async () => {
    if (!user || !planId) return;
    const { data: planData } = await supabase.from("plans").select("*").eq("id", planId).single();
    setPlan(planData);

    // Check if there's already a pending payment for this plan
    const { data: payment } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", user.id)
      .eq("plan_id", planId)
      .eq("status", "pending")
      .maybeSingle();
    if (payment) setExistingPayment(payment);
  };

  const handleSubmitPayment = async () => {
    if (!user || !plan || !proofFile) {
      toast.error("Envie o comprovante de pagamento");
      return;
    }

    setUploading(true);
    try {
      // Upload proof file
      const fileExt = proofFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, proofFile);

      if (uploadError) {
        toast.error("Erro ao enviar comprovante: " + uploadError.message);
        setUploading(false);
        return;
      }

      // Store the file path (not public URL) since bucket is private
      const proofPath = fileName;

      // Create payment record
      const { error: paymentError } = await supabase.from("payments").insert({
        user_id: user.id,
        plan_id: plan.id,
        amount: plan.price,
        proof_url: urlData.publicUrl,
      });

      if (paymentError) {
        toast.error("Erro ao registrar pagamento: " + paymentError.message);
        setUploading(false);
        return;
      }

      setSubmitted(true);
      toast.success("Comprovante enviado! Aguarde aprovação.");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
    setUploading(false);
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
          <Button variant="ghost" size="sm" onClick={() => navigate("/plans")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12 max-w-lg">
        {plan && (
          <>
            {/* Plan summary */}
            <div className="glass-card rounded-xl p-6 mb-6 text-center">
              <h1 className="font-heading text-2xl font-bold mb-2">Pagamento — Plano {plan.name}</h1>
              <p className="gradient-text-gold text-3xl font-bold mb-2">{formatBRL(plan.price)}</p>
              <p className="text-muted-foreground text-sm">Pagamento único • Ganho: {formatBRL(plan.click_value)} por clique • Limite: {plan.daily_click_limit}/dia</p>
            </div>

            {submitted || existingPayment ? (
              <div className="glass-card rounded-xl p-6 text-center space-y-4">
                <Clock className="h-12 w-12 text-accent mx-auto" />
                <h2 className="font-heading text-xl font-bold">Aguardando Aprovação</h2>
                <p className="text-muted-foreground text-sm">
                  Seu comprovante foi enviado com sucesso. O administrador irá analisar e aprovar seu pagamento em breve.
                  Após a confirmação, seu plano será atualizado automaticamente.
                </p>
                <Button variant="outline" onClick={() => navigate("/dashboard")}>
                  Voltar ao Dashboard
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Payment instructions */}
                <div className="glass-card rounded-xl p-6 space-y-4">
                  <h2 className="font-heading text-lg font-bold flex items-center gap-2">
                    <ExternalLink className="h-5 w-5 text-primary" />
                    Passo 1: Fazer Pagamento
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Acesse o link abaixo para realizar o pagamento via PIX no valor de <strong className="text-foreground">{formatBRL(plan.price)}</strong>:
                  </p>
                  <Button
                    variant="hero"
                    className="w-full"
                    onClick={() => window.open("https://pixoculto.com.br", "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Pagar via pixoculto.com.br
                  </Button>
                </div>

                {/* Upload proof */}
                <div className="glass-card rounded-xl p-6 space-y-4">
                  <h2 className="font-heading text-lg font-bold flex items-center gap-2">
                    <Upload className="h-5 w-5 text-primary" />
                    Passo 2: Enviar Comprovante
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Após o pagamento, envie o comprovante (print ou PDF) para confirmar a transação.
                  </p>
                  <div className="space-y-2">
                    <Label>Comprovante de pagamento</Label>
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                      className="bg-secondary border-border"
                    />
                    {proofFile && (
                      <p className="text-xs text-primary flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> {proofFile.name}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="hero"
                    className="w-full"
                    disabled={!proofFile || uploading}
                    onClick={handleSubmitPayment}
                  >
                    {uploading ? "Enviando..." : "Enviar Comprovante"}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Payment;
