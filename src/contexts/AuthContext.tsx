import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAdmin = async (userId: string) => {
      try {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();
        if (mounted) setIsAdmin(!!data);
      } catch {
        if (mounted) setIsAdmin(false);
      }
    };

    const processOAuthReferral = async (userId: string) => {
      const refId = localStorage.getItem("clickpay_ref");
      if (!refId || refId === userId) return;
      localStorage.removeItem("clickpay_ref");

      // Check if profile already has referred_by
      const { data: profile } = await supabase
        .from("profiles")
        .select("referred_by")
        .eq("user_id", userId)
        .maybeSingle();
      if (profile?.referred_by) return;

      // Update profile with referrer
      await supabase
        .from("profiles")
        .update({ referred_by: refId })
        .eq("user_id", userId);

      // Create referral records
      // Level 1
      await supabase.from("referrals").insert({
        referrer_id: refId,
        referred_id: userId,
        level: 1,
        commission_rate: 0.30,
      });

      // Level 2
      const { data: l2Profile } = await supabase
        .from("profiles")
        .select("referred_by")
        .eq("user_id", refId)
        .maybeSingle();
      if (l2Profile?.referred_by) {
        await supabase.from("referrals").insert({
          referrer_id: l2Profile.referred_by,
          referred_id: userId,
          level: 2,
          commission_rate: 0.20,
        });
      }
    };

    // First get the initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdmin(session.user.id);
        processOAuthReferral(session.user.id);
      }
      setLoading(false);
    });

    // Then listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          checkAdmin(session.user.id);
        } else {
          setIsAdmin(false);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
