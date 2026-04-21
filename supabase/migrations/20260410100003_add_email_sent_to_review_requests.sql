-- Add email_sent column to review_requests
ALTER TABLE public.review_requests
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;
