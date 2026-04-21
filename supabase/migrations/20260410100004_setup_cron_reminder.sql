-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Note: The cron job must be configured via Supabase Dashboard > Database > Cron Jobs
-- Or via SQL after deployment with the actual values:
--
-- SELECT cron.schedule(
--   'reminder-j3',
--   '0 7 * * *',  -- 7:00 AM UTC = ~9:00 AM Paris
--   $$
--   SELECT net.http_post(
--     url := 'https://qzjpsgmxjuuqnpkwwayh.supabase.co/functions/v1/cron-reminder',
--     headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
--     body := '{}'::jsonb
--   );
--   $$
-- );
--
-- To list cron jobs: SELECT * FROM cron.job;
-- To delete a job: SELECT cron.unschedule('reminder-j3');
