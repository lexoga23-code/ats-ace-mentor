-- Add cancel_at_period_end to track when subscription is scheduled for cancellation
ALTER TABLE public.user_subscriptions
ADD COLUMN cancel_at_period_end boolean NOT NULL DEFAULT false;
