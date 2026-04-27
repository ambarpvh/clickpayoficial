-- Create advertiser_leads table
CREATE TABLE public.advertiser_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  ad_link TEXT NOT NULL,
  ad_description TEXT,
  clicks_amount INTEGER NOT NULL,
  total_value NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.advertiser_leads ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a new advertiser lead (public form)
CREATE POLICY "Anyone can submit advertiser leads"
ON public.advertiser_leads
FOR INSERT
WITH CHECK (true);

-- Only admins can view advertiser leads
CREATE POLICY "Admins can view advertiser leads"
ON public.advertiser_leads
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update advertiser leads
CREATE POLICY "Admins can update advertiser leads"
ON public.advertiser_leads
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete advertiser leads
CREATE POLICY "Admins can delete advertiser leads"
ON public.advertiser_leads
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for timestamps
CREATE TRIGGER update_advertiser_leads_updated_at
BEFORE UPDATE ON public.advertiser_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups by status and date
CREATE INDEX idx_advertiser_leads_status ON public.advertiser_leads(status);
CREATE INDEX idx_advertiser_leads_created_at ON public.advertiser_leads(created_at DESC);