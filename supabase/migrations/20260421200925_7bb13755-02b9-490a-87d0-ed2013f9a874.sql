-- FASE 3F: Device fingerprint
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_device_fp ON public.profiles(device_fingerprint) WHERE device_fingerprint IS NOT NULL;

CREATE OR REPLACE FUNCTION public.register_device_fingerprint(fp_input TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  v_blocked_count INTEGER;
  v_total_with_fp INTEGER;
  v_current_fp TEXT;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL OR fp_input IS NULL OR fp_input = '' THEN
    RETURN;
  END IF;

  SELECT device_fingerprint INTO v_current_fp FROM public.profiles WHERE user_id = caller_id;
  IF v_current_fp IS NOT NULL AND v_current_fp <> '' THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_blocked_count
  FROM public.profiles
  WHERE is_blocked = true AND device_fingerprint = fp_input AND user_id <> caller_id;

  SELECT COUNT(*) INTO v_total_with_fp
  FROM public.profiles
  WHERE device_fingerprint = fp_input AND user_id <> caller_id;

  IF v_blocked_count > 0 OR v_total_with_fp >= 3 THEN
    UPDATE public.profiles
    SET device_fingerprint = fp_input,
        is_blocked = true,
        block_message = CASE
          WHEN v_blocked_count > 0 THEN 'Conta bloqueada automaticamente: dispositivo associado a conta suspensa.'
          ELSE 'Conta bloqueada automaticamente: dispositivo já possui múltiplas contas.'
        END
    WHERE user_id = caller_id;
  ELSE
    UPDATE public.profiles
    SET device_fingerprint = fp_input
    WHERE user_id = caller_id;
  END IF;
END;
$$;

-- FASE 3D: CPF único
UPDATE public.profiles SET cpf = NULL WHERE TRIM(COALESCE(cpf,'')) = '';
UPDATE public.profiles SET cpf = REGEXP_REPLACE(cpf, '[^0-9]', '', 'g') WHERE cpf IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_cpf_unique
  ON public.profiles(cpf) WHERE cpf IS NOT NULL AND cpf <> '';

CREATE OR REPLACE FUNCTION public.validate_cpf_for_withdrawal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cpf TEXT;
  v_dup_count INTEGER;
BEGIN
  SELECT cpf INTO v_cpf FROM public.profiles WHERE user_id = NEW.user_id;

  IF v_cpf IS NULL OR LENGTH(REGEXP_REPLACE(v_cpf, '[^0-9]', '', 'g')) <> 11 THEN
    RAISE EXCEPTION 'CPF inválido ou não preenchido. Atualize seu cadastro antes de solicitar saque.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT COUNT(*) INTO v_dup_count
  FROM public.profiles
  WHERE cpf = REGEXP_REPLACE(v_cpf, '[^0-9]', '', 'g')
    AND user_id <> NEW.user_id;

  IF v_dup_count > 0 THEN
    RAISE EXCEPTION 'CPF já utilizado em outra conta. Saque bloqueado.'
      USING ERRCODE = 'check_violation';
  END IF;

  NEW.cpf := REGEXP_REPLACE(v_cpf, '[^0-9]', '', 'g');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_cpf_withdrawal ON public.withdrawals;
CREATE TRIGGER trg_validate_cpf_withdrawal
BEFORE INSERT ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.validate_cpf_for_withdrawal();

-- Recria view (DROP + CREATE para mudar colunas)
DROP FUNCTION IF EXISTS public.get_suspicious_accounts();
DROP VIEW IF EXISTS public.suspicious_accounts;

CREATE VIEW public.suspicious_accounts
WITH (security_invoker = true)
AS
WITH duplicate_names AS (
  SELECT LOWER(TRIM(name)) AS norm_name
  FROM public.profiles
  WHERE TRIM(COALESCE(name,'')) <> ''
  GROUP BY LOWER(TRIM(name))
  HAVING COUNT(*) > 1
),
high_referrers AS (
  SELECT referrer_id, COUNT(*) AS recent_referrals
  FROM public.referrals
  WHERE created_at >= now() - INTERVAL '24 hours'
  GROUP BY referrer_id
  HAVING COUNT(*) > 5
),
shared_ips AS (
  SELECT signup_ip FROM public.profiles
  WHERE signup_ip IS NOT NULL AND signup_ip <> ''
  GROUP BY signup_ip HAVING COUNT(*) > 1
),
shared_fp AS (
  SELECT device_fingerprint FROM public.profiles
  WHERE device_fingerprint IS NOT NULL AND device_fingerprint <> ''
  GROUP BY device_fingerprint HAVING COUNT(*) > 1
)
SELECT
  p.user_id,
  p.name,
  p.email,
  p.is_blocked,
  p.signup_ip,
  p.device_fingerprint,
  p.created_at,
  CASE WHEN dn.norm_name IS NOT NULL THEN true ELSE false END AS has_duplicate_name,
  COALESCE(hr.recent_referrals, 0) AS referrals_last_24h,
  CASE WHEN si.signup_ip IS NOT NULL THEN true ELSE false END AS shares_ip,
  CASE WHEN sf.device_fingerprint IS NOT NULL THEN true ELSE false END AS shares_device,
  (
    CASE WHEN dn.norm_name IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN COALESCE(hr.recent_referrals,0) > 5 THEN 1 ELSE 0 END +
    CASE WHEN si.signup_ip IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN sf.device_fingerprint IS NOT NULL THEN 1 ELSE 0 END
  ) AS risk_score
FROM public.profiles p
LEFT JOIN duplicate_names dn ON LOWER(TRIM(p.name)) = dn.norm_name
LEFT JOIN high_referrers hr ON hr.referrer_id = p.user_id
LEFT JOIN shared_ips si ON si.signup_ip = p.signup_ip
LEFT JOIN shared_fp sf ON sf.device_fingerprint = p.device_fingerprint
WHERE
  dn.norm_name IS NOT NULL
  OR hr.referrer_id IS NOT NULL
  OR si.signup_ip IS NOT NULL
  OR sf.device_fingerprint IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_suspicious_accounts()
RETURNS SETOF public.suspicious_accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY SELECT * FROM public.suspicious_accounts ORDER BY risk_score DESC, created_at DESC;
END;
$$;