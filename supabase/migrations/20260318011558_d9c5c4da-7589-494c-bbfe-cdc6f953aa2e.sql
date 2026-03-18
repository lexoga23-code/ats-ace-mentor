CREATE TABLE public.shared_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  target_job text NOT NULL,
  score integer NOT NULL,
  match_score integer,
  results jsonb NOT NULL,
  rewritten_cv text,
  cover_letter text,
  email text
);

ALTER TABLE public.shared_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read shared reports by id"
ON public.shared_reports
FOR SELECT
TO public
USING (expires_at > now());

CREATE POLICY "Anyone can insert shared reports"
ON public.shared_reports
FOR INSERT
TO public
WITH CHECK (true);