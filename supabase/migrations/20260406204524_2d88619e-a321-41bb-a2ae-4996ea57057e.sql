
-- Fix foreign key to allow cascade delete
ALTER TABLE public.clicks DROP CONSTRAINT clicks_ad_id_fkey;
ALTER TABLE public.clicks ADD CONSTRAINT clicks_ad_id_fkey FOREIGN KEY (ad_id) REFERENCES public.ads(id) ON DELETE CASCADE;

-- Add open_link toggle to ads
ALTER TABLE public.ads ADD COLUMN open_link boolean NOT NULL DEFAULT true;
