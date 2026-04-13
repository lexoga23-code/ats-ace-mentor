CREATE TABLE public.discovery_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NULL
);

ALTER TABLE public.discovery_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert discovery sources"
ON public.discovery_sources
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Only service role can read"
ON public.discovery_sources
FOR SELECT
TO service_role
USING (true);