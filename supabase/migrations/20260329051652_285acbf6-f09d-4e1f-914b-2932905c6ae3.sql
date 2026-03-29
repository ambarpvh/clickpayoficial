
-- Create referrals table for tracking multi-level commissions
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  commission_rate NUMERIC NOT NULL DEFAULT 0.10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(referrer_id, referred_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can see their own referrals (where they are the referrer)
CREATE POLICY "Users can view their referrals" ON public.referrals
  FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id);

-- Admins can view all referrals
CREATE POLICY "Admins can view all referrals" ON public.referrals
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- System inserts referrals (via trigger)
CREATE POLICY "System can insert referrals" ON public.referrals
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Add referral_earnings column to track commission earnings
ALTER TABLE public.clicks ADD COLUMN IF NOT EXISTS referral_commission_paid BOOLEAN DEFAULT false;

-- Create a function to process referral commissions when a click happens
CREATE OR REPLACE FUNCTION public.process_referral_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  referrer_record RECORD;
BEGIN
  -- Level 1: direct referrer gets 10%
  FOR referrer_record IN
    SELECT referrer_id, level, commission_rate
    FROM public.referrals
    WHERE referred_id = NEW.user_id AND level <= 2
  LOOP
    INSERT INTO public.clicks (user_id, ad_id, earned_value, ip_address)
    VALUES (
      referrer_record.referrer_id,
      NEW.ad_id,
      NEW.earned_value * referrer_record.commission_rate,
      NULL
    );
  END LOOP;
  
  UPDATE public.clicks SET referral_commission_paid = true WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Trigger to auto-process commissions on new clicks
CREATE TRIGGER on_click_process_referral
  AFTER INSERT ON public.clicks
  FOR EACH ROW
  WHEN (NEW.referral_commission_paid = false)
  EXECUTE FUNCTION public.process_referral_commission();

-- Update handle_new_user to also create referral records
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ref_id UUID;
  level2_referrer UUID;
BEGIN
  -- Get referred_by from metadata
  ref_id := (NEW.raw_user_meta_data->>'referred_by')::UUID;

  INSERT INTO public.profiles (user_id, name, email, avatar_url, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    ref_id
  );
  
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  -- Create level 1 referral
  IF ref_id IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, level, commission_rate)
    VALUES (ref_id, NEW.id, 1, 0.10)
    ON CONFLICT DO NOTHING;

    -- Create level 2 referral (referrer's referrer)
    SELECT referred_by INTO level2_referrer FROM public.profiles WHERE user_id = ref_id;
    IF level2_referrer IS NOT NULL THEN
      INSERT INTO public.referrals (referrer_id, referred_id, level, commission_rate)
      VALUES (level2_referrer, NEW.id, 2, 0.05)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Enable realtime for referrals
ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals;
