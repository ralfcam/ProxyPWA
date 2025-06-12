-- =====================================================================
-- VPN PWA Consolidated Database Schema
-- =====================================================================
-- This migration consolidates all database objects into a single coherent schema
-- Last updated: 2024-01-01

-- =====================================================================
-- EXTENSIONS
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS wrappers WITH SCHEMA extensions;

-- =====================================================================
-- CORE TABLES
-- =====================================================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT false,
  time_balance_minutes INTEGER DEFAULT 60, -- Default 60 minutes for development
  subscription_status TEXT CHECK (subscription_status IN ('free', 'active', 'cancelled', 'past_due')) DEFAULT 'free',
  subscription_tier TEXT CHECK (subscription_tier IN ('basic', 'premium', 'enterprise')) DEFAULT 'basic',
  stripe_customer_id TEXT UNIQUE,
  max_concurrent_sessions INTEGER DEFAULT 1,
  total_bytes_used BIGINT DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Proxy sessions
CREATE TABLE public.proxy_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_domain TEXT NOT NULL,
  session_url TEXT NOT NULL,
  proxy_server TEXT,
  status TEXT CHECK (status IN ('active', 'expired', 'terminated', 'error', 'archived')) DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  bytes_transferred BIGINT DEFAULT 0,
  requests_count INTEGER DEFAULT 0,
  user_agent TEXT,
  client_ip INET,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Usage analytics
CREATE TABLE public.usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES proxy_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  target_url TEXT,
  bytes_transferred BIGINT DEFAULT 0,
  response_time_ms INTEGER,
  status_code INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payment transactions
CREATE TABLE public.payment_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')) DEFAULT 'pending',
  time_minutes_purchased INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- System settings
CREATE TABLE public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Rate limiting
CREATE TABLE public.rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address INET,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================================
-- INDEXES
-- =====================================================================
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX idx_user_profiles_stripe_customer ON public.user_profiles(stripe_customer_id);
CREATE INDEX idx_user_profiles_subscription_status ON public.user_profiles(subscription_status);
CREATE INDEX idx_proxy_sessions_user_id ON public.proxy_sessions(user_id);
CREATE INDEX idx_proxy_sessions_status ON public.proxy_sessions(status);
CREATE INDEX idx_proxy_sessions_started_at ON public.proxy_sessions(started_at);
CREATE INDEX idx_proxy_sessions_active ON public.proxy_sessions(user_id, status) WHERE status = 'active';
CREATE INDEX idx_proxy_sessions_user_status ON public.proxy_sessions(user_id, status) WHERE status = 'active';
CREATE INDEX idx_proxy_sessions_idle ON public.proxy_sessions(last_activity_at) WHERE status = 'active';
CREATE INDEX idx_proxy_sessions_cleanup ON public.proxy_sessions(ended_at, status) WHERE status IN ('terminated', 'expired', 'error');
CREATE INDEX idx_proxy_sessions_stale_cleanup ON public.proxy_sessions(status, last_activity_at) WHERE status = 'active';
CREATE INDEX idx_usage_logs_user_id ON public.usage_logs(user_id);
CREATE INDEX idx_usage_logs_session_id ON public.usage_logs(session_id);
CREATE INDEX idx_usage_logs_event_type ON public.usage_logs(event_type);
CREATE INDEX idx_usage_logs_created_at ON public.usage_logs(created_at);
CREATE INDEX idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_stripe_id ON public.payment_transactions(stripe_payment_intent_id);
CREATE INDEX idx_rate_limits_user_endpoint ON public.rate_limits(user_id, endpoint, window_start);
CREATE INDEX idx_rate_limits_ip_endpoint ON public.rate_limits(ip_address, endpoint, window_start);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proxy_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- User Profiles RLS Policies (Fixed to avoid infinite recursion)
CREATE POLICY "Users can view own profile" ON user_profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles 
  FOR UPDATE USING (auth.uid() = id);

-- Admin check without recursion - using a function with security definer
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  admin_status BOOLEAN;
BEGIN
  SELECT is_admin INTO admin_status
  FROM public.user_profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(admin_status, false);
END;
$$;

CREATE POLICY "Admins can view all profiles" ON user_profiles 
  FOR SELECT USING (public.is_admin());

-- Proxy Sessions RLS Policies
CREATE POLICY "Users can view own sessions" ON proxy_sessions 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON proxy_sessions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON proxy_sessions 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions" ON proxy_sessions
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update any session" ON proxy_sessions
  FOR UPDATE USING (public.is_admin());

-- Usage Logs RLS Policies
CREATE POLICY "Users can view own usage logs" ON usage_logs 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage logs" ON usage_logs 
  FOR INSERT WITH CHECK (true);

-- Payment Transactions RLS Policies
CREATE POLICY "Users can view own transactions" ON payment_transactions 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage transactions" ON payment_transactions 
  FOR ALL USING (true);

-- System Settings RLS Policies
CREATE POLICY "Admins can manage settings" ON system_settings 
  FOR ALL USING (public.is_admin());

CREATE POLICY "Users can read public settings" ON system_settings 
  FOR SELECT USING (key LIKE 'public_%');

-- Rate Limits RLS Policies
CREATE POLICY "Users can view own rate limits" ON rate_limits 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage rate limits" ON rate_limits 
  FOR ALL USING (true);

-- =====================================================================
-- TRIGGER FUNCTIONS
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER trigger_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    time_balance_minutes
  )
  VALUES (
    NEW.id,
    NEW.email,
    60  -- Give 60 minutes for development testing
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- CORE FUNCTIONS
-- =====================================================================

-- Check if user can start proxy session
CREATE OR REPLACE FUNCTION public.can_start_proxy_session()
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_record RECORD;
  active_sessions INTEGER;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT 
    time_balance_minutes,
    max_concurrent_sessions,
    subscription_status
  INTO user_record
  FROM public.user_profiles
  WHERE id = current_user_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  IF user_record.time_balance_minutes <= 0 THEN
    RETURN false;
  END IF;
  
  SELECT COUNT(*) INTO active_sessions
  FROM public.proxy_sessions
  WHERE user_id = current_user_id AND status = 'active';
  
  IF active_sessions >= user_record.max_concurrent_sessions THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Start proxy session
CREATE OR REPLACE FUNCTION public.start_proxy_session(
  target_domain TEXT
)
RETURNS RECORD 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  session_id UUID;
  session_url TEXT;
  current_user_id UUID;
  result RECORD;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF NOT public.can_start_proxy_session() THEN
    RAISE EXCEPTION 'Cannot start proxy session: insufficient balance or session limit reached';
  END IF;
  
  session_id := gen_random_uuid();
  session_url := format('proxy-session://%s/%s', session_id, target_domain);
  
  INSERT INTO public.proxy_sessions (
    id,
    user_id,
    target_domain,
    session_url,
    status,
    started_at,
    last_activity_at
  ) VALUES (
    session_id,
    current_user_id,
    target_domain,
    session_url,
    'active',
    now(),
    now()
  );
  
  INSERT INTO public.usage_logs (
    user_id,
    session_id,
    event_type,
    target_url,
    metadata
  ) VALUES (
    current_user_id,
    session_id,
    'session_start',
    target_domain,
    jsonb_build_object(
      'timestamp', now(),
      'user_agent', current_setting('request.headers', true)::json->>'user-agent'
    )
  );
  
  SELECT session_id AS session_id, session_url AS session_url INTO result;
  RETURN result;
END;
$$;

-- Terminate proxy session (with reasonable balance deduction for development)
CREATE OR REPLACE FUNCTION public.terminate_proxy_session(
  session_id UUID
)
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  session_record RECORD;
  duration_minutes INTEGER;
  current_user_id UUID;
  deduction_minutes INTEGER;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT *
  INTO session_record
  FROM public.proxy_sessions
  WHERE id = session_id
    AND user_id = current_user_id
    AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  duration_minutes := GREATEST(1, CEIL(extract(epoch from (now() - session_record.started_at)) / 60));
  -- For development: limit deduction to maximum 10 minutes per session
  deduction_minutes := LEAST(duration_minutes, 10);
  
  UPDATE public.proxy_sessions
  SET 
    status = 'terminated',
    ended_at = now(),
    metadata = metadata || jsonb_build_object(
      'termination_reason', 'user_requested',
      'duration_minutes', duration_minutes,
      'deduction_minutes', deduction_minutes
    )
  WHERE id = session_id;
  
  UPDATE public.user_profiles
  SET 
    time_balance_minutes = GREATEST(0, time_balance_minutes - deduction_minutes),
    total_bytes_used = total_bytes_used + session_record.bytes_transferred,
    last_activity_at = now()
  WHERE id = current_user_id;
  
  INSERT INTO public.usage_logs (
    user_id,
    session_id,
    event_type,
    metadata
  ) VALUES (
    current_user_id,
    session_id,
    'session_end',
    jsonb_build_object(
      'duration_minutes', duration_minutes,
      'deduction_minutes', deduction_minutes,
      'bytes_transferred', session_record.bytes_transferred,
      'termination_reason', 'user_requested'
    )
  );
  
  RETURN true;
END;
$$;

-- Clean up stale sessions
CREATE OR REPLACE FUNCTION public.cleanup_stale_sessions()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.proxy_sessions
  SET 
    status = 'expired',
    ended_at = now(),
    error_message = 'Session expired due to inactivity'
  WHERE 
    status = 'active'
    AND last_activity_at < now() - interval '10 minutes';
END;
$$;

-- Get user session statistics
CREATE OR REPLACE FUNCTION public.get_user_session_stats(
  user_uuid UUID,
  days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
  total_sessions BIGINT,
  total_minutes NUMERIC,
  total_bytes BIGINT,
  total_requests BIGINT,
  avg_session_duration NUMERIC,
  top_domains JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH session_stats AS (
    SELECT 
      COUNT(*) AS session_count,
      SUM(EXTRACT(epoch FROM (COALESCE(ended_at, now()) - started_at))/60) AS total_minutes,
      SUM(bytes_transferred) AS bytes_total,
      SUM(requests_count) AS total_requests,
      AVG(EXTRACT(epoch FROM (COALESCE(ended_at, now()) - started_at))/60) AS avg_duration
    FROM public.proxy_sessions
    WHERE user_id = user_uuid
      AND started_at >= now() - (days_back || ' days')::interval
  ),
  domain_stats AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'domain', target_domain,
        'sessions', session_count,
        'bytes', domain_bytes
      ) ORDER BY session_count DESC
    ) AS domains
    FROM (
      SELECT 
        target_domain,
        COUNT(*) AS session_count,
        SUM(bytes_transferred) AS domain_bytes
      FROM public.proxy_sessions
      WHERE user_id = user_uuid
        AND started_at >= now() - (days_back || ' days')::interval
      GROUP BY target_domain
      LIMIT 10
    ) d
  )
  SELECT 
    ss.session_count AS total_sessions,
    ss.total_minutes,
    ss.bytes_total AS total_bytes,
    ss.total_requests,
    ss.avg_duration AS avg_session_duration,
    ds.domains AS top_domains
  FROM session_stats ss
  CROSS JOIN domain_stats ds;
END;
$$;

-- =====================================================================
-- STRIPE INTEGRATION
-- =====================================================================
CREATE FOREIGN DATA WRAPPER stripe_wrapper
  HANDLER stripe_fdw_handler
  VALIDATOR stripe_fdw_validator;

CREATE SERVER stripe_server
  FOREIGN DATA WRAPPER stripe_wrapper
  OPTIONS (
    api_key '{{ STRIPE_SECRET_KEY }}',
    api_url 'https://api.stripe.com/v1/',
    api_version '2024-06-20'
  );

CREATE SCHEMA IF NOT EXISTS stripe;
GRANT USAGE ON SCHEMA stripe TO authenticated, service_role;

-- Stripe foreign tables
CREATE FOREIGN TABLE stripe.customers (
  id TEXT,
  email TEXT,
  name TEXT,
  phone TEXT,
  created TIMESTAMP,
  attrs JSONB
)
SERVER stripe_server
OPTIONS (
  object 'customers',
  rowid_column 'id'
);

CREATE FOREIGN TABLE stripe.subscriptions (
  id TEXT,
  customer TEXT,
  status TEXT,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  created TIMESTAMP,
  attrs JSONB
)
SERVER stripe_server
OPTIONS (
  object 'subscriptions',
  rowid_column 'id'
);

CREATE FOREIGN TABLE stripe.products (
  id TEXT,
  name TEXT,
  description TEXT,
  active BOOLEAN,
  created TIMESTAMP,
  updated TIMESTAMP,
  attrs JSONB
)
SERVER stripe_server
OPTIONS (
  object 'products',
  rowid_column 'id'
);

CREATE FOREIGN TABLE stripe.prices (
  id TEXT,
  product TEXT,
  active BOOLEAN,
  currency TEXT,
  unit_amount BIGINT,
  recurring JSONB,
  created TIMESTAMP,
  attrs JSONB
)
SERVER stripe_server
OPTIONS (
  object 'prices',
  rowid_column 'id'
);

GRANT SELECT ON ALL TABLES IN SCHEMA stripe TO authenticated, service_role;

-- =====================================================================
-- VIEWS
-- =====================================================================
CREATE VIEW public.active_proxy_sessions AS
SELECT 
  ps.id,
  ps.user_id,
  up.email AS user_email,
  up.full_name AS user_name,
  ps.target_domain,
  ps.started_at,
  ps.last_activity_at,
  ps.bytes_transferred,
  ps.requests_count,
  EXTRACT(epoch FROM (now() - ps.started_at))/60 AS duration_minutes,
  EXTRACT(epoch FROM (now() - ps.last_activity_at))/60 AS idle_minutes,
  CASE 
    WHEN EXTRACT(epoch FROM (now() - ps.last_activity_at)) > 600 THEN true
    ELSE false
  END AS is_idle
FROM public.proxy_sessions ps
JOIN public.user_profiles up ON ps.user_id = up.id
WHERE ps.status = 'active'
  AND ps.user_id = auth.uid()
ORDER BY ps.last_activity_at DESC;

GRANT SELECT ON public.active_proxy_sessions TO authenticated;

-- =====================================================================
-- PERMISSIONS
-- =====================================================================
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_start_proxy_session() TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_proxy_session(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.terminate_proxy_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_session_stats(UUID, INTEGER) TO authenticated;

-- =====================================================================
-- DEFAULT SETTINGS
-- =====================================================================
INSERT INTO public.system_settings (key, value, description) VALUES
  ('proxy_base_url', '"/functions/v1/proxy-service"', 'Proxy service Edge Function endpoint'),
  ('dev_mode_enabled', 'true', 'Enable development mode features'),
  ('dev_mode_time_balance_minutes', '60', 'Default time balance for development'),
  ('public_max_session_duration_hours', '24', 'Maximum session duration in hours'),
  ('public_max_idle_minutes', '10', 'Session timeout after inactivity'),
  ('public_pricing_basic_cents', '500', 'Basic plan price in cents ($5.00)'),
  ('public_pricing_premium_cents', '1000', 'Premium plan price in cents ($10.00)'),
  ('public_time_per_dollar_minutes', '60', 'Minutes of access per dollar spent'),
  ('stripe_tracked_events', '["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted", "payment_intent.succeeded", "payment_intent.payment_failed", "invoice.payment_succeeded", "invoice.payment_failed"]', 'Stripe webhook events to process'),
  ('stripe_webhook_tolerance_seconds', '300', 'Webhook timestamp tolerance in seconds')
ON CONFLICT (key) DO UPDATE SET 
  value = EXCLUDED.value,
  description = EXCLUDED.description;

-- Update existing users to have 60 minutes balance
UPDATE public.user_profiles
SET time_balance_minutes = 60
WHERE time_balance_minutes < 60;

-- Clean up any stale sessions
UPDATE public.proxy_sessions
SET status = 'terminated', ended_at = COALESCE(ended_at, now())
WHERE status = 'active' 
  AND last_activity_at < now() - interval '1 hour';

-- =====================================================================
-- COMMENTS
-- =====================================================================
COMMENT ON FUNCTION public.cleanup_stale_sessions() IS 
'Cleans up stale proxy sessions that have been inactive for more than 10 minutes. Should be called periodically.';

COMMENT ON FUNCTION public.terminate_proxy_session(UUID) IS 
'Terminates a proxy session and deducts balance. For development, limits deduction to max 10 minutes per session.'; 