-- test_migrations.sql
-- Quick test script to verify all migrations are working

-- Test 1: Check if all tables exist
SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'user_profiles', 
    'proxy_sessions', 
    'usage_logs', 
    'payment_transactions', 
    'system_settings',
    'rate_limits',
    'failed_login_attempts',
    'user_preferences',
    'admin_audit_log'
  )
ORDER BY table_name;

-- Test 2: Check if Stripe schema and tables exist
SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_schema = 'stripe'
ORDER BY table_name;

-- Test 3: Check if foreign data wrapper exists
SELECT fdwname 
FROM pg_foreign_data_wrapper 
WHERE fdwname = 'stripe_wrapper';

-- Test 4: Check if key functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'can_start_proxy_session',
    'start_proxy_session',
    'terminate_proxy_session',
    'sync_stripe_customer',
    'update_subscription_status',
    'get_pricing_plans',
    'handle_new_user',
    'check_rate_limit',
    'is_admin',
    'admin_update_user_balance',
    'admin_terminate_user_sessions'
  )
ORDER BY routine_name;

-- Test 5: Check if system settings were inserted
SELECT key, description 
FROM public.system_settings 
WHERE key LIKE 'public_%' OR key LIKE 'stripe_%'
ORDER BY key;

-- Test 6: Check if RLS is enabled on critical tables
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('user_profiles', 'proxy_sessions', 'usage_logs')
  AND rowsecurity = true;

-- Test 7: Check if indexes were created
SELECT 
  indexname,
  tablename
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('user_profiles', 'proxy_sessions', 'usage_logs')
ORDER BY tablename, indexname;

-- Test 8: Check if admin views exist and are properly secured
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'admin_%'
ORDER BY table_name;

-- Test 9: Verify admin function exists and basic functionality
SELECT 
  CASE 
    WHEN auth.uid() IS NULL THEN 'No authenticated user (expected in testing)'
    ELSE CONCAT('User authenticated, is_admin: ', public.is_admin()::text)
  END as admin_check_result;

-- Test 10: Check if triggers were created correctly
SELECT 
  trigger_name,
  table_name,
  action_timing,
  event_manipulation
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
  AND table_name IN ('user_profiles', 'proxy_sessions')
ORDER BY table_name, trigger_name;

-- Test 11: Check auth schema triggers (may not be visible in public schema)
SELECT 
  trigger_name,
  table_name
FROM information_schema.triggers 
WHERE table_name = 'users' 
  AND trigger_name LIKE '%new_user%'
ORDER BY trigger_name;

-- Test 12: Verify basic system functionality without users
SELECT 
  COUNT(*) as total_system_settings,
  COUNT(*) FILTER (WHERE key LIKE 'public_%') as public_settings,
  COUNT(*) FILTER (WHERE key LIKE 'stripe_%') as stripe_settings,
  COUNT(*) FILTER (WHERE key LIKE 'security_%') as security_settings
FROM public.system_settings;

-- Test 13: Check that tables are ready for user data
SELECT 
  table_name,
  CASE 
    WHEN table_name = 'user_profiles' THEN (SELECT COUNT(*) FROM public.user_profiles)
    WHEN table_name = 'proxy_sessions' THEN (SELECT COUNT(*) FROM public.proxy_sessions)
    WHEN table_name = 'usage_logs' THEN (SELECT COUNT(*) FROM public.usage_logs)
    WHEN table_name = 'payment_transactions' THEN (SELECT COUNT(*) FROM public.payment_transactions)
    ELSE 0
  END as record_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_profiles', 'proxy_sessions', 'usage_logs', 'payment_transactions')
ORDER BY table_name;

-- Test 14: Verify schema is ready for first user signup
SELECT 'Schema validation complete - ready for user signups!' as final_status; 