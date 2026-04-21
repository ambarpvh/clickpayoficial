-- Add state (uf) column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS state TEXT;

-- Add comment explaining the field
COMMENT ON COLUMN public.profiles.state IS 'Brazilian state abbreviation (UF)';