
-- Update handle_new_user to use plan's referral_commission
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ref_id UUID;
  free_plan_id UUID;
  commission_value NUMERIC;
BEGIN
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

  IF ref_id IS NOT NULL THEN
    -- Get free plan commission value
    SELECT referral_commission INTO commission_value FROM public.plans WHERE price = 0 AND is_active = true LIMIT 1;
    commission_value := COALESCE(commission_value, 1.00);

    INSERT INTO public.referrals (referrer_id, referred_id, level, commission_rate)
    VALUES (ref_id, NEW.id, 1, 0.30)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.balance_adjustments (user_id, admin_id, amount, note)
    VALUES (ref_id, ref_id, commission_value, 'Comissão: Cadastro novo (Plano Free)');
  END IF;

  RETURN NEW;
END;
$function$;

-- Update ensure_user_setup to use plan's referral_commission
CREATE OR REPLACE FUNCTION public.ensure_user_setup(name_input text DEFAULT NULL::text, email_input text DEFAULT NULL::text, avatar_url_input text DEFAULT NULL::text, referrer_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller_id UUID;
  existing_profile UUID;
  free_plan_id UUID;
  existing_plan UUID;
  existing_referral UUID;
  commission_value NUMERIC;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

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
    IF referrer_id IS NOT NULL THEN
      UPDATE public.profiles
      SET referred_by = referrer_id
      WHERE user_id = caller_id AND referred_by IS NULL;
    END IF;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (caller_id, 'user')
  ON CONFLICT DO NOTHING;

  SELECT id INTO existing_plan FROM public.user_plans WHERE user_id = caller_id AND is_active = true LIMIT 1;
  IF existing_plan IS NULL THEN
    SELECT id INTO free_plan_id FROM public.plans WHERE price = 0 AND is_active = true LIMIT 1;
    IF free_plan_id IS NOT NULL THEN
      INSERT INTO public.user_plans (user_id, plan_id) VALUES (caller_id, free_plan_id);
    END IF;
  END IF;

  IF referrer_id IS NOT NULL AND referrer_id != caller_id THEN
    SELECT id INTO existing_referral FROM public.referrals WHERE referred_id = caller_id AND level = 1;
    IF existing_referral IS NULL THEN
      -- Get the free plan commission value
      SELECT referral_commission INTO commission_value FROM public.plans WHERE price = 0 AND is_active = true LIMIT 1;
      commission_value := COALESCE(commission_value, 1.00);

      INSERT INTO public.referrals (referrer_id, referred_id, level, commission_rate)
      VALUES (referrer_id, caller_id, 1, 0.30)
      ON CONFLICT DO NOTHING;

      INSERT INTO public.balance_adjustments (user_id, admin_id, amount, note)
      VALUES (referrer_id, referrer_id, commission_value, 'Comissão: Cadastro novo (Plano Free)');
    END IF;
  END IF;
END;
$function$;
