
CREATE OR REPLACE FUNCTION public.ensure_user_setup(
  name_input TEXT DEFAULT NULL,
  email_input TEXT DEFAULT NULL,
  avatar_url_input TEXT DEFAULT NULL,
  referrer_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller_id UUID;
  existing_profile UUID;
  free_plan_id UUID;
  existing_plan UUID;
  level2_referrer UUID;
  existing_referral UUID;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Create profile if not exists
  SELECT id INTO existing_profile FROM public.profiles WHERE user_id = caller_id;
  IF existing_profile IS NULL THEN
    INSERT INTO public.profiles (user_id, name, email, avatar_url, referred_by)
    VALUES (
      caller_id,
      COALESCE(name_input, ''),
      COALESCE(email_input, ''),
      COALESCE(avatar_url_input, ''),
      referrer_id
    );
  ELSE
    -- If profile exists but has no referred_by, update it
    IF referrer_id IS NOT NULL THEN
      UPDATE public.profiles
      SET referred_by = referrer_id
      WHERE user_id = caller_id AND referred_by IS NULL;
    END IF;
  END IF;

  -- 2. Ensure user role exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (caller_id, 'user')
  ON CONFLICT DO NOTHING;

  -- 3. Assign free plan if no active plan
  SELECT id INTO existing_plan FROM public.user_plans WHERE user_id = caller_id AND is_active = true LIMIT 1;
  IF existing_plan IS NULL THEN
    SELECT id INTO free_plan_id FROM public.plans WHERE price = 0 AND is_active = true LIMIT 1;
    IF free_plan_id IS NOT NULL THEN
      INSERT INTO public.user_plans (user_id, plan_id) VALUES (caller_id, free_plan_id);
    END IF;
  END IF;

  -- 4. Create referral links and bonus (only if referrer_id provided and no existing referral)
  IF referrer_id IS NOT NULL AND referrer_id != caller_id THEN
    SELECT id INTO existing_referral FROM public.referrals WHERE referred_id = caller_id AND level = 1;
    IF existing_referral IS NULL THEN
      -- Level 1
      INSERT INTO public.referrals (referrer_id, referred_id, level, commission_rate)
      VALUES (referrer_id, caller_id, 1, 0.30)
      ON CONFLICT DO NOTHING;

      -- Level 2
      SELECT referred_by INTO level2_referrer FROM public.profiles WHERE user_id = referrer_id;
      IF level2_referrer IS NOT NULL THEN
        INSERT INTO public.referrals (referrer_id, referred_id, level, commission_rate)
        VALUES (level2_referrer, caller_id, 2, 0.20)
        ON CONFLICT DO NOTHING;
      END IF;

      -- Credit R$ 1,00 to level 1 referrer for free signup
      INSERT INTO public.balance_adjustments (user_id, admin_id, amount, note)
      VALUES (referrer_id, referrer_id, 1.00, 'Comissão: Cadastro novo (Plano Free)');
    END IF;
  END IF;
END;
$function$;
