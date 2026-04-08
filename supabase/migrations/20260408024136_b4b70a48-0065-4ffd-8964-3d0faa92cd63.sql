
ALTER TABLE public.withdrawals
  ADD COLUMN holder_name TEXT,
  ADD COLUMN cpf TEXT,
  ADD COLUMN pix_key TEXT,
  ADD COLUMN phone TEXT;
