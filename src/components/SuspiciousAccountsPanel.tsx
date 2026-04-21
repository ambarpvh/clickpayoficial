import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertTriangle, RefreshCw, Ban, ShieldCheck, Search, Users } from "lucide-react";
import { format } from "date-fns";

interface SuspiciousAccount {
  user_id: string;
  name: string;
  email: string;
  is_blocked: boolean;
  signup_ip: string | null;
  device_fingerprint: string | null;
  created_at: string;
  has_duplicate_name: boolean;
  referrals_last_24h: number;
  shares_ip: boolean;
  shares_device: boolean;
  risk_score: number;
}

const SuspiciousAccountsPanel = () => {
  const [rows, setRows] = useState<SuspiciousAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_suspicious_accounts" as any);
    if (error) {
      toast.error("Falha ao carregar: " + error.message);
      setRows([]);
    } else {
      setRows((data as SuspiciousAccount[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleBlock = async (row: SuspiciousAccount) => {
    setActingId(row.user_id);
    const newState = !row.is_blocked;
    const { error } = await supabase
      .from("profiles")
      .update({
        is_blocked: newState,
        block_message: newState ? "Conta bloqueada por suspeita de fraude pelo administrador." : null,
      })
      .eq("user_id", row.user_id);
    setActingId(null);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(newState ? "Usuário bloqueado." : "Usuário desbloqueado.");
      load();
    }
  };

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.signup_ip?.includes(q)
    );
  });

  const riskBadge = (score: number) => {
    if (score >= 3) return <Badge className="bg-destructive text-destructive-foreground">Crítico</Badge>;
    if (score === 2) return <Badge className="bg-orange-500 text-white">Alto</Badge>;
    return <Badge variant="secondary">Médio</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Contas Suspeitas
          </h2>
          <p className="text-sm text-muted-foreground">
            Detecta nomes duplicados, picos de indicações (24h), IPs e dispositivos compartilhados.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou IP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Total suspeitas</p>
          <p className="text-2xl font-bold">{rows.length}</p>
        </div>
        <div className="glass-card rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Críticas (score 3+)</p>
          <p className="text-2xl font-bold text-destructive">{rows.filter((r) => r.risk_score >= 3).length}</p>
        </div>
        <div className="glass-card rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Bloqueadas</p>
          <p className="text-2xl font-bold">{rows.filter((r) => r.is_blocked).length}</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhuma conta suspeita encontrada.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((row) => (
            <div key={row.user_id} className="glass-card rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate">{row.name || "(sem nome)"}</span>
                  {riskBadge(row.risk_score)}
                  {row.is_blocked && <Badge variant="destructive">Bloqueado</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{row.email}</p>
                <div className="flex flex-wrap gap-1 mt-2 text-xs">
                  {row.has_duplicate_name && (
                    <Badge variant="outline" className="border-orange-500/50 text-orange-500">
                      <Users className="h-3 w-3 mr-1" /> Nome duplicado
                    </Badge>
                  )}
                  {row.referrals_last_24h > 5 && (
                    <Badge variant="outline" className="border-orange-500/50 text-orange-500">
                      {row.referrals_last_24h} indicações 24h
                    </Badge>
                  )}
                  {row.shares_ip && row.signup_ip && (
                    <Badge variant="outline" className="border-orange-500/50 text-orange-500">
                      IP: {row.signup_ip}
                    </Badge>
                  )}
                  {row.shares_device && (
                    <Badge variant="outline" className="border-orange-500/50 text-orange-500">
                      Dispositivo compartilhado
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Criado em {format(new Date(row.created_at), "dd/MM/yyyy HH:mm")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={row.is_blocked ? "outline" : "destructive"}
                  onClick={() => toggleBlock(row)}
                  disabled={actingId === row.user_id}
                >
                  {row.is_blocked ? (
                    <><ShieldCheck className="h-4 w-4 mr-1" /> Desbloquear</>
                  ) : (
                    <><Ban className="h-4 w-4 mr-1" /> Bloquear</>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuspiciousAccountsPanel;
