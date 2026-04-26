import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Users, UserCheck, UserX, Ban, Share2, TrendingUp, Wallet } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { format, subDays } from "date-fns";

type Stats = {
  total: number;
  active7d: number;
  inactive: number;
  blocked: number;
  withReferrals: number;
  newLast30d: number;
  totalBalance: number;
  byPlan: { name: string; count: number }[];
  signupsPerDay: { date: string; count: number }[];
  topReferrers: { user_id: string; name: string; email: string; count: number }[];
};

const COLORS = {
  active: "hsl(var(--primary))",
  inactive: "hsl(var(--muted-foreground))",
  blocked: "hsl(var(--destructive))",
};

const UserHealthReport = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const [profilesRes, clicksRes, referralsRes, adjustmentsRes, plansRes, userPlansRes] = await Promise.all([
          supabase.from("profiles").select("user_id, created_at, is_blocked"),
          supabase.from("clicks").select("user_id, clicked_at").gte("clicked_at", since7),
          supabase.from("referrals").select("referrer_id"),
          supabase.from("balance_adjustments").select("user_id, amount"),
          supabase.from("plans").select("id, name"),
          supabase.from("user_plans").select("user_id, plan_id").eq("is_active", true),
        ]);

        const profiles = profilesRes.data || [];
        const clicks = clicksRes.data || [];
        const referrals = referralsRes.data || [];
        const adjustments = adjustmentsRes.data || [];
        const plansList = plansRes.data || [];
        const userPlans = userPlansRes.data || [];

        const total = profiles.length;
        const blocked = profiles.filter((p: any) => p.is_blocked).length;
        const activeUserIds = new Set(clicks.map((c: any) => c.user_id));
        const active7d = profiles.filter((p: any) => !p.is_blocked && activeUserIds.has(p.user_id)).length;
        const inactive = total - active7d - blocked;

        const referrerCounts: Record<string, number> = {};
        referrals.forEach((r: any) => {
          referrerCounts[r.referrer_id] = (referrerCounts[r.referrer_id] || 0) + 1;
        });
        const referrerSet = new Set(Object.keys(referrerCounts));
        const withReferrals = profiles.filter((p: any) => referrerSet.has(p.user_id)).length;

        const profileMap: Record<string, any> = {};
        profiles.forEach((p: any) => { profileMap[p.user_id] = p; });
        const topReferrers = Object.entries(referrerCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([user_id, count]) => ({
            user_id,
            name: profileMap[user_id]?.name || "—",
            email: profileMap[user_id]?.email || "—",
            count,
          }));

        const newLast30d = profiles.filter((p: any) => p.created_at >= since30).length;

        const totalBalance = adjustments.reduce((sum: number, a: any) => sum + Number(a.amount || 0), 0);

        const planCounts: Record<string, number> = {};
        userPlans.forEach((up: any) => {
          planCounts[up.plan_id] = (planCounts[up.plan_id] || 0) + 1;
        });
        const byPlan = plansList.map((p: any) => ({
          name: p.name,
          count: planCounts[p.id] || 0,
        }));

        // Signups per day (last 30 days)
        const dayMap: Record<string, number> = {};
        for (let i = 29; i >= 0; i--) {
          const d = format(subDays(new Date(), i), "dd/MM");
          dayMap[d] = 0;
        }
        profiles.forEach((p: any) => {
          if (p.created_at >= since30) {
            const d = format(new Date(p.created_at), "dd/MM");
            if (d in dayMap) dayMap[d]++;
          }
        });
        const signupsPerDay = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

        setStats({
          total,
          active7d,
          inactive,
          blocked,
          withReferrals,
          newLast30d,
          totalBalance,
          byPlan,
          signupsPerDay,
          topReferrers,
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-6 animate-pulse">
        <div className="h-6 w-48 bg-muted rounded mb-4" />
        <div className="h-32 bg-muted/50 rounded" />
      </div>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="glass-card rounded-xl p-6 text-center text-muted-foreground">
        Sem dados de usuários ainda.
      </div>
    );
  }

  const pct = (n: number) => stats.total ? Math.round((n / stats.total) * 1000) / 10 : 0;

  const statusData = [
    { name: "Ativos (7d)", value: stats.active7d, color: COLORS.active },
    { name: "Inativos", value: stats.inactive, color: COLORS.inactive },
    { name: "Bloqueados", value: stats.blocked, color: COLORS.blocked },
  ].filter(d => d.value > 0);

  const kpis = [
    { label: "Total cadastrados", value: stats.total, icon: Users, color: "text-primary" },
    { label: "Ativos (7 dias)", value: `${pct(stats.active7d)}%`, sub: `${stats.active7d} usuários`, icon: UserCheck, color: "text-emerald-400" },
    { label: "Inativos", value: `${pct(stats.inactive)}%`, sub: `${stats.inactive} usuários`, icon: UserX, color: "text-muted-foreground" },
    { label: "Bloqueados", value: `${pct(stats.blocked)}%`, sub: `${stats.blocked} contas`, icon: Ban, color: "text-destructive" },
    { label: "Indicadores", value: `${pct(stats.withReferrals)}%`, sub: `${stats.withReferrals} indicaram alguém`, icon: Share2, color: "text-amber-400" },
    { label: "Novos (30d)", value: stats.newLast30d, sub: "cadastros recentes", icon: TrendingUp, color: "text-primary" },
    { label: "Saldo total no sistema", value: formatBRL(stats.totalBalance), icon: Wallet, color: "text-emerald-400" },
  ];

  return (
    <div className="glass-card rounded-xl p-4 sm:p-6 space-y-6">
      <div>
        <h3 className="font-heading text-lg font-bold flex items-center gap-2">
          <BarChart3Icon /> Saúde geral dos usuários
        </h3>
        <p className="text-xs text-muted-foreground">
          Ativo = clicou em algum anúncio nos últimos 7 dias.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-lg border border-border/50 bg-background/40 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{k.label}</span>
                <Icon className={`h-4 w-4 ${k.color}`} />
              </div>
              <div className="font-heading text-lg font-bold">{k.value}</div>
              {k.sub && <div className="text-[10px] text-muted-foreground">{k.sub}</div>}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status pie */}
        <div className="rounded-lg border border-border/50 bg-background/40 p-4">
          <h4 className="text-sm font-semibold mb-3">Distribuição por status</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(e: any) => `${e.name}: ${pct(e.value)}%`}
                >
                  {statusData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plans bar */}
        <div className="rounded-lg border border-border/50 bg-background/40 p-4">
          <h4 className="text-sm font-semibold mb-3">Usuários por plano ativo</h4>
          <div className="h-64">
            <ChartContainer config={{ count: { label: "Usuários", color: "hsl(var(--primary))" } }}>
              <BarChart data={stats.byPlan}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
        </div>
      </div>

    </div>
  );
};

const BarChart3Icon = () => (
  <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" /><path d="M8 17V9" /><path d="M13 17V5" /><path d="M18 17v-7" />
  </svg>
);

export default UserHealthReport;
