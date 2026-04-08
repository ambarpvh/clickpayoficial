import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const ensureUserSetup = async (user: User) => {
  const localReferrer = typeof window !== "undefined" ? localStorage.getItem("clickpay_ref") : null;
  const metadataReferrer = typeof user.user_metadata?.referred_by === "string"
    ? user.user_metadata.referred_by
    : null;

  const referrerId = [localReferrer, metadataReferrer].find(
    (value) => value && value !== user.id,
  ) ?? null;

  const { error } = await (supabase as any).rpc("ensure_user_setup", {
    name_input:
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      null,
    email_input: user.email || null,
    avatar_url_input: user.user_metadata?.avatar_url || null,
    referrer_id: referrerId,
  });

  if (!error && localReferrer && typeof window !== "undefined") {
    localStorage.removeItem("clickpay_ref");
  }

  return { error };
};
