-- =========================
-- FASE 2B: IP tracking + bloqueio cruzado
-- =========================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signup_ip TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_signup_ip ON public.profiles(signup_ip) WHERE signup_ip IS NOT NULL;

-- Função chamada pelo frontend após login para registrar IP
CREATE OR REPLACE FUNCTION public.register_signup_ip(ip_input TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_id UUID;
  v_blocked_count INTEGER;
  v_current_ip TEXT;
BEGIN
  caller_id := auth.uid();
  IF caller_id IS NULL OR ip_input IS NULL OR ip_input = '' THEN
    RETURN;
  END IF;

  -- Só grava se ainda não tem IP registrado
  SELECT signup_ip INTO v_current_ip FROM public.profiles WHERE user_id = caller_id;
  IF v_current_ip IS NOT NULL AND v_current_ip <> '' THEN
    RETURN;
  END IF;

  -- Bloqueio cruzado: se IP já tem conta bloqueada, bloqueia esta também
  SELECT COUNT(*) INTO v_blocked_count
  FROM public.profiles
  WHERE is_blocked = true AND signup_ip = ip_input AND user_id <> caller_id;

  IF v_blocked_count > 0 THEN
    UPDATE public.profiles
    SET signup_ip = ip_input,
        is_blocked = true,
        block_message = 'Conta bloqueada automaticamente: IP associado a conta suspensa.'
    WHERE user_id = caller_id;
  ELSE
    UPDATE public.profiles
    SET signup_ip = ip_input
    WHERE user_id = caller_id;
  END IF;
END;
$$;

-- =========================
-- FASE 2G: View Contas Suspeitas
-- =========================

CREATE OR REPLACE VIEW public.suspicious_accounts AS
WITH duplicate_names AS (
  SELECT LOWER(TRIM(name)) AS norm_name, COUNT(*) AS cnt
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
  SELECT signup_ip
  FROM public.profiles
  WHERE signup_ip IS NOT NULL AND signup_ip <> ''
  GROUP BY signup_ip
  HAVING COUNT(*) > 1
)
SELECT
  p.user_id,
  p.name,
  p.email,
  p.is_blocked,
  p.signup_ip,
  p.created_at,
  CASE WHEN dn.norm_name IS NOT NULL THEN true ELSE false END AS has_duplicate_name,
  COALESCE(hr.recent_referrals, 0) AS referrals_last_24h,
  CASE WHEN si.signup_ip IS NOT NULL THEN true ELSE false END AS shares_ip,
  (
    CASE WHEN dn.norm_name IS NOT NULL THEN 1 ELSE 0 END +
    CASE WHEN COALESCE(hr.recent_referrals,0) > 5 THEN 1 ELSE 0 END +
    CASE WHEN si.signup_ip IS NOT NULL THEN 1 ELSE 0 END
  ) AS risk_score
FROM public.profiles p
LEFT JOIN duplicate_names dn ON LOWER(TRIM(p.name)) = dn.norm_name
LEFT JOIN high_referrers hr ON hr.referrer_id = p.user_id
LEFT JOIN shared_ips si ON si.signup_ip = p.signup_ip
WHERE
  dn.norm_name IS NOT NULL
  OR hr.referrer_id IS NOT NULL
  OR si.signup_ip IS NOT NULL;

-- Permissões: apenas admins
REVOKE ALL ON public.suspicious_accounts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.suspicious_accounts TO authenticated;

-- RLS-like guard via função wrapper (views não têm RLS, mas podemos usar policy via security barrier)
ALTER VIEW public.suspicious_accounts SET (security_invoker = true);

-- Como a view depende de profiles (que tem RLS), só admins (que têm policy de ver tudo)
-- conseguirão linhas além das próprias. Para reforçar, criamos função:
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