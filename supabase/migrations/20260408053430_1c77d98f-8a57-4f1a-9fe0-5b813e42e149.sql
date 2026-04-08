-- Add reward_value column to ads
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS reward_value numeric DEFAULT NULL;

-- Recreate the referral commission function
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

-- Recreate the trigger
CREATE TRIGGER on_click_process_referral
  AFTER INSERT ON public.clicks
  FOR EACH ROW
  WHEN (NEW.referral_commission_paid IS NOT TRUE)
  EXECUTE FUNCTION public.process_referral_commission();