# Supabase Edge Functions

This directory contains the consolidated Supabase Edge Functions for the VPN proxy service.

## Function Overview

### 1. `proxy-service`
The main proxy function that handles all proxy requests. It supports two modes:

- **Authenticated Mode**: For users with active sessions, tracks usage, validates time balance
- **Simple Mode**: For basic proxy requests without authentication

#### Endpoints:
- Authenticated: `/functions/v1/proxy-service/{sessionId}/{targetUrl}`
- Simple: `/functions/v1/proxy-service?url={targetUrl}`
- Legacy: `/functions/v1/proxy-service?session={sessionId}&target={targetUrl}`

### 2. `usage-analytics`
Admin-only function for generating analytics reports on:
- Daily usage statistics
- User activity metrics
- Subscription metrics
- Error analysis

#### Endpoint:
`/functions/v1/usage-analytics?type={reportType}&start_date={date}&end_date={date}`

### 3. `stripe-webhooks`
Handles Stripe payment webhooks for:
- Payment processing
- Subscription management
- Customer creation

#### Endpoint:
`/functions/v1/stripe-webhooks` (Called by Stripe)

## Shared Modules

### `_shared/cors.ts`
Common CORS configuration and handling for all functions.

### `_shared/supabase.ts`
Shared Supabase client initialization.

## Local Development

To run a function locally:

```bash
npx supabase functions serve proxy-service --no-verify-jwt
```

## Deployment

Deploy all functions:

```bash
supabase functions deploy
```

Deploy a specific function:

```bash
supabase functions deploy proxy-service
```

## Environment Variables

Required environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access
- `STRIPE_SECRET_KEY`: Stripe API key (for stripe-webhooks)
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret 