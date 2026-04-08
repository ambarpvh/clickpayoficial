-- Remove click-based commission triggers
DROP TRIGGER IF EXISTS on_click_created ON public.clicks;
DROP TRIGGER IF EXISTS on_click_process_referral ON public.clicks;

-- Drop the old per-click commission function
DROP FUNCTION IF EXISTS public.process_referral_commission();

-- Update handle_new_user to credit R$ 1,00 to referrer on free signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ref_id UUID;
  level2_referrer UUID;
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
    -- Level 1: 30% (paid plans) / R$ 1,00 (free)
    INSERT INTO public.referrals (referrer_id, referred_id, level, commission_rate)
    VALUES (ref_id, NEW.id, 1, 0.30)
    ON CONFLICT DO NOTHING;

    -- Level 2: 20% (paid plans only)
    SELECT referred_by INTO level2_referrer FROM public.profiles WHERE user_id = ref_id;
    IF level2_referrer IS NOT NULL THEN
      INSERT INTO public.referrals (referrer_id, referred_id, level, commission_rate)
      VALUES (level2_referrer, NEW.id, 2, 0.20)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Credit R$ 1,00 to level 1 referrer for free signup
    INSERT INTO public.balance_adjustments (user_id, admin_id, amount, note)
    VALUES (ref_id, ref_id, 1.00, 'Comissão: Cadastro novo (Plano Free)');
  END IF;

  RETURN NEW;
END;
$function$;