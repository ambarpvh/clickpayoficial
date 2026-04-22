
-- ============================================================
-- FASE 2: Cooldown entre cadastros + Detector de padrão de email
-- ============================================================

-- Função utilitária: detecta padrão de email suspeito
CREATE OR REPLACE FUNCTION public.is_suspicious_email(_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_local TEXT;
  v_domain TEXT;
BEGIN
  IF _email IS NULL OR _email = '' THEN
    RETURN false;
  END IF;

  v_local := LOWER(SPLIT_PART(_email, '@', 1));
  v_domain := LOWER(SPLIT_PART(_email, '@', 2));

  -- Bloqueia local-part muito curto (1-3 chars) em domínios free
  IF LENGTH(v_local) <= 3 AND v_domain IN ('gmail.com','hotmail.com','outlook.com','yahoo.com') THEN
    RETURN true;
  END IF;

  -- Bloqueia padrões genéricos óbvios
  IF v_local ~ '^(nome|teste|test|user|usuario|fulano|ciclano|beltrano|abc|xyz|aaa|aaaa|qwer|asdf|zxcv|123|admin|email|conta|cliente)[0-9]*$' THEN
    RETURN true;
  END IF;

  -- Bloqueia local com 4+ caracteres iguais consecutivos (aaaa, eeee...)
  IF v_local ~ '(.)\1{3,}' THEN
    RETURN true;
  END IF;

  -- Bloqueia local apenas numérico (ex.: 12345@gmail.com)
  IF v_local ~ '^[0-9]+$' THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Atualiza handle_new_user com cooldown 5 min + detecção de email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_id UUID;
  v_today_referrals INTEGER;
  v_recent_referrals INTEGER;
  v_new_name TEXT;
  v_blocked_count INTEGER;
BEGIN
  v_new_name := TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''));

  -- Detector de email suspeito (FASE 2 - regra #5)
  IF public.is_suspicious_email(NEW.email) THEN
    RAISE EXCEPTION 'Cadastro bloqueado: padrão de email suspeito detectado. Use um email pessoal real.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Bloqueia se nome (case-insensitive) já existe em conta bloqueada
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

  IF ref_id IS NOT NULL THEN
    -- Cooldown 5 min (FASE 2 - regra #3)
    SELECT COUNT(*) INTO v_recent_referrals
    FROM public.referrals
    WHERE referrer_id = ref_id
      AND created_at > NOW() - INTERVAL '5 minutes';
    IF v_recent_referrals > 0 THEN
      RAISE EXCEPTION 'Aguarde 5 minutos entre indicações. Limite anti-fraude ativo.'
        USING ERRCODE = 'check_violation';
    END IF;

    -- Rate-limit diário (10/dia)
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

  IF ref_id IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, level, commission_rate, status)
    VALUES (ref_id, NEW.id, 1, 0.30, 'pending')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Atualiza ensure_user_setup com mesmas proteções
CREATE OR REPLACE FUNCTION public.ensure_user_setup(
  name_input TEXT DEFAULT NULL,
  email_input TEXT DEFAULT NULL,
  avatar_url_input TEXT DEFAULT NULL,
  referrer_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  existing_profile UUID;
  free_plan_id UUID;
  existing_plan UUID;
  existing_referral UUID;
  v_today_referrals INTEGER;
  v_recent_referrals INTEGER;
  v_new_name TEXT;
  v_blocked_count INTEGER;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_new_name := TRIM(COALESCE(name_input, ''));

  -- Detector email suspeito (apenas em criação)
  SELECT id INTO existing_profile FROM public.profiles WHERE user_id = caller_id;
  IF existing_profile IS NULL AND email_input IS NOT NULL AND public.is_suspicious_email(email_input) THEN
    RAISE EXCEPTION 'Cadastro bloqueado: padrão de email suspeito detectado. Use um email pessoal real.'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Bloqueio por nome
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
    VALUES (caller_id, v_new_name, COALESCE(email_input, ''), COALESCE(avatar_url_input, ''), referrer_id);
  ELSE
    IF referrer_id IS NOT NULL THEN
      UPDATE public.profiles SET referred_by = referrer_id
      WHERE user_id = caller_id AND referred_by IS NULL;
    END IF;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (caller_id, 'user') ON CONFLICT DO NOTHING;

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
      -- Cooldown 5 min
      SELECT COUNT(*) INTO v_recent_referrals
      FROM public.referrals
      WHERE referrer_id = ensure_user_setup.referrer_id
        AND created_at > NOW() - INTERVAL '5 minutes';
      IF v_recent_referrals > 0 THEN
        RAISE EXCEPTION 'Aguarde 5 minutos entre indicações. Limite anti-fraude ativo.'
          USING ERRCODE = 'check_violation';
      END IF;

      -- Rate-limit diário
      SELECT COUNT(*) INTO v_today_referrals
      FROM public.referrals
      WHERE referrer_id = ensure_user_setup.referrer_id
        AND DATE(created_at) = CURRENT_DATE;
      IF v_today_referrals >= 10 THEN
        RAISE EXCEPTION 'Limite diário de indicações atingido para este referrer (10 por dia).'
          USING ERRCODE = 'check_violation';
      END IF;

      INSERT INTO public.referrals (referrer_id, referred_id, level, commission_rate, status)
      VALUES (referrer_id, caller_id, 1, 0.30, 'pending')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END;
$$;
