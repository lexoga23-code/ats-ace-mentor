-- Add analysis_mode to user_analyses
ALTER TABLE public.user_analyses
  ADD COLUMN IF NOT EXISTS analysis_mode TEXT NOT NULL DEFAULT 'targeted';

ALTER TABLE public.user_analyses
  DROP CONSTRAINT IF EXISTS user_analyses_analysis_mode_check;

ALTER TABLE public.user_analyses
  ADD CONSTRAINT user_analyses_analysis_mode_check
  CHECK (analysis_mode IN ('targeted', 'general'));

-- Add analysis_mode to shared_reports
ALTER TABLE public.shared_reports
  ADD COLUMN IF NOT EXISTS analysis_mode TEXT NOT NULL DEFAULT 'targeted';

ALTER TABLE public.shared_reports
  DROP CONSTRAINT IF EXISTS shared_reports_analysis_mode_check;

ALTER TABLE public.shared_reports
  ADD CONSTRAINT shared_reports_analysis_mode_check
  CHECK (analysis_mode IN ('targeted', 'general'));