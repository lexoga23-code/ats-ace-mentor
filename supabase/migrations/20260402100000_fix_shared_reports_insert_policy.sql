-- Faille #3: Restrict shared_reports INSERT to authenticated users only
-- Drop the permissive policy
DROP POLICY IF EXISTS "Anyone can insert shared reports" ON public.shared_reports;

-- Create a new policy requiring authentication
CREATE POLICY "Authenticated users can insert shared reports"
ON public.shared_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
