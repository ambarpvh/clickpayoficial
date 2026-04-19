import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Ban } from "lucide-react";

const BlockedGuard = () => {
  const { user, signOut } = useAuth();
  const [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!user) {
      setBlocked(false);
      setMessage("");
      return;
    }

    let mounted = true;

    const check = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_blocked, block_message")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!mounted) return;
      if (data?.is_blocked) {
        setBlocked(true);
        setMessage(data.block_message || "Sua conta foi bloqueada. Entre em contato com o suporte.");
      } else {
        setBlocked(false);
        setMessage("");
      }
    };

    check();

    // Realtime subscription: react instantly when admin blocks
    const channel = supabase
      .channel(`blocked-guard-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as { is_blocked?: boolean; block_message?: string };
          if (row.is_blocked) {
            setBlocked(true);
            setMessage(row.block_message || "Sua conta foi bloqueada. Entre em contato com o suporte.");
          } else {
            setBlocked(false);
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!blocked) return null;

  // Any interaction logs the user out immediately
  const handleAnyInteraction = async (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
    await signOut();
    // Force redirect to landing
    window.location.href = "/login";
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      onClickCapture={handleAnyInteraction}
      onKeyDownCapture={handleAnyInteraction}
      onTouchStartCapture={handleAnyInteraction}
      onContextMenuCapture={handleAnyInteraction}
      tabIndex={0}
    >
      <div className="glass-card max-w-md w-full rounded-2xl p-8 text-center border border-destructive/40 shadow-2xl">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <Ban className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="font-heading text-2xl font-bold mb-3">Conta bloqueada</h2>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap mb-6">{message}</p>
        <p className="text-xs text-muted-foreground/70">
          Toque em qualquer lugar para sair.
        </p>
      </div>
    </div>
  );
};

export default BlockedGuard;
