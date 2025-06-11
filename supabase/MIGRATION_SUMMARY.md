# VPN PWA - Supabase Database Schema Summary

This document summarizes the consolidated database schema and functionality for the VPN PWA application.

## 📁 Migration Structure

The database schema is now maintained in a single consolidated file:

### `00000000000000_consolidated_schema.sql`

This consolidated migration provides:
- Complete database schema with all tables and relationships
- Fixed RLS policies that avoid infinite recursion
- Development-friendly balance management
- Real-time subscription handling
- Stripe integration
- Admin analytics
- Rate limiting and security features

## 🏗️ Core Components

### 1. User Management & Profiles
```sql
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT false,
  time_balance_minutes INTEGER DEFAULT 100, -- Development default
  subscription_status TEXT,
  subscription_tier TEXT,
  -- ... other fields
);
```

**Key Features**:
- Default 100-minute balance for development
- Subscription status tracking
- Admin role management
- Activity tracking

### 2. Proxy Session Management
```sql
CREATE TABLE public.proxy_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_domain TEXT NOT NULL,
  session_url TEXT NOT NULL,
  status TEXT CHECK (status IN ('active', 'expired', 'terminated', 'error', 'archived')),
  -- ... other fields
);
```

**Key Features**:
- Complete session lifecycle management
- Automatic cleanup of stale sessions
- Usage tracking and metrics
- Maximum 10-minute balance deduction per session

### 3. Security & Access Control

#### Fixed RLS Policies
```sql
-- Admin check without recursion
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

-- Apply policies using the function
CREATE POLICY "Admins can view all profiles" ON user_profiles 
  FOR SELECT USING (public.is_admin());
```

**Key Features**:
- SECURITY DEFINER functions to avoid RLS recursion
- Granular access control
- Role-based permissions
- Rate limiting support

### 4. Analytics & Monitoring
```sql
CREATE TABLE public.usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES proxy_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  -- ... other fields
);
```

**Key Features**:
- Comprehensive event logging
- Performance metrics
- Usage statistics
- Admin dashboards

### 5. Payment Integration
```sql
CREATE TABLE public.payment_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  amount_cents INTEGER NOT NULL,
  -- ... other fields
);
```

**Key Features**:
- Stripe Foreign Data Wrapper integration
- Transaction tracking
- Subscription management
- Automated balance updates

## 🔒 Security Features

### 1. Row Level Security (RLS)
- User-specific data access
- Admin role management
- System-level operations
- Public settings access

### 2. Rate Limiting
```sql
CREATE TABLE public.rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address INET,
  endpoint TEXT NOT NULL,
  -- ... other fields
);
```

### 3. Audit Logging
- Session activity tracking
- Admin action logging
- Payment event recording
- Security event monitoring

## 🚀 Development Features

### 1. Balance Management
- 100-minute default balance
- Maximum 10-minute session deduction
- Automatic balance updates
- Real-time balance tracking

### 2. Session Cleanup
- 10-minute inactivity timeout
- Automatic stale session cleanup
- Session archival system
- Error state handling

### 3. Real-time Updates
- WebSocket-compatible events
- Live balance updates
- Session status tracking
- Activity monitoring

## 📊 Performance Optimizations

### 1. Indexes
```sql
CREATE INDEX idx_proxy_sessions_user_status 
  ON public.proxy_sessions(user_id, status) 
  WHERE status = 'active';

CREATE INDEX idx_proxy_sessions_stale_cleanup 
  ON public.proxy_sessions(status, last_activity_at) 
  WHERE status = 'active';
```

### 2. Efficient Queries
- Optimized RLS policies
- Indexed foreign keys
- Partial indexes for common queries
- Performance-focused views

## 🔄 Maintenance

### 1. Automated Cleanup
```sql
-- Clean up stale sessions
CREATE OR REPLACE FUNCTION public.cleanup_stale_sessions()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.proxy_sessions
  SET 
    status = 'expired',
    ended_at = now()
  WHERE 
    status = 'active'
    AND last_activity_at < now() - interval '10 minutes';
END;
$$;
```

### 2. System Settings
```sql
INSERT INTO public.system_settings (key, value, description) VALUES
  ('dev_mode_enabled', 'true', 'Enable development mode features'),
  ('dev_mode_time_balance_minutes', '100', 'Default time balance'),
  ('public_max_idle_minutes', '10', 'Session timeout after inactivity')
-- ... other settings
```

## 📝 Migration Notes

### Running Migrations
```bash
# Development
supabase db reset

# Production (after backup!)
psql -h [host] -U postgres -d postgres -f supabase/migrations/00000000000000_consolidated_schema.sql
```

### Important Considerations
1. **Backup First**: Always backup production data before migrations
2. **Development Mode**: Default 100-minute balance is for development
3. **Session Limits**: 10-minute max deduction per session
4. **Cleanup**: Automatic cleanup after 10 minutes inactivity
5. **RLS**: Fixed infinite recursion in admin policies

## 🔍 Troubleshooting

### Common Issues
1. **RLS Errors**: Use `is_admin()` function for admin checks
2. **Balance Issues**: Check `time_balance_minutes` in user_profiles
3. **Stale Sessions**: Run `cleanup_stale_sessions()`
4. **Real-time Updates**: Verify WebSocket channel subscriptions

### Verification Queries
```sql
-- Check user balance
SELECT time_balance_minutes FROM user_profiles WHERE id = auth.uid();

-- Check active sessions
SELECT * FROM active_proxy_sessions;

-- Verify admin access
SELECT public.is_admin();
```

## 🔄 Future Considerations

1. **Scaling**
   - Consider partitioning for large tables
   - Implement archival strategies
   - Optimize indexes for growth

2. **Monitoring**
   - Add performance metrics
   - Implement alerting
   - Track resource usage

3. **Security**
   - Regular security audits
   - Enhanced rate limiting
   - Additional audit logging

4. **Features**
   - Enhanced analytics
   - Additional payment options
   - Advanced session management

## 📋 Legacy Migration History

> Note: The following section is kept for historical reference only. All migrations have been consolidated into `00000000000000_consolidated_schema.sql`.

### Previous Migration Files (Archived)
**Enhanced and Comprehensive Base Schema**

#### Tables Created:
- **`user_profiles`** - Extended user data with subscription info
  - Subscription status/tier management
  - Time balance tracking
  - Stripe customer ID integration
  - Activity tracking
  - Concurrent session limits

- **`proxy_sessions`** - Complete session management
  - Active session tracking
  - Bandwidth/request counting
  - Client information (IP, User-Agent)
  - Session metadata and error handling

- **`usage_logs`** - Comprehensive analytics
  - Event-based logging system
  - Performance metrics (response times)
  - Target URL tracking
  - Structured metadata storage

- **`payment_transactions`** - Local payment tracking
  - Stripe payment intent correlation
  - Time purchase tracking
  - Transaction status management

- **`system_settings`** - Configuration management
  - Key-value configuration store
  - Public/private setting separation
  - Admin-controlled settings

#### Key Features:
- **Row Level Security (RLS)** on all tables
- **Comprehensive indexing** for performance
- **Automated triggers** for `updated_at` timestamps
- **Utility functions** for balance management and session counting
- **Default system settings** for pricing and limits

---

### 2. `20240101000001_stripe_integration.sql` - Payment Integration
**Advanced Stripe Foreign Data Wrapper Implementation**

#### Stripe Tables (Foreign Data Wrapper):
- **`stripe.customers`** - Direct Stripe customer data access
- **`stripe.subscriptions`** - Real-time subscription status
- **`stripe.payment_intents`** - Payment processing tracking
- **`stripe.products`** - Available service plans
- **`stripe.prices`** - Pricing information
- **`stripe.invoices`** - Billing history

#### Key Features:
- **Secure API key management** via Supabase Vault
- **User-friendly view** (`user_stripe_data`) with RLS
- **Webhook processing functions** for subscription updates
- **Pricing plan retrieval** with tier categorization
- **Automatic subscription status synchronization**

#### Functions:
- `sync_stripe_customer()` - Link users to Stripe customers
- `update_subscription_status()` - Handle webhook updates
- `get_pricing_plans()` - Retrieve available plans

---

### 3. `20240101000002_proxy_sessions.sql` - Session Management
**Comprehensive Proxy Session Lifecycle Management**

#### Key Functions:
- **`can_start_proxy_session()`** - Pre-session validation
  - Time balance checking
  - Concurrent session limits
  - Subscription status verification

- **`start_proxy_session()`** - Session initialization
  - Unique session URL generation
  - Activity logging
  - Session metadata setup

- **`terminate_proxy_session()`** - Session cleanup
  - Time balance deduction
  - Usage statistics calculation
  - Cleanup and archival

- **`update_session_activity()`** - Real-time tracking
  - Bandwidth monitoring
  - Request counting
  - Performance metrics

#### Advanced Features:
- **Real-time notifications** via PostgreSQL NOTIFY
- **Automatic session cleanup** for idle sessions
- **Session statistics aggregation** 
- **Active session monitoring view**
- **Data archival and cleanup functions**

---

### 4. `20240101000003_admin_analytics.sql` - Admin Dashboard
**Comprehensive Administrative Interface and Analytics**

#### Admin Views:
- **`admin_dashboard_stats`** - Real-time system overview
  - User statistics (total, new, active)
  - Session metrics and revenue tracking
  - System health indicators

- **`admin_user_analytics`** - Detailed user analysis
  - User activity scoring
  - Payment and usage history
  - Behavioral pattern analysis

- **`admin_system_metrics`** - Performance monitoring
  - Hourly request/response analytics
  - Error rate tracking
  - Domain usage patterns

#### Admin Functions:
- **`admin_update_user_balance()`** - Manual balance adjustment
- **`admin_terminate_user_sessions()`** - Emergency session control
- **`admin_generate_usage_report()`** - Comprehensive reporting

#### Features:
- **Audit logging** for all admin actions
- **Strict RLS policies** (admin-only access)
- **Performance-optimized queries**
- **Historical reporting capabilities**

---

### 5. `20240101000004_user_automation_security.sql` - Automation & Security
**User Lifecycle Automation and Security Features**

#### Automation Features:
- **Auto user profile creation** on signup
- **Welcome bonus assignment** (30 free minutes)
- **Preference initialization**
- **Registration event logging**

#### Security Features:
- **Rate limiting system** with configurable windows
- **Failed login attempt tracking** 
- **IP-based blocking mechanisms**
- **User activity monitoring**

#### User Management:
- **User preferences table** with theme/notification settings
- **Rate limit enforcement functions**
- **Security event logging**
- **Automated data cleanup procedures**

---

## 🔧 Technical Implementation Highlights

### Security & Performance
- **Fixed RLS Policies** using SECURITY DEFINER functions
- **Comprehensive indexing** for query optimization
- **Rate limiting** with IP and user tracking
- **Audit trails** for all administrative actions

### Real-time Features
- **Unique WebSocket channels** per user
- **Live balance updates** in UI
- **Session status tracking** in real-time
- **Dashboard metrics** with automatic updates

### Data Management
- **10-minute session cleanup** for stale data
- **Maximum 10-minute deduction** per session
- **100-minute default balance** for development
- **JSON metadata** for flexible storage

### Integration Ready
- **Stripe FDW** for payment processing
- **Environment variables** for configuration
- **Multi-tenant** architecture support
- **Scalable** session management

---

## 🚀 Deployment & Environment Setup

This section details how to set up your environment for both local development and production deployment.

### 1. Local Development Environment

This setup uses the Stripe CLI to test your integration locally, including webhooks.

**Step 1: Install CLI Tools**
```bash
# Install Supabase CLI
npm install -g supabase

# Install Stripe CLI (if not already installed)
# See: https://docs.stripe.com/stripe-cli?install-method=windows
# e.g, PS C:\Users\...> $Env:PATH += ";...\stripe_1.27.0_windows_x86_64"
# e.g, PS C:\Users\...> stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhooks
```

**Step 2: Start Local Supabase Stack**
This will start the local database and Edge Functions.
```bash
# Make sure Docker is running
supabase start
npx supabase functions serve proxy-service --no-verify-jwt
```
Note the local function URL, usually `http://localhost:54321/functions/v1/stripe-webhooks`.

**Step 3: Log in to the Stripe CLI**
This connects the CLI to your Stripe account and configures test keys. You have already completed this step.
```bash
stripe login
# Output: > Done! The Stripe CLI is configured for... acct_1RYa2jQ5zjJoSDsu
```

**Step 4: Forward Webhooks to Your Local Function**
In a new terminal, run this command. It tells Stripe to send test events to your local Supabase instance.
```bash
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhooks
```

**Step 5: Set Local Webhook Secret**
The `stripe listen` command will output a webhook signing secret (`whsec_...`). Add this to a local environment file for your Supabase functions to use.

Create the file `vpn-pwa/supabase/.env.local` and add the secret:
vpn-pwa/supabase/.env.local
STRIPE_WEBHOOK_SECRET=whsec_... # <-- Paste the secret from the CLI here

**Step 6: Trigger Test Events**
In another terminal, you can now simulate Stripe events.
```bash
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
```
You will see the events logged in the `stripe listen` terminal and processed by your local Supabase functions.

### 2. Production Deployment

This setup uses **LIVE** keys from your Stripe dashboard for real transactions. **NEVER use test keys or CLI keys in production.**

**Step 1: Link to Your Production Supabase Project**
```bash
supabase link --project-ref your-production-project-ref
```

**Step 2: Get LIVE API Keys from Stripe**
1.  Go to your Stripe Dashboard > Developers > API keys.
2.  Make sure you have toggled "View live data".
3.  Copy your **Publishable key** (`pk_live_...`) and **Secret key** (`sk_live_...`).

**Step 3: Set Production Secrets in Supabase**
Securely store your live keys in the Supabase Vault. This is what the Foreign Data Wrapper will use.
```bash
# Set the LIVE secret key for your Supabase project
supabase secrets set STRIPE_SECRET_KEY=sk_live_...

# Set the LIVE webhook signing secret (see Step 4)
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

**Step 4: Configure Production Webhook Endpoint**
1.  In your Stripe Dashboard > Developers > Webhooks, click "Add an endpoint".
2.  The **Endpoint URL** is your production Supabase function URL: `https://<your-project-ref>.supabase.co/functions/v1/stripe-webhooks`
3.  Select the events you want to listen to (e.g., `payment_intent.succeeded`, `customer.subscription.created`, etc.).
4.  After creating the endpoint, Stripe will reveal the **Signing secret** (`whsec_...`). Use this secret in the `supabase secrets set` command from Step 3.

**Step 5: Deploy Migrations and Functions**
```bash
# Push all database migrations
supabase db push

# Deploy all your edge functions
supabase functions deploy
```

---

## 📊 Key Metrics & Monitoring

The database schema supports tracking:
- **User engagement** (session duration, frequency)
- **Revenue metrics** (MRR, ARPU, churn)
- **System performance** (response times, error rates)
- **Security events** (failed logins, rate limiting)
- **Resource usage** (bandwidth, request volume)

---

## 🔄 Maintenance & Operations

### Scheduled Tasks (implement via pg_cron or external scheduler):
- `auto_terminate_idle_sessions()` - Every 5 minutes
- `cleanup_old_sessions()` - Daily
- `cleanup_old_data()` - Daily

### Monitoring Points:
- Active session count
- Error session rate
- Payment processing success rate
- User balance distribution
- System resource usage

---

## 🔧 Troubleshooting

### Common Migration Issues

#### 1. UUID Extension Error
**Error**: `ERROR: invalid byte sequence for encoding "UTF8": 0xff (SQLSTATE 22021)`
- **Solution**: The `uuid-ossp` extension is not needed in Supabase as `gen_random_uuid()` is available by default
- **Fixed in**: Migration has been updated to remove `uuid-ossp` dependency

#### 2. UTF8 Encoding Issues
**Error**: `ERROR: invalid byte sequence for encoding "UTF8": 0xff` with strange characters ()
- **Solution**: File encoding issues caused by BOM (Byte Order Mark) or non-UTF8 characters
- **Fixed in**: All migration files have been recreated with clean UTF8 encoding
- **Prevention**: 
  - Always save migration files with UTF-8 encoding (no BOM)
  - Avoid copying/pasting from rich text editors
  - Use plain text editors like VS Code, Notepad++, or vim

#### 3. Stripe Wrapper Setup
**Error**: Issues with Stripe Foreign Data Wrapper
- **Solution**: Ensure you're following the [official Supabase Stripe documentation](https://supabase.com/docs/guides/database/extensions/wrappers/stripe)
- **Key points**: 
  - Use `supabase secrets set` for API keys
  - Extensions are auto-enabled in Supabase
  - No need to manually create vault extension

#### 4. Missing Permissions
**Error**: Permission denied on schema/table access
- **Solution**: Ensure RLS policies are properly set up
- **Check**: `GRANT` statements in migrations are applied correctly

#### 5. Migration Order Issues
**Error**: Dependencies not found during migration
- **Solution**: Run migrations in numerical order
- **Command**: `supabase db reset` to start fresh if needed

### Testing Your Setup

Run the included test script:
```bash
# Execute the test script to verify all migrations
supabase db push
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/test_migrations.sql
```

Or test individual components:
```sql
-- Test user profile creation
SELECT * FROM auth.users LIMIT 1;
SELECT * FROM public.user_profiles LIMIT 1;

-- Test Stripe integration (after setting up API keys)
SELECT * FROM stripe.products LIMIT 5;

-- Test session management
SELECT public.can_start_proxy_session(auth.uid());

-- Test admin analytics (as admin user)
SELECT * FROM public.admin_dashboard_stats;
```

### File Encoding Best Practices

To prevent UTF8 encoding issues:

1. **VS Code**: Set encoding to UTF-8 (no BOM)
   ```json
   "files.encoding": "utf8",
   "files.autoSave": "afterDelay"
   ```

2. **PowerShell**: When creating files, use UTF8 encoding
   ```powershell
   [System.IO.File]::WriteAllText("migration.sql", $content, [System.Text.Encoding]::UTF8)
   ```

3. **Git**: Configure line endings
   ```bash
   git config core.autocrlf true  # Windows
   git config core.eol lf
   ```

### Verification Commands

After successful migration deployment:
```bash
# Check migration status
supabase migration list

# Verify database structure
supabase db diff

# Test basic functionality
supabase functions deploy
supabase edge-functions invoke test
```

---

## 📋 Complete Database Schema Overview

The following schema represents the complete database structure created by all migration files. This is for reference only and shows the final state after all migrations are applied:

```sql
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_user_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT admin_audit_log_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id),
  CONSTRAINT admin_audit_log_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.failed_login_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address inet,
  user_agent text,
  attempt_time timestamp with time zone DEFAULT now(),
  reason text,
  CONSTRAINT failed_login_attempts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.payment_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_payment_intent_id text UNIQUE,
  amount_cents integer NOT NULL,
  currency text DEFAULT 'usd'::text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'succeeded'::text, 'failed'::text, 'cancelled'::text])),
  time_minutes_purchased integer NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payment_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT payment_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.proxy_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_domain text NOT NULL,
  session_url text NOT NULL,
  proxy_server text,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'terminated'::text, 'error'::text])),
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  last_activity_at timestamp with time zone DEFAULT now(),
  bytes_transferred bigint DEFAULT 0,
  requests_count integer DEFAULT 0,
  user_agent text,
  client_ip inet,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT proxy_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT proxy_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  ip_address inet,
  endpoint text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rate_limits_pkey PRIMARY KEY (id),
  CONSTRAINT rate_limits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.system_settings (
  key text NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid,
  CONSTRAINT system_settings_pkey PRIMARY KEY (key),
  CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);
CREATE TABLE public.usage_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id uuid,
  event_type text NOT NULL CHECK (event_type = ANY (ARRAY['session_start'::text, 'session_end'::text, 'page_request'::text, 'data_transfer'::text, 'error'::text, 'payment'::text])),
  target_url text,
  bytes_transferred bigint DEFAULT 0,
  response_time_ms integer,
  status_code integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT usage_logs_pkey PRIMARY KEY (id),
  CONSTRAINT usage_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT usage_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.proxy_sessions(id)
);
CREATE TABLE public.user_preferences (
  user_id uuid NOT NULL,
  preferences jsonb DEFAULT '{}'::jsonb,
  notifications_enabled boolean DEFAULT true,
  email_notifications boolean DEFAULT true,
  browser_notifications boolean DEFAULT false,
  theme text DEFAULT 'system'::text CHECK (theme = ANY (ARRAY['light'::text, 'dark'::text, 'system'::text])),
  language text DEFAULT 'en'::text,
  timezone text DEFAULT 'UTC'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_preferences_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text,
  avatar_url text,
  is_admin boolean DEFAULT false,
  time_balance_minutes integer DEFAULT 0,
  subscription_status text DEFAULT 'free'::text CHECK (subscription_status = ANY (ARRAY['free'::text, 'active'::text, 'cancelled'::text, 'past_due'::text])),
  subscription_tier text DEFAULT 'basic'::text CHECK (subscription_tier = ANY (ARRAY['basic'::text, 'premium'::text, 'enterprise'::text])),
  stripe_customer_id text UNIQUE,
  max_concurrent_sessions integer DEFAULT 1,
  total_bytes_used bigint DEFAULT 0,
  last_activity_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
```

### Schema Summary:
- **9 core tables** with comprehensive foreign key relationships
- **All tables reference `auth.users`** for user management integration
- **Comprehensive constraints** including CHECK constraints for enum-like fields
- **UUID primary keys** for all tables using `gen_random_uuid()`
- **Timestamps** with proper defaults and automatic updates
- **JSONB metadata fields** for flexible data storage
- **Network types** (inet) for IP address storage
- **Proper indexing** and Row Level Security (see individual migration files)

---

This migration set provides a production-ready, scalable foundation for the VPN PWA application with comprehensive user management, payment processing, session handling, and administrative capabilities. # Migration Order and Dependencies

This project now uses a single consolidated migration file that includes all database schema, functions, and policies.

## Current Migration Structure

### 00000000000000_consolidated_schema.sql
This single migration file contains:
- Core table schemas (user_profiles, proxy_sessions, usage_logs, etc.)
- Row Level Security (RLS) policies with fixed infinite recursion issues
- All required functions for proxy session management
- Stripe integration with Foreign Data Wrapper
- Admin analytics views and functions
- Rate limiting tables
- System settings and default values
- All necessary indexes for performance

## Benefits of Consolidation

1. **Simplified Deployment**: Single file to manage and deploy
2. **Clear Dependencies**: All objects created in the correct order
3. **Fixed RLS Issues**: Admin policies no longer cause infinite recursion
4. **Development Defaults**: 100 minutes balance for new users, max 10 minute deduction per session
5. **Easier Maintenance**: No need to track multiple migration files and their order

## Key Fixes in Consolidated Migration

1. **RLS Policy Fix**: Admin check now uses a SECURITY DEFINER function to avoid recursion
2. **Balance Management**: New users get 100 minutes by default, sessions deduct max 10 minutes
3. **Stale Session Cleanup**: Sessions expire after 10 minutes of inactivity
4. **Real-time Subscriptions**: Fixed to use unique channel names per user

## Running the Migration

```bash
# Reset and apply the consolidated migration
supabase db reset

# Or if you need to run it manually
psql -h localhost -p 54321 -U postgres -d postgres -f supabase/migrations/00000000000000_consolidated_schema.sql
```

## Important Notes

1. **Order Matters**: Migrations must be run in numerical order as later migrations may depend on earlier ones.

2. **Idempotency**: Most migrations are written to be idempotent (can be run multiple times safely) using:
   - `CREATE OR REPLACE FUNCTION`
   - `ON CONFLICT DO UPDATE`
   - `IF NOT EXISTS` checks

3. **Development vs Production**:
   - Migration #7 sets up development defaults (100 minutes balance)
   - For production, update system settings after migration

4. **Dependencies**:
   - Proxy functions depend on `proxy_sessions` table
   - Admin views depend on base tables
   - Payment functions depend on Stripe integration

## Troubleshooting

If migrations fail:

1. Check the Supabase logs for specific errors
2. Ensure you're running them in the correct order
3. Verify your Supabase project is properly linked
4. Check that you have the necessary permissions

## Future Migrations

When adding new migrations:

1. Use the next sequential number (e.g., `20240101000009_`)
2. Make migrations idempotent when possible
3. Document the purpose clearly
4. Test in development before production
5. Consider backward compatibility 