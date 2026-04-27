import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";
import { ExternalLink, Trash2, RefreshCw, Mail, Phone, Megaphone } from "lucide-react";

interface Lead {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  ad_link: string;
  ad_description: string | null;
  clicks_amount: number;
  total_value: number;
  status: string;
  created_at: string;
}

const STATUS_OPTIONS = ["pendente", "em_contato", "aprovado", "concluido", "rejeitado"];

const statusColor = (s: string) => {
  switch (s) {
    case "pendente": return "bg-yellow-500/15 text-yellow-500 border-yellow-500/30";
    case "em_contato": return "bg-blue-500/15 text-blue-500 border-blue-500/30";
    case "aprovado": return "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
    case "concluido": return "bg-primary/15 text-primary border-primary/30";
    case "rejeitado": return "bg-red-500/15 text-red-500 border-red-500/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const AdvertiserLeadsPanel = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("advertiser_leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar pedidos");
    } else {
      setLeads((data ?? []) as Lead[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("advertiser_leads").update({ status }).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    toast.success("Status atualizado");
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este pedido?")) return;
    const { error } = await supabase.from("advertiser_leads").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Pedido excluído");
    setLeads((prev) => prev.filter((l) => l.id !== id));
  };

  const filtered = filter === "all" ? leads : leads.filter((l) => l.status === filter);

  const totals = {
    count: leads.length,
    pendente: leads.filter((l) => l.status === "pendente").length,
    valor: leads.reduce((s, l) => s + Number(l.total_value || 0), 0),
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" /> Pedidos de Anunciantes
          </h2>
          <p className="text-sm text-muted-foreground">
            Solicitações enviadas pela página <span className="font-mono">/anunciar</span>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Total de pedidos</p>
          <p className="font-heading text-2xl font-bold">{totals.count}</p>
        </div>
        <div className="glass-card rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Pendentes</p>
          <p className="font-heading text-2xl font-bold text-yellow-500">{totals.pendente}</p>
        </div>
        <div className="glass-card rounded-lg p-4">
          <p className="text-xs text-muted-foreground">Valor total solicitado</p>
          <p className="font-heading text-2xl font-bold text-primary">{formatBRL(totals.valor)}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center text-muted-foreground">
          Nenhum pedido {filter !== "all" ? `com status "${filter}"` : ""} encontrado.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((l) => (
            <div key={l.id} className="glass-card rounded-xl p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-heading font-semibold text-lg">{l.full_name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor(l.status)}`}>
                      {l.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(l.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-heading text-2xl font-bold text-primary">{formatBRL(Number(l.total_value))}</p>
                  <p className="text-xs text-muted-foreground">{l.clicks_amount.toLocaleString("pt-BR")} cliques</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <a href={`mailto:${l.email}`} className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
                  <Mail className="h-4 w-4 text-muted-foreground" /> {l.email}
                </a>
                {l.phone && (
                  <a href={`https://wa.me/${l.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
                    <Phone className="h-4 w-4 text-muted-foreground" /> {l.phone}
                  </a>
                )}
              </div>

              <div className="text-sm">
                <p className="text-muted-foreground text-xs mb-1">Link a anunciar:</p>
                <a href={l.ad_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline break-all">
                  {l.ad_link} <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              </div>

              {l.ad_description && (
                <div className="text-sm bg-secondary/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Descrição:</p>
                  <p className="text-foreground">{l.ad_description}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                <Select value={l.status} onValueChange={(v) => updateStatus(l.id, v)}>
                  <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => remove(l.id)} className="text-red-500 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdvertiserLeadsPanel;
