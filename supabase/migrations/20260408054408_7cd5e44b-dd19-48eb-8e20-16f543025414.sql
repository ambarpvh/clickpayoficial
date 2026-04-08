
-- Drop the referral commission trigger
DROP TRIGGER IF EXISTS on_click_process_referral ON public.clicks;

-- Drop the referral commission function
DROP FUNCTION IF EXISTS public.process_referral_commission();
