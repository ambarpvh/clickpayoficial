-- Função que valida limite diário e duplicidade antes de inserir clique
CREATE OR REPLACE FUNCTION public.enforce_click_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INTEGER;
  v_today_count INTEGER;
  v_dup_count INTEGER;
BEGIN
  -- Admins ficam isentos
  IF public.has_role(NEW.user_id, 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Bloqueia clique duplicado no mesmo anúncio no mesmo dia
  SELECT COUNT(*) INTO v_dup_count
  FROM public.clicks
  WHERE user_id = NEW.user_id
    AND ad_id = NEW.ad_id
    AND DATE(clicked_at) = CURRENT_DATE;

  IF v_dup_count > 0 THEN
    RAISE EXCEPTION 'Você já visualizou este anúncio hoje.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Busca o limite diário do plano ativo do usuário
  SELECT pl.daily_click_limit INTO v_limit
  FROM public.user_plans up
  JOIN public.plans pl ON pl.id = up.plan_id
  WHERE up.user_id = NEW.user_id
    AND up.is_active = true
  ORDER BY up.started_at DESC
  LIMIT 1;

  -- Se não tem plano ativo, bloqueia
  IF v_limit IS NULL THEN
    RAISE EXCEPTION 'Nenhum plano ativo encontrado.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Conta cliques de hoje
  SELECT COUNT(*) INTO v_today_count
  FROM public.clicks
  WHERE user_id = NEW.user_id
    AND DATE(clicked_at) = CURRENT_DATE;

  IF v_today_count >= v_limit THEN
    RAISE EXCEPTION 'Limite diário de anúncios atingido (%).', v_limit
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_click_limits ON public.clicks;

CREATE TRIGGER trg_enforce_click_limits
BEFORE INSERT ON public.clicks
FOR EACH ROW
EXECUTE FUNCTION public.enforce_click_limits();