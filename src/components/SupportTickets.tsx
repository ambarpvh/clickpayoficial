import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LifeBuoy, Send, MessageSquare, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  admin_response: string | null;
  status: string;
  created_at: string;
  responded_at: string | null;
}

export const SupportTickets = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .select("id, subject, message, admin_response, status, created_at, responded_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar tickets");
    } else {
      setTickets(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  const handleSubmit = async () => {
    if (!user) return;
    const s = subject.trim();
    const m = message.trim();
    if (!s || s.length < 3) {
      toast.error("Informe um assunto válido (mín. 3 caracteres)");
      return;
    }
    if (!m || m.length < 10) {
      toast.error("A mensagem deve ter no mínimo 10 caracteres");
      return;
    }
    if (s.length > 150) {
      toast.error("Assunto muito longo (máx. 150 caracteres)");
      return;
    }
    if (m.length > 2000) {
      toast.error("Mensagem muito longa (máx. 2000 caracteres)");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id,
      subject: s,
      message: m,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Erro ao enviar ticket");
    } else {
      toast.success("Ticket enviado com sucesso! Aguarde resposta do suporte.");
      setSubject("");
      setMessage("");
      load();
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-xl p-6 space-y-4">
        <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
          <LifeBuoy className="h-5 w-5 text-primary" /> Abrir um Chamado
        </h2>
        <p className="text-xs text-muted-foreground">
          Envie suas dúvidas, reclamações ou solicitações para o suporte. Responderemos o mais
          breve possível.
        </p>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Assunto</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex: Dúvida sobre saque"
              maxLength={150}
            />
          </div>
          <div className="space-y-1">
            <Label>Mensagem</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descreva sua solicitação com detalhes..."
              rows={5}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/2000
            </p>
          </div>
        </div>
        <Button variant="hero" className="w-full" onClick={handleSubmit} disabled={submitting}>
          <Send className="h-4 w-4 mr-1" />
          {submitting ? "Enviando..." : "Enviar Chamado"}
        </Button>
      </div>

      <div className="glass-card rounded-xl p-6 space-y-4">
        <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" /> Meus Chamados
        </h2>
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Você ainda não abriu nenhum chamado.
          </p>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <div key={t.id} className="border border-border/50 rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{t.subject}</h3>
                    <p className="text-xs text-muted-foreground">{formatDate(t.created_at)}</p>
                  </div>
                  {t.status === "answered" || t.admin_response ? (
                    <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium whitespace-nowrap">
                      <CheckCircle2 className="h-3 w-3" /> Respondido
                    </span>
                  ) : t.status === "closed" ? (
                    <span className="flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full font-medium whitespace-nowrap">
                      Fechado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs bg-accent/10 text-accent px-2 py-1 rounded-full font-medium whitespace-nowrap">
                      <Clock className="h-3 w-3" /> Aguardando
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{t.message}</p>
                {t.admin_response && (
                  <div className="mt-2 pt-3 border-t border-border/50 bg-primary/5 -mx-4 -mb-4 px-4 pb-3 rounded-b-lg">
                    <p className="text-xs font-semibold text-primary mb-1">
                      Resposta do Suporte
                      {t.responded_at && (
                        <span className="text-muted-foreground font-normal ml-2">
                          • {formatDate(t.responded_at)}
                        </span>
                      )}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{t.admin_response}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
