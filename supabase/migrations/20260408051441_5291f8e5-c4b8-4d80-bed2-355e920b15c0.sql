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
    -- Level 1: 30%
    INSERT INTO public.referrals (referrer_id, referred_id, level, commission_rate)
    VALUES (ref_id, NEW.id, 1, 0.30)
    ON CONFLICT DO NOTHING;

    -- Level 2: 20%
    SELECT referred_by INTO level2_referrer FROM public.profiles WHERE user_id = ref_id;
    IF level2_referrer IS NOT NULL THEN
      INSERT INTO public.referrals (referrer_id, referred_id, level, commission_rate)
      VALUES (level2_referrer, NEW.id, 2, 0.20)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_referral_commission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  referrer_record RECORD;
BEGIN
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
$function$;