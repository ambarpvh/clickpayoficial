-- =========================
-- FASE 1A: Bônus pendente
-- =========================

-- 1) Adiciona status em referrals
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- Marca referrals antigas como confirmadas para não quebrar histórico
UPDATE public.referrals SET status = 'confirmed', confirmed_at = COALESCE(confirmed_at, created_at)
WHERE status = 'pending' AND created_at < now();

CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);

-- 2) Settings: referral_min_clicks (padrão 5)
INSERT INTO public.settings (key, value)
VALUES ('referral_min_clicks', '5')
ON CONFLICT (key) DO NOTHING;

-- 3) Função para confirmar bônus quando indicado atinge X cliques
CREATE OR REPLACE FUNCTION public.confirm_referral_bonus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_min_clicks INTEGER;
  v_user_clicks INTEGER;
  v_referral RECORD;
  v_commission NUMERIC;
BEGIN
  -- Busca referral pendente do usuário que acabou de clicar
  SELECT * INTO v_referral
  FROM public.referrals
  WHERE referred_id = NEW.user_id AND status = 'pending'
  LIMIT 1;

  IF v_referral IS NULL THEN
    RETURN NEW;
  END IF;

  -- Lê mínimo de cliques exigido
  SELECT COALESCE(NULLIF(value,'')::INTEGER, 5) INTO v_min_clicks
  FROM public.settings WHERE key = 'referral_min_clicks';
  v_min_clicks := COALESCE(v_min_clicks, 5);

  -- Conta cliques totais do indicado
  SELECT COUNT(*) INTO v_user_clicks
  FROM public.clicks WHERE user_id = NEW.user_id;

  IF v_user_clicks >= v_min_clicks THEN
    -- Credita comissão para o referrer
    SELECT referral_commission INTO v_commission
    FROM public.plans WHERE price = 0 AND is_active = true LIMIT 1;
    v_commission := COALESCE(v_commission, 1.00);

    INSERT INTO public.balance_adjustments (user_id, admin_id, amount, note)
    VALUES (v_referral.referrer_id, v_referral.referrer_id, v_commission,
      'Comissão: Indicado completou ' || v_min_clicks || ' anúncios');

    UPDATE public.referrals
    SET status = 'confirmed', confirmed_at = now()
    WHERE id = v_referral.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_confirm_referral_bonus ON public.clicks;
CREATE TRIGGER trg_confirm_referral_bonus
AFTER INSERT ON public.clicks
FOR EACH ROW EXECUTE FUNCTION public.confirm_referral_bonus();

-- 4) Atualiza handle_new_user: NÃO credita bônus, apenas cria referral pending
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ref_id UUID;
  v_today_referrals INTEGER;
  v_new_name TEXT;
  v_blocked_count INTEGER;
BEGIN
  v_new_name := TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''));

  -- FASE 1C: bloqueia se nome (case-insensitive) já existe em conta bloqueada
  IF v_new_name <> '' THEN
    SELECT COUNT(*) INTO v_blocked_count
    FROM public.profiles
    WHERE is_blocked = true
      AND LOWER(TRIM(name)) = LOWER(v_new_name);

    IF v_blocked_count > 0 THEN
      RAISE EXCEPTION 'Cadastro bloqueado: já existe uma conta suspensa com este nome. Entre em contato com o suporte.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  ref_id := (NEW.raw_user_meta_data->>'referred_by')::UUID;

  -- Rate-limit: bloqueia se referrer já fez 10+ indicações hoje
  IF ref_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_today_referrals
    FROM public.referrals
    WHERE referrer_id = ref_id
      AND DATE(created_at) = CURRENT_DATE;

    IF v_today_referrals >= 10 THEN
      RAISE EXCEPTION 'Limite diário de indicações atingido para este referrer (10 por dia).'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  INSERT INTO public.profiles (user_id, name, email, avatar_url, referred_by)
  VALUES (
    NEW.id,
    v_new_name,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    ref_id
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  -- FASE 1A: cria referral PENDING (sem creditar bônus)
  IF ref_id IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, level, commission_rate, status)
    VALUES (ref_id, NEW.id, 1, 0.30, 'pending')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- 5) Atualiza ensure_user_setup: NÃO credita bônus, apenas cria referral pending + bloqueia nome duplicado
CREATE OR REPLACE FUNCTION public.ensure_user_setup(
  name_input text DEFAULT NULL::text,
  email_input text DEFAULT NULL::text,
  avatar_url_input text DEFAULT NULL::text,
  referrer_id uuid DEFAULT NULL::uuid
)
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
  v_today_referrals INTEGER;
  v_new_name TEXT;
  v_blocked_count INTEGER;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_new_name := TRIM(COALESCE(name_input, ''));

  SELECT id INTO existing_profile FROM public.profiles WHERE user_id = caller_id;

  -- FASE 1C: bloqueia nome duplicado de conta bloqueada (apenas em CRIAÇÃO)
  IF existing_profile IS NULL AND v_new_name <> '' THEN
    SELECT COUNT(*) INTO v_blocked_count
    FROM public.profiles
    WHERE is_blocked = true
      AND LOWER(TRIM(name)) = LOWER(v_new_name);

    IF v_blocked_count > 0 THEN
      RAISE EXCEPTION 'Cadastro bloqueado: já existe uma conta suspensa com este nome. Entre em contato com o suporte.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF existing_profile IS NULL THEN
    INSERT INTO public.profiles (user_id, name, email, avatar_url, referred_by)
    VALUES (
      caller_id,
      v_new_name,
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
      -- Rate-limit
      SELECT COUNT(*) INTO v_today_referrals
      FROM public.referrals
      WHERE referrer_id = ensure_user_setup.referrer_id
        AND DATE(created_at) = CURRENT_DATE;

      IF v_today_referrals >= 10 THEN
        RAISE EXCEPTION 'Limite diário de indicações atingido para este referrer (10 por dia).'
          USING ERRCODE = 'check_violation';
      END IF;

      -- FASE 1A: cria referral PENDING (sem creditar bônus)
      INSERT INTO public.referrals (referrer_id, referred_id, level, commission_rate, status)
      VALUES (referrer_id, caller_id, 1, 0.30, 'pending')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END;
$function$;