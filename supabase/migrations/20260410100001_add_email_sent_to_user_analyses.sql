-- Add email_sent column to user_analyses
ALTER TABLE public.user_analyses
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;
