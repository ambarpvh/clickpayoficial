
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'referrals'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.referrals;
  END IF;
END;
$$;
