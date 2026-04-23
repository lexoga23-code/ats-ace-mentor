ALTER TABLE public.user_analyses ADD COLUMN IF NOT EXISTS edited_cv_data JSONB;

COMMENT ON COLUMN public.user_analyses.edited_cv_data IS 'Données CV éditées par l''utilisateur (format CVData JSON). NULL si pas d''édition.';