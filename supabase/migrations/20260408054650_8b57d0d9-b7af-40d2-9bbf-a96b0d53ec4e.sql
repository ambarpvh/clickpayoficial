
CREATE OR REPLACE FUNCTION public.assign_free_plan()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  free_plan_id UUID;
  existing_plan UUID;
BEGIN
  -- Check if user already has an active plan
  SELECT id INTO existing_plan FROM public.user_plans WHERE user_id = NEW.user_id AND is_active = true LIMIT 1;
  IF existing_plan IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO free_plan_id FROM public.plans WHERE price = 0 AND is_active = true LIMIT 1;
  IF free_plan_id IS NOT NULL THEN
    INSERT INTO public.user_plans (user_id, plan_id) VALUES (NEW.user_id, free_plan_id);
  END IF;
  RETURN NEW;
END;
$function$;

-- Remove duplicate user_plans keeping only the oldest
DELETE FROM public.user_plans a USING public.user_plans b
WHERE a.id > b.id AND a.user_id = b.user_id AND a.plan_id = b.plan_id AND a.is_active = b.is_active;
