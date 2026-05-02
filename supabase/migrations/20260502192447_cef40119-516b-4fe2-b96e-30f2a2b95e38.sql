
-- =======================================================
-- 1. CLICKS: server-side earned_value + duplicate guard
-- =======================================================
DROP POLICY IF EXISTS "Users can insert their own clicks" ON public.clicks;

CREATE POLICY "Users can insert their own clicks"
ON public.clicks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_click_earned_value()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward NUMERIC;
  v_click_value NUMERIC;
  v_ad_active BOOLEAN;
BEGIN
  -- Force user_id = auth.uid() (defence in depth)
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = 'check_violation';
  END IF;
  NEW.user_id := auth.uid();

  -- Validate ad exists and is active
  SELECT reward_value, is_active INTO v_reward, v_ad_active
  FROM public.ads WHERE id = NEW.ad_id;
  IF v_ad_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Anúncio inválido ou inativo.' USING ERRCODE = 'check_violation';
  END IF;

  IF v_reward IS NULL THEN
    SELECT pl.click_value INTO v_click_value
    FROM public.user_plans up
    JOIN public.plans pl ON pl.id = up.plan_id
    WHERE up.user_id = NEW.user_id AND up.is_active = true
    ORDER BY up.started_at DESC LIMIT 1;
    v_reward := COALESCE(v_click_value, 0);
  END IF;

  NEW.earned_value := v_reward;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_click_earned_value ON public.clicks;
CREATE TRIGGER trg_set_click_earned_value
BEFORE INSERT ON public.clicks
FOR EACH ROW EXECUTE FUNCTION public.set_click_earned_value();

DROP TRIGGER IF EXISTS trg_enforce_click_limits ON public.clicks;
CREATE TRIGGER trg_enforce_click_limits
BEFORE INSERT ON public.clicks
FOR EACH ROW EXECUTE FUNCTION public.enforce_click_limits();

DROP TRIGGER IF EXISTS trg_confirm_referral_bonus ON public.clicks;
CREATE TRIGGER trg_confirm_referral_bonus
AFTER INSERT ON public.clicks
FOR EACH ROW EXECUTE FUNCTION public.confirm_referral_bonus();

-- =======================================================
-- 2. USER_PLANS: only free plan self-assign; paid via admin/approved payment
-- =======================================================
DROP POLICY IF EXISTS "Users can insert their own plans" ON public.user_plans;

CREATE POLICY "Users can self-assign free plan only"
ON public.user_plans
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.plans p
    WHERE p.id = plan_id AND p.price = 0 AND p.is_active = true
  )
);

-- =======================================================
-- 3. REFERRALS: drop public INSERT; only via SECURITY DEFINER funcs / admin
-- =======================================================
DROP POLICY IF EXISTS "Authenticated users can insert referrals for themselves" ON public.referrals;

CREATE POLICY "Admins can insert referrals"
ON public.referrals
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- =======================================================
-- 4. WITHDRAWALS: server-side balance & duplicate-pending check
-- =======================================================
CREATE OR REPLACE FUNCTION public.validate_withdrawal_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clicks NUMERIC;
  v_adj NUMERIC;
  v_paid_or_pending NUMERIC;
  v_balance NUMERIC;
  v_pending_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> NEW.user_id THEN
    -- allow admins to insert manually
    IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Não autorizado.' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_pending_count
  FROM public.withdrawals
  WHERE user_id = NEW.user_id AND status = 'pending';
  IF v_pending_count > 0 THEN
    RAISE EXCEPTION 'Você já possui um saque pendente. Aguarde o processamento.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT COALESCE(SUM(earned_value),0) INTO v_clicks FROM public.clicks WHERE user_id = NEW.user_id;
  SELECT COALESCE(SUM(amount),0) INTO v_adj FROM public.balance_adjustments WHERE user_id = NEW.user_id;
  SELECT COALESCE(SUM(amount),0) INTO v_paid_or_pending FROM public.withdrawals
    WHERE user_id = NEW.user_id AND status IN ('approved','pending');

  v_balance := v_clicks + v_adj - v_paid_or_pending;

  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Valor inválido.' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.amount > v_balance THEN
    RAISE EXCEPTION 'Valor solicitado (%) excede o saldo disponível (%).', NEW.amount, v_balance
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_withdrawal_amount ON public.withdrawals;
CREATE TRIGGER trg_validate_withdrawal_amount
BEFORE INSERT ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.validate_withdrawal_amount();

-- Re-attach existing CPF validator if missing
DROP TRIGGER IF EXISTS trg_validate_cpf_withdrawal ON public.withdrawals;
CREATE TRIGGER trg_validate_cpf_withdrawal
BEFORE INSERT ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.validate_cpf_for_withdrawal();

-- =======================================================
-- 5. PROFILES: stop exposing sensitive PII to referrers
-- =======================================================
DROP POLICY IF EXISTS "Referrers can view referred profiles" ON public.profiles;

CREATE OR REPLACE FUNCTION public.get_referred_basic_info(_referrer_id uuid)
RETURNS TABLE (user_id uuid, name text, email text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.name, p.email, p.avatar_url
  FROM public.profiles p
  JOIN public.referrals r ON r.referred_id = p.user_id
  WHERE r.referrer_id = _referrer_id
    AND auth.uid() = _referrer_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_referred_basic_info(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_referred_basic_info(uuid) TO authenticated;

-- =======================================================
-- 6. USER_ROLES: explicit admin-only write policies
-- =======================================================
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =======================================================
-- 7. Lock down internal helper functions from direct calls
-- =======================================================
REVOKE EXECUTE ON FUNCTION public.is_suspicious_email(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_referral_bonus() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_click_limits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_click_earned_value() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_withdrawal_amount() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_cpf_for_withdrawal() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_free_plan() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
