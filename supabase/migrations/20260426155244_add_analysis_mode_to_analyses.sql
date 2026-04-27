-- Add analysis mode support for targeted and general CV analyses.
-- Safe for existing production data: existing rows default to targeted.

ALTER TABLE public.user_analyses
ADD COLUMN IF NOT EXISTS analysis_mode TEXT;

UPDATE public.user_analyses
SET analysis_mode = 'targeted'
WHERE analysis_mode IS NULL
   OR analysis_mode NOT IN ('targeted', 'general');

ALTER TABLE public.user_analyses
ALTER COLUMN analysis_mode SET DEFAULT 'targeted';

ALTER TABLE public.user_analyses
ALTER COLUMN analysis_mode SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_analyses_analysis_mode_check'
      AND conrelid = 'public.user_analyses'::regclass
  ) THEN
    ALTER TABLE public.user_analyses
    ADD CONSTRAINT user_analyses_analysis_mode_check
    CHECK (analysis_mode IN ('targeted', 'general'));
  END IF;
END $$;

ALTER TABLE public.shared_reports
ADD COLUMN IF NOT EXISTS analysis_mode TEXT;

UPDATE public.shared_reports
SET analysis_mode = 'targeted'
WHERE analysis_mode IS NULL
   OR analysis_mode NOT IN ('targeted', 'general');

ALTER TABLE public.shared_reports
ALTER COLUMN analysis_mode SET DEFAULT 'targeted';

ALTER TABLE public.shared_reports
ALTER COLUMN analysis_mode SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'shared_reports_analysis_mode_check'
      AND conrelid = 'public.shared_reports'::regclass
  ) THEN
    ALTER TABLE public.shared_reports
    ADD CONSTRAINT shared_reports_analysis_mode_check
    CHECK (analysis_mode IN ('targeted', 'general'));
  END IF;
END $$;
