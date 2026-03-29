
-- Fix permissive INSERT policy on referrals - restrict to system/trigger context
DROP POLICY "System can insert referrals" ON public.referrals;

-- Only allow inserts where the referrer is the current user OR via security definer function
CREATE POLICY "Authenticated users can insert referrals for themselves" ON public.referrals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = referrer_id OR public.has_role(auth.uid(), 'admin'));
