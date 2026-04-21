-- Add email_sent column to user_subscriptions
ALTER TABLE public.user_subscriptions
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;
