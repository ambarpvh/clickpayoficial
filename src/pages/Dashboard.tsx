
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DollarSign, Eye, TrendingUp, Zap, LogOut, Copy, Check, Gift, Clock, ArrowUpRight, Crown, History as HistoryIcon, UserCog, Info, X, Megaphone } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import AdTimer from "@/components/AdTimer";
import AdminMessagesBanner from "@/components/AdminMessagesBanner";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";

interface Ad {
  id: string;
  title: string;
  url: string;
  view_time: number;
  open_link?: boolean;
  reward_value?: number | null;
}

interface Click {
  id: string;
  ad_id: string;
  earned_value: number;
  clicked_at: string;
  referral_commission_paid?: boolean | null;
  ads?: { title: string } | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAdmin, signOut, loading: authLoading } = useAuth();
  const viewAsUserId = isAdmin ? searchParams.get("view_as") : null;
  const targetUserId = viewAsUserId || user?.id;

  const [balance, setBalance] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [ads, setAds] = useState<Ad[]>([]);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAd, setActiveAd] = useState<Ad | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [referralEarnings, setReferralEarnings] = useState(0);
  const [isVip, setIsVip] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    // Se ainda estiver carregando a autenticação, não faz nada
    if (authLoading) return;

    // Se terminou de carregar e não tem usuário, redireciona para login
    if (!user) {
      console.log("No user found after auth loading, redirecting to login...");
      navigate("/login");
      return;
    }

    // Se tem usuário e targetUserId, carrega os dados
    if (targetUserId) {
      loadData();
    }
  }, [user, authLoading, targetUserId, navigate]);

  const loadData = async () => {
    if (!targetUserId) return;
    
    try {
      setLoading(true);
      
      // Load profile data
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("balance, is_vip")
        .eq("id", targetUserId)
        .single();

      if (profileError) throw profileError;
      setBalance(profile.balance || 0);
      setIsVip(profile.is_vip || false);

      // Load ads
      const { data: adsData, error: adsError } = await supabase
        .from("ads")
        .select("*")
        .eq("active", true);

      if (adsError) throw adsError;
      setAds(adsData || []);

      // Load clicks/history
      const { data: clicksData, error: clicksError } = await supabase
        .from("clicks")
        .select(`
          id,
          ad_id,
          earned_value,
          clicked_at,
          referral_commission_paid,
          ads (
            title
          )
        `)
        .eq("user_id", targetUserId)
        .order("clicked_at", { ascending: false });

      if (clicksError) throw clicksError;
      setClicks(clicksData as any[] || []);
      setTotalClicks(clicksData?.length || 0);

      // Calculate today's earnings
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayClicks = clicksData?.filter(c => new Date(c.clicked_at) >= today) || [];
      const todaySum = todayClicks.reduce((acc, curr) => acc + curr.earned_value, 0);
      setTodayEarnings(todaySum);

      // Load referrals
      const { count: refCount, error: refError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("referred_by", targetUserId);

      if (refError) throw refError;
      setReferralCount(refCount || 0);

      // Load referral earnings
      const { data: refEarningsData, error: refEarningsError } = await supabase
        .from("clicks")
        .select("earned_value")
        .eq("referrer_id", targetUserId)
        .eq("referral_commission_paid", true);

      if (!refEarningsError && refEarningsData) {
        const refSum = refEarningsData.reduce((acc, curr) => acc + (curr.earned_value * 0.1), 0);
        setReferralEarnings(refSum);
      }

    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdClick = (ad: Ad) => {
    setActiveAd(ad);
  };

  const handleAdComplete = async () => {
    if (!activeAd || !user) return;

    try {
      const { data, error } = await supabase.rpc("complete_ad_view", {
        p_ad_id: activeAd.id,
        p_user_id: user.id
      });

      if (error) throw error;

      toast.success(`Você ganhou ${formatBRL(activeAd.reward_value || 0)}!`);
      setActiveAd(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message);
      setActiveAd(null);
    }
  };

  const copyReferralLink = () => {
    const link = `${window.location.origin}/register?ref=${user?.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Link de indicação copiado!");
  };

  // Se estiver carregando a autenticação inicial, mostra um loading state limpo
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  // Se não tiver usuário, o useEffect já vai cuidar do redirecionamento, 
  // mas retornamos null para não renderizar nada por um frame
  if (!user) return null;

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <AdminMessagesBanner />
      
      {/* Header */}
      <header className="bg-zinc-900/50 border-b border-zinc-800 p-4 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Zap className="w-8 h-8 text-yellow-400 fill-yellow-400" />
            <h1 className="text-xl font-bold tracking-tight">ClickPay</h1>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/admin")}
                className="text-zinc-400 hover:text-white"
              >
                <UserCog className="w-5 h-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut()}
              className="text-zinc-400 hover:text-red-400"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-6">
        {viewAsUserId && (
          <div className="bg-yellow-400/10 border border-yellow-400/20 p-3 rounded-lg flex items-center justify-between">
            <p className="text-yellow-400 text-sm font-medium">
              Visualizando como usuário: {viewAsUserId}
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/dashboard")}
              className="text-yellow-400 hover:bg-yellow-400/20"
            >
              Sair da visualização
            </Button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl space-y-2 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <DollarSign className="w-12 h-12" />
            </div>
            <p className="text-zinc-400 text-sm font-medium">Saldo Disponível</p>
            <h2 className="text-3xl font-bold text-yellow-400">{formatBRL(balance)}</h2>
            <div className="pt-2">
              <Button 
                onClick={() => navigate("/payment")}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold h-10"
              >
                Sacar Agora
              </Button>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl space-y-2 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp className="w-12 h-12" />
            </div>
            <p className="text-zinc-400 text-sm font-medium">Ganhos de Hoje</p>
            <h2 className="text-3xl font-bold text-white">{formatBRL(todayEarnings)}</h2>
            <p className="text-xs text-zinc-500 flex items-center gap-1">
              <Check className="w-3 h-3 text-green-500" />
              {totalClicks} cliques totais realizados
            </p>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl space-y-2 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Gift className="w-12 h-12" />
            </div>
            <p className="text-zinc-400 text-sm font-medium">Indicações</p>
            <h2 className="text-3xl font-bold text-white">{referralCount}</h2>
            <p className="text-xs text-zinc-500">
              Ganhos: <span className="text-green-400 font-medium">{formatBRL(referralEarnings)}</span>
            </p>
          </div>
        </div>

        {/* VIP Banner */}
        {!isVip && (
          <div className="bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-400 p-3 rounded-xl">
                <Crown className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Seja um Membro VIP</h3>
                <p className="text-zinc-400 text-sm">Ganhe 2x mais por clique e tenha saques instantâneos!</p>
              </div>
            </div>
            <Button 
              onClick={() => navigate("/plans")}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-8 h-12 whitespace-nowrap"
            >
              Ver Planos VIP
            </Button>
          </div>
        )}

        {/* Ads Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-yellow-400" />
              Anúncios Disponíveis
            </h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowHistoryModal(true)}
              className="text-zinc-400 hover:text-white flex items-center gap-2"
            >
              <HistoryIcon className="w-4 h-4" />
              Histórico
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ads.map((ad) => (
              <div 
                key={ad.id}
                className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl space-y-4 hover:border-yellow-400/30 transition-all group"
              >
                <div className="space-y-1">
                  <h4 className="font-bold text-white group-hover:text-yellow-400 transition-colors">{ad.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {ad.view_time}s
                    </span>
                    <span className="flex items-center gap-1 text-green-400 font-medium">
                      <DollarSign className="w-3 h-3" />
                      {formatBRL(ad.reward_value || 0)}
                    </span>
                  </div>
                </div>
                <Button 
                  onClick={() => handleAdClick(ad)}
                  className="w-full bg-zinc-800 hover:bg-yellow-400 hover:text-black text-white font-medium h-10 transition-all"
                >
                  Visualizar Anúncio
                </Button>
              </div>
            ))}
            {ads.length === 0 && !loading && (
              <div className="col-span-full py-12 text-center space-y-2">
                <Info className="w-12 h-12 text-zinc-700 mx-auto" />
                <p className="text-zinc-500">Nenhum anúncio disponível no momento.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => setShowReferralModal(true)}
            className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-zinc-800/50 transition-colors"
          >
            <div className="bg-blue-500/10 p-2 rounded-lg">
              <Copy className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-xs font-medium text-zinc-400">Indicar Amigos</span>
          </button>
          <button 
            onClick={() => navigate("/profile")}
            className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-zinc-800/50 transition-colors"
          >
            <div className="bg-purple-500/10 p-2 rounded-lg">
              <UserCog className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-xs font-medium text-zinc-400">Meu Perfil</span>
          </button>
          <button 
            onClick={() => navigate("/history")}
            className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-zinc-800/50 transition-colors"
          >
            <div className="bg-green-500/10 p-2 rounded-lg">
              <HistoryIcon className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-xs font-medium text-zinc-400">Extrato</span>
          </button>
          <button 
            onClick={() => window.open("https://wa.me/5541999999999", "_blank")}
            className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex flex-col items-center gap-2 hover:bg-zinc-800/50 transition-colors"
          >
            <div className="bg-green-500/10 p-2 rounded-lg">
              <Megaphone className="w-5 h-5 text-green-500" />
            </div>
            <span className="text-xs font-medium text-zinc-400">Suporte</span>
          </button>
        </div>
      </main>

      {/* Ad Viewer Modal */}
      {activeAd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/80">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-400/10 p-2 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">{activeAd.title}</h4>
                  <AdTimer 
                    duration={activeAd.view_time} 
                    onComplete={handleAdComplete} 
                  />
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setActiveAd(null)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
            <div className="aspect-video bg-black relative">
              <iframe 
                src={activeAd.url} 
                className="w-full h-full border-none"
                title="Ad Content"
                allow="autoplay"
              />
              <div className="absolute inset-0 pointer-events-none border-4 border-yellow-400/20 animate-pulse" />
            </div>
            <div className="p-4 bg-zinc-900/80 text-center">
              <p className="text-xs text-zinc-500">Aguarde o cronômetro finalizar para receber sua recompensa.</p>
            </div>
          </div>
        </div>
      )}

      {/* Referral Modal */}
      {showReferralModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Indique e Ganhe</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowReferralModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl text-center space-y-2">
                <Gift className="w-8 h-8 text-blue-400 mx-auto" />
                <p className="text-sm text-zinc-300">
                  Ganhe <span className="text-blue-400 font-bold">10% de comissão</span> sobre cada clique dos seus amigos indicados!
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Seu Link de Indicação</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-black/50 border border-zinc-800 p-3 rounded-xl text-sm font-mono text-zinc-400 truncate">
                    {window.location.origin}/register?ref={user?.id}
                  </div>
                  <Button onClick={copyReferralLink} className="bg-yellow-400 hover:bg-yellow-500 text-black">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Histórico de Ganhos</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowHistoryModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {clicks.map((click) => (
                <div key={click.id} className="bg-black/30 border border-zinc-800/50 p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{click.ads?.title || "Anúncio Visualizado"}</p>
                    <p className="text-xs text-zinc-500">{new Date(click.clicked_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-bold">+{formatBRL(click.earned_value)}</p>
                    {click.referral_commission_paid && (
                      <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">Comissão Paga</span>
                    )}
                  </div>
                </div>
              ))}
              {clicks.length === 0 && (
                <div className="text-center py-12 text-zinc-500">
                  Nenhum histórico encontrado.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
