import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatBRL } from "@/lib/format";
import { AlertTriangle, RefreshCw, Undo2, Search } from "lucide-react";

interface AuditRow {
  user_id: string;
  email: string;
  name: string;
  plan_name: string;
  click_value: number;
  daily_limit: number;
  day: string; // YYYY-MM-DD
  clicks: number;
  excess: number;
  improper_gain: number;
  already_reversed: boolean;
}

const AuditPanel = ({ adminId }: { adminId: string }) => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [reversing, setReversing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    // Pull all clicks with user_id + day
    const { data: clicks } = await supabase
      .from("clicks")
      .select("user_id, clicked_at, earned_value");

    if (!clicks || clicks.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    // Aggregate by user/day
    const agg = new Map<string, { user_id: string; day: string; count: number }>();
    clicks.forEach((c: any) => {
      const day = new Date(c.clicked_at).toISOString().slice(0, 10);
      const k = `${c.user_id}|${day}`;
      const cur = agg.get(k);
      if (cur) cur.count++;
      else agg.set(k, { user_id: c.user_id, day, count: 1 });
    });

    const userIds = Array.from(new Set(Array.from(agg.values()).map((a) => a.user_id)));

    // Fetch active plans for these users
    const { data: userPlans } = await supabase
      .from("user_plans")
      .select("user_id, plans(name, daily_click_limit, click_value)")
      .in("user_id", userIds)
      .eq("is_active", true);

    const planMap = new Map<string, { name: string; limit: number; value: number }>();
    (userPlans || []).forEach((up: any) => {
      const p = up.plans;
      if (p) planMap.set(up.user_id, { name: p.name, limit: p.daily_click_limit, value: Number(p.click_value) });
    });

    // Filter rows that exceeded the limit
    const exceeded = Array.from(agg.values()).filter((a) => {
      const plan = planMap.get(a.user_id);
      return plan && a.count > plan.limit;
    });

    if (exceeded.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const exceededUserIds = Array.from(new Set(exceeded.map((e) => e.user_id)));

    // Fetch profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, email")
      .in("user_id", exceededUserIds);

    const profileMap = new Map<string, { name: string; email: string }>();
    (profiles || []).forEach((p: any) => profileMap.set(p.user_id, { name: p.name || "", email: p.email || "" }));

    // Fetch existing audit reversals to mark "already_reversed"
    const { data: adjustments } = await supabase
      .from("balance_adjustments")
      .select("user_id, note")
      .in("user_id", exceededUserIds)
      .ilike("note", "Estorno auditoria%");

    const reversedSet = new Set<string>();
    (adjustments || []).forEach((a: any) => {
      // Note format: "Estorno auditoria: cliques excedentes em YYYY-MM-DD (Plano X, limite N)"
      const m = (a.note || "").match(/em (\d{4}-\d{2}-\d{2})/);
      if (m) reversedSet.add(`${a.user_id}|${m[1]}`);
    });

    const result: AuditRow[] = exceeded.map((e) => {
      const plan = planMap.get(e.user_id)!;
      const profile = profileMap.get(e.user_id) || { name: "—", email: "—" };
      const excess = e.count - plan.limit;
      return {
        user_id: e.user_id,
        email: profile.email,
        name: profile.name,
        plan_name: plan.name,
        click_value: plan.value,
        daily_limit: plan.limit,
        day: e.day,
        clicks: e.count,
        excess,
        improper_gain: excess * plan.value,
        already_reversed: reversedSet.has(`${e.user_id}|${e.day}`),
      };
    });

    // Sort by improper gain desc, then most recent day
    result.sort((a, b) => {
      if (a.already_reversed !== b.already_reversed) return a.already_reversed ? 1 : -1;
      if (b.improper_gain !== a.improper_gain) return b.improper_gain - a.improper_gain;
      return b.day.localeCompare(a.day);
    });

    setRows(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    // Realtime: re-run audit on any new click insert
    const channel = supabase
      .channel("audit-clicks")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "clicks" },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "balance_adjustments" },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const reverse = async (row: AuditRow) => {
    if (row.already_reversed) {
      toast.info("Esse caso já foi estornado");
      return;
    }
    if (!window.confirm(
      `Confirmar estorno de ${formatBRL(row.improper_gain)} de ${row.email}?\n\n` +
      `${row.excess} cliques excedentes em ${new Date(row.day).toLocaleDateString("pt-BR")} ` +
      `(Plano ${row.plan_name}, limite ${row.daily_limit}/dia).`
    )) return;

    setReversing(`${row.user_id}|${row.day}`);
    const { error } = await supabase.from("balance_adjustments").insert({
      user_id: row.user_id,
      admin_id: adminId,
      amount: -Math.abs(row.improper_gain),
      note: `Estorno auditoria: cliques excedentes em ${row.day} (Plano ${row.plan_name}, limite ${row.daily_limit})`,
    });
    setReversing(null);

    if (error) {
      toast.error("Erro ao estornar: " + error.message);
      return;
    }
    toast.success("Estorno aplicado");
    load();
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? rows.filter(
        (r) =>
          r.email.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.day.includes(q) ||
          r.plan_name.toLowerCase().includes(q)
      )
    : rows;

  const totals = {
    cases: rows.length,
    pending: rows.filter((r) => !r.already_reversed).length,
    pendingValue: rows.filter((r) => !r.already_reversed).reduce((s, r) => s + r.improper_gain, 0),
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-accent" /> Auditoria de cliques
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Usuários que excederam o limite diário de anúncios em algum dia. Atualização em tempo real.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email, nome, dia ou plano"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="ghost" size="icon" onClick={load} title="Recarregar">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Casos detectados</p>
          <p className="font-heading text-2xl font-bold">{totals.cases}</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Pendentes de estorno</p>
          <p className="font-heading text-2xl font-bold text-accent">{totals.pending}</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Valor pendente</p>
          <p className="font-heading text-2xl font-bold text-destructive">{formatBRL(totals.pendingValue)}</p>
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Carregando auditoria...</p>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {rows.length === 0
              ? "Nenhum caso de excesso detectado. Tudo limpo! ✅"
              : "Nenhum resultado para essa busca."}
          </p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Usuário</th>
                  <th className="text-left p-3">Plano</th>
                  <th className="text-left p-3">Dia</th>
                  <th className="text-right p-3">Cliques / Limite</th>
                  <th className="text-right p-3">Excedente</th>
                  <th className="text-right p-3">Ganho indevido</th>
                  <th className="text-right p-3">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((r) => {
                  const key = `${r.user_id}|${r.day}`;
                  return (
                    <tr key={key} className={r.already_reversed ? "opacity-60" : ""}>
                      <td className="p-3">
                        <p className="font-medium">{r.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{r.email}</p>
                      </td>
                      <td className="p-3">{r.plan_name}</td>
                      <td className="p-3">{new Date(r.day).toLocaleDateString("pt-BR")}</td>
                      <td className="p-3 text-right">
                        <span className="font-semibold text-destructive">{r.clicks}</span>
                        <span className="text-muted-foreground"> / {r.daily_limit}</span>
                      </td>
                      <td className="p-3 text-right font-semibold">{r.excess}</td>
                      <td className="p-3 text-right font-semibold text-destructive">
                        {formatBRL(r.improper_gain)}
                      </td>
                      <td className="p-3 text-right">
                        {r.already_reversed ? (
                          <span className="text-xs text-primary font-medium">Estornado ✓</span>
                        ) : (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => reverse(r)}
                            disabled={reversing === key}
                          >
                            <Undo2 className="h-3.5 w-3.5 mr-1" />
                            {reversing === key ? "Estornando..." : "Estornar"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditPanel;
