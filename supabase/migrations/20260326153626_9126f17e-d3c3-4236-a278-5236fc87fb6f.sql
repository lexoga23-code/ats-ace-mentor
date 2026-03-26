-- Bug #27: Allow users to delete their own analyses
CREATE POLICY "Users can delete own analyses"
ON public.user_analyses
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Bug #18: Create review_requests table for fallback
CREATE TABLE IF NOT EXISTS public.review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  user_name text,
  analysis_id uuid,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own review requests"
ON public.review_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own review requests"
ON public.review_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Bug #28: Add foreign key on user_analyses.user_id
ALTER TABLE public.user_analyses
ADD CONSTRAINT fk_user_analyses_user_id
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;