CREATE POLICY "Referrers can view referred profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.referrals r
    WHERE r.referrer_id = auth.uid()
      AND r.referred_id = profiles.user_id
  )
);