-- Ensure admin CRUD works for ads with explicit INSERT/UPDATE/DELETE policies
DROP POLICY IF EXISTS "Admins can manage ads" ON public.ads;

CREATE POLICY "Admins can view ads"
ON public.ads
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert ads"
ON public.ads
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update ads"
ON public.ads
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete ads"
ON public.ads
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));