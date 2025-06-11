-- supabase/seed.sql
-- Initial seed data for VPN PWA development and testing

-- Note: This file is executed after migrations
-- Use this for development/testing data only

-- Note: User profiles are automatically created when users sign up via the handle_new_user() trigger
-- For testing, create users through Supabase Auth dashboard first, then run this seed
-- Or uncomment the sample data insertion below if you have test users set up

-- DEVELOPMENT ONLY: Create test user profiles for existing auth users
-- Uncomment this section ONLY if you have created the corresponding users in Supabase Auth dashboard

/*
-- Insert admin user profile (create user admin@yourdomain.com in Auth dashboard first)
INSERT INTO public.user_profiles (
  id,
  email,
  full_name,
  is_admin,
  time_balance_minutes,
  subscription_status,
  subscription_tier,
  max_concurrent_sessions
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'admin@yourdomain.com',
  'System Administrator',
  true,
  9999,
  'active',
  'enterprise',
  10
) ON CONFLICT (id) DO UPDATE SET
  is_admin = EXCLUDED.is_admin,
  subscription_status = EXCLUDED.subscription_status,
  subscription_tier = EXCLUDED.subscription_tier;

-- Insert test user profile (create user user@example.com in Auth dashboard first)
INSERT INTO public.user_profiles (
  id,
  email,
  full_name,
  is_admin,
  time_balance_minutes,
  subscription_status,
  subscription_tier,
  max_concurrent_sessions
) VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  'user@example.com',
  'Test User',
  false,
  60,
  'free',
  'basic',
  1
) ON CONFLICT (id) DO UPDATE SET
  subscription_status = EXCLUDED.subscription_status,
  subscription_tier = EXCLUDED.subscription_tier;
*/

-- Insert development system settings
INSERT INTO public.system_settings (key, value, description) VALUES
  ('dev_mode_enabled', 'true', 'Enable development mode features'),
  ('maintenance_mode', 'false', 'Enable maintenance mode (blocks user access)'),
  ('welcome_message', '"Welcome to VPN PWA - Your secure browsing companion"', 'Message shown to new users'),
  ('support_email', '"support@yourdomain.com"', 'Support contact email'),
  ('app_version', '"1.0.0-beta"', 'Current application version'),
  ('proxy_server_url', '"https://proxy.yourdomain.com"', 'Default proxy server URL'),
  ('max_daily_sessions_free', '5', 'Maximum daily sessions for free users'),
  ('max_daily_sessions_premium', '50', 'Maximum daily sessions for premium users'),
  ('session_warning_threshold_minutes', '10', 'Minutes before session expires to show warning'),
  ('auto_cleanup_enabled', 'true', 'Enable automatic cleanup of old data')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description;

-- Insert sample proxy session for testing (only if admin user exists)
-- Uncomment if you have test users set up
/*
INSERT INTO public.proxy_sessions (
  id,
  user_id,
  target_domain,
  session_url,
  status,
  started_at,
  last_activity_at,
  bytes_transferred,
  requests_count,
  user_agent,
  metadata
) VALUES (
  '10000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'example.com',
  'https://proxy.yourdomain.com/session/10000000-0000-0000-0000-000000000001/example.com',
  'terminated',
  now() - interval '2 hours',
  now() - interval '1 hour',
  1048576, -- 1MB
  25,
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  '{"termination_reason": "user_requested", "duration_minutes": 60}'::jsonb
) ON CONFLICT (id) DO NOTHING;
*/

-- Insert sample usage logs (only if test users exist)
-- Uncomment if you have test users set up
/*
INSERT INTO public.usage_logs (
  user_id,
  session_id,
  event_type,
  target_url,
  bytes_transferred,
  response_time_ms,
  status_code,
  metadata
) VALUES 
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    'session_start',
    'example.com',
    0,
    null,
    null,
    '{"user_agent": "Test Browser", "client_ip": "127.0.0.1"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    'page_request',
    'https://example.com/',
    52428, -- 50KB
    245,
    200,
    '{"timestamp": "2024-01-01T12:00:00Z"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    'session_end',
    null,
    1048576, -- 1MB total
    null,
    null,
    '{"duration_minutes": 60, "bytes_transferred": 1048576, "termination_reason": "user_requested"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000002'::uuid,
    null,
    'user_registration',
    null,
    0,
    null,
    null,
    '{"email": "user@example.com", "welcome_bonus_minutes": 30, "signup_method": "email"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;
*/

-- Insert sample payment transaction (only if test users exist)
-- Uncomment if you have test users set up
/*
INSERT INTO public.payment_transactions (
  id,
  user_id,
  stripe_payment_intent_id,
  amount_cents,
  currency,
  status,
  time_minutes_purchased,
  description
) VALUES (
  '20000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid,
  'pi_test_1234567890',
  500, -- $5.00
  'usd',
  'succeeded',
  60, -- 1 hour
  'Purchase of 1 hour VPN time'
) ON CONFLICT (id) DO NOTHING;

-- Insert user preferences for test users
INSERT INTO public.user_preferences (
  user_id,
  preferences,
  notifications_enabled,
  email_notifications,
  browser_notifications,
  theme,
  language,
  timezone
) VALUES 
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    '{"dashboard_layout": "advanced", "show_bandwidth_chart": true}'::jsonb,
    true,
    true,
    false,
    'dark',
    'en',
    'UTC'
  ),
  (
    '00000000-0000-0000-0000-000000000002'::uuid,
    '{"dashboard_layout": "simple", "show_tips": true}'::jsonb,
    true,
    false,
    true,
    'light',
    'en',
    'America/New_York'
  )
ON CONFLICT (user_id) DO UPDATE SET
  preferences = EXCLUDED.preferences,
  theme = EXCLUDED.theme;

-- Insert sample rate limiting data (for testing)
INSERT INTO public.rate_limits (
  user_id,
  ip_address,
  endpoint,
  request_count,
  window_start
) VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  '127.0.0.1'::inet,
  'start_session',
  3,
  date_trunc('hour', now())
) ON CONFLICT (user_id, ip_address, endpoint, window_start) DO UPDATE SET
  request_count = EXCLUDED.request_count;

-- Insert sample admin audit log
INSERT INTO public.admin_audit_log (
  admin_id,
  action,
  target_user_id,
  details,
  ip_address,
  user_agent
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'user_balance_update',
  '00000000-0000-0000-0000-000000000002'::uuid,
  '{"old_balance": 30, "new_balance": 90, "note": "Initial development credit"}'::jsonb,
  '127.0.0.1'::inet,
  'Mozilla/5.0 (Admin Console)'
) ON CONFLICT (id) DO NOTHING;

-- Update user profiles with the total bytes used
UPDATE public.user_profiles 
SET total_bytes_used = (
  SELECT COALESCE(SUM(bytes_transferred), 0)
  FROM public.proxy_sessions 
  WHERE proxy_sessions.user_id = user_profiles.id
)
WHERE id IN (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid
);
*/

-- Development notes and reminders
SELECT 'Basic seed data loaded successfully!' as message;
SELECT 'System settings and configuration have been loaded.' as status;
SELECT 'To add test users: Create users in Supabase Auth dashboard, then uncomment sample data sections above.' as note;
SELECT 'Recommended test users: admin@yourdomain.com (set is_admin=true) and user@example.com' as suggestion; 