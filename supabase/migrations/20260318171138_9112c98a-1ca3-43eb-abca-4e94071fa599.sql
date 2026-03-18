CREATE TABLE public.user_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cv_text TEXT NOT NULL,
  target_job TEXT NOT NULL,
  job_description TEXT DEFAULT '',
  industry TEXT DEFAULT '',
  results JSONB NOT NULL,
  rewritten_cv TEXT,
  cover_letter TEXT,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  score INTEGER NOT NULL DEFAULT 0,
  match_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own analyses" ON public.user_analyses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses" ON public.user_analyses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analyses" ON public.user_analyses
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);