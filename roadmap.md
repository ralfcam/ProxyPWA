Progressive Web App (The "Cloud Proxy" Model)

With the need for native OS integration gone, the PWA approach, which you were curious about, becomes highly viable and very attractive.

**How it Works:**

1.  **The App is a Website:** The entire application (login, payments, domain selection) is a PWA hosted on a URL like `app.your-service.com`.
2.  **Server Handles Proxying:** When a user logs in and chooses to navigate to `target-site.com`, they are not sent there directly. Instead, your PWA sends them to a URL like `app.your-service.com/browse/target-site.com`.
3.  **Backend Logic:** Your web server receives this request, fetches the content from the *actual* `target-site.com` on behalf of the user, and then streams it back to the user's browser. The user's IP is only ever exposed to your server, not the final destination.

# Revised Plan: PWA with Supabase + Stripe Integration

## Phase 1: Simplified Architecture with Supabase + Stripe

### 1.1 New Architecture Overview
```
┌─────────────────────────────────────────┐
│             USER'S BROWSER              │
├─────────────────────────────────────────┤
│         PWA Frontend (React/Vue)        │
│  ┌─────────────────────────────────────┐│
│  │    Service Worker (Offline Cache)   ││
│  │    Web App Manifest (Install)       ││
│  │    Push Notifications               ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
                     │ HTTPS/WSS
┌─────────────────────────────────────────┐
│            SUPABASE CLOUD               │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐│
│  │    Auto-Generated APIs              ││
│  │    ┌────────────────────────────────┤│
│  │    │  REST API (/rest/v1/*)         ││
│  │    │  GraphQL API (/graphql/v1)     ││
│  │    │  Real-time API (/realtime/v1)  ││
│  │    └────────────────────────────────┤│
│  │    Built-in Auth (JWT + RLS)        ││
│  │    Edge Functions (Custom Logic)    ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │         PostgreSQL Database         ││
│  │    ┌────────────────────────────────┤│
│  │    │  User Management (built-in)    ││
│  │    │  Proxy Sessions                ││
│  │    │  Usage Analytics               ││
│  │    │  Stripe Data (FDW)             ││
│  │    └────────────────────────────────┤│
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────┐
│              STRIPE API                 │
├─────────────────────────────────────────┤
│  Payment Processing                     │
│  Subscription Management                │
│  Webhook Events                         │
└─────────────────────────────────────────┘
```

### 1.2 Technology Stack (Revised)
**Frontend:**
- **Framework:** React 18+ with TypeScript
- **State Management:** Zustand (lighter than Redux)
- **UI Library:** Tailwind CSS + Shadcn/ui
- **Build Tool:** Vite with PWA plugin
- **PWA Tools:** Workbox
- **Supabase Client:** `@supabase/supabase-js`

**Backend (Significantly Simplified):**
- **Primary Backend:** Supabase (hosted PostgreSQL + Auth + APIs)
- **Custom Logic:** Supabase Edge Functions (Deno runtime)
- **Payment:** Stripe with Supabase Stripe FDW integration
- **Real-time:** Supabase Realtime (built-in WebSocket)
- **File Storage:** Supabase Storage

**Infrastructure:**
- **Hosting:** Vercel (frontend) + Supabase (backend)
- **CDN:** Vercel Edge Network
- **SSL:** Automatic HTTPS

## Phase 2: Dramatically Simplified File Structure

### 2.1 New Project Structure
```
vpn-pwa/
├── frontend/                          # PWA Client
│   ├── public/
│   │   ├── manifest.json             # PWA manifest
│   │   ├── icons/                    # PWA icons (from assets/)
│   │   └── sw.js                     # Service worker
│   ├── src/
│   │   ├── components/               # Migrated from renderer/components/
│   │   │   ├── Auth/
│   │   │   │   ├── LoginForm.tsx     # Uses Supabase Auth
│   │   │   │   └── RegisterForm.tsx  # Uses Supabase Auth
│   │   │   ├── Dashboard/
│   │   │   │   ├── ConnectionStatus.tsx
│   │   │   │   ├── ProxyControl.tsx  # Simplified proxy controls
│   │   │   │   └── Statistics.tsx    # Real-time via Supabase
│   │   │   ├── Settings/
│   │   │   │   └── SettingsPanel.tsx
│   │   │   └── Payment/
│   │   │       └── StripeCheckout.tsx # Stripe Elements
│   │   ├── hooks/                    # React hooks for state management
│   │   │   ├── useAuth.ts            # Supabase Auth hooks
│   │   │   ├── useProxy.ts           # Proxy session management
│   │   │   ├── useStripe.ts          # Stripe integration
│   │   │   └── useRealtime.ts        # Supabase Realtime
│   │   ├── lib/                      # Configuration and utilities
│   │   │   ├── supabase.ts           # Supabase client setup
│   │   │   ├── stripe.ts             # Stripe client setup
│   │   │   └── database.types.ts     # Generated from Supabase
│   │   ├── styles/                   # CSS modules/Tailwind
│   │   │   └── globals.css           # Migrated from renderer/styles.css
│   │   ├── App.tsx                   # Main app component
│   │   └── main.tsx                  # Entry point
│   ├── package.json
│   └── vite.config.ts               # Vite + PWA configuration
├── supabase/                         # Supabase configuration
│   ├── migrations/                   # Database schema
│   │   ├── 20240101000000_initial_schema.sql
│   │   ├── 20240101000001_stripe_integration.sql
│   │   └── 20240101000002_proxy_sessions.sql
│   ├── functions/                    # Edge Functions (custom logic)
│   │   ├── proxy-handler/            # Core proxy logic
│   │   │   └── index.ts
│   │   ├── stripe-webhooks/          # Stripe webhook handler
│   │   │   └── index.ts
│   │   └── usage-analytics/          # Usage tracking
│   │       └index.ts
│   ├── config.toml                   # Supabase configuration
│   └── seed.sql                      # Initial data
└── shared/                           # Shared types (if needed)
    └── types/
        └── database.types.ts         # Auto-generated from Supabase
```

## Phase 3: Supabase Integration Strategy: DB Schema Complete

The database schema has been fully implemented through a series of Supabase migration files.

For a complete and up-to-date reference of the database structure, including all tables, functions, policies, and Stripe integration details, please see the **[MIGRATION_SUMMARY.md](vpn-pwa/supabase/MIGRATION_SUMMARY.md)**. This summary document is the single source of truth for the database layer.

## Phase 4: Edge Functions for Custom Logic

### 4.1 Proxy Handler (Supabase Edge Function)
```typescript
// supabase/functions/proxy-handler/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { targetUrl, sessionId } = await req.json()
    
    // Validate session
    const { data: session, error } = await supabase
      .from('proxy_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('status', 'active')
      .single()

    if (error || !session) {
      return new Response('Invalid session', { status: 401 })
    }

    // Check user's time balance
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('time_balance_minutes')
      .eq('id', session.user_id)
      .single()

    if (profile?.time_balance_minutes <= 0) {
      return new Response('Insufficient balance', { status: 402 })
    }

    // Fetch content from target URL
    const targetResponse = await fetch(targetUrl, {
      headers: {
        'User-Agent': req.headers.get('User-Agent') || 'VPN-PWA-Client/1.0',
      }
    })

    const content = await targetResponse.text()
    
    // Log usage
    await supabase
      .from('usage_logs')
      .insert({
        user_id: session.user_id,
        session_id: sessionId,
        event_type: 'page_request',
        metadata: { target_url: targetUrl, bytes: content.length }
      })

    // Update bytes transferred
    await supabase
      .from('proxy_sessions')
      .update({ 
        bytes_transferred: session.bytes_transferred + content.length 
      })
      .eq('id', sessionId)

    return new Response(content, {
      headers: {
        'Content-Type': targetResponse.headers.get('Content-Type') || 'text/html',
        'Access-Control-Allow-Origin': '*',
      }
    })

  } catch (error) {
    return new Response('Proxy error', { status: 500 })
  }
})
```

### 4.2 Stripe Webhook Handler
```typescript
// supabase/functions/stripe-webhooks/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const signature = req.headers.get('stripe-signature')
    const body = await req.text()
    
    // Verify webhook signature (implement Stripe signature verification)
    // ... verification logic ...

    const event = JSON.parse(body)

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object
        
        // Add time to user's balance based on payment
        const timeToAdd = calculateTimeFromAmount(paymentIntent.amount)
        
        await supabase.rpc('add_time_balance', {
          user_email: paymentIntent.metadata.user_email,
          minutes_to_add: timeToAdd
        })
        break

      case 'subscription.created':
      case 'subscription.updated':
        // Handle subscription changes
        const subscription = event.data.object
        await supabase
          .from('user_profiles')
          .update({ 
            time_balance_minutes: subscription.status === 'active' ? 999999 : 0 
          })
          .eq('email', subscription.metadata.user_email)
        break
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    return new Response('Webhook error', { status: 400 })
  }
})

function calculateTimeFromAmount(amount: number): number {
  // Example: $5 = 60 minutes, $10 = 150 minutes, etc.
  const pricePerHour = 500 // cents
  return Math.floor((amount / pricePerHour) * 60)
}
```

## Phase 5: Frontend Implementation with Supabase

### 5.1 Real-time Updates (Built-in)
```typescript
// frontend/src/hooks/useRealtime.ts
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export const useRealtime = (userId: string) => {
  const [proxySession, setProxySession] = useState(null)
  const [stats, setStats] = useState({ bytesTransferred: 0, activeTime: 0 })

  useEffect(() => {
    if (!userId) return

    // Subscribe to proxy session changes
    const sessionSubscription = supabase
      .channel('proxy-sessions')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'proxy_sessions',
          filter: `user_id=eq.${userId}`
        }, 
        (payload) => {
          setProxySession(payload.new)
          setStats({
            bytesTransferred: payload.new.bytes_transferred,
            activeTime: Math.floor((new Date() - new Date(payload.new.started_at)) / 1000)
          })
        }
      )
      .subscribe()

    return () => {
      sessionSubscription.unsubscribe()
    }
  }, [userId])

  return { proxySession, stats }
}
```

### 5.2 Stripe Integration (Frontend)
```typescript
// frontend/src/components/Payment/StripeCheckout.tsx
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { supabase } from '../../lib/supabase'

const stripePromise = loadStripe('pk_test_your_publishable_key')

export const StripeCheckout = ({ amount, timePackage }: { amount: number, timePackage: string }) => {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm amount={amount} timePackage={timePackage} />
    </Elements>
  )
}

const CheckoutForm = ({ amount, timePackage }: { amount: number, timePackage: string }) => {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)

    // Create payment intent via Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: { amount, timePackage }
    })

    if (error) {
      console.error('Payment failed:', error)
      setLoading(false)
      return
    }

    // Confirm payment with Stripe
    const result = await stripe.confirmCardPayment(data.clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement)!,
      }
    })

    if (result.error) {
      console.error('Payment failed:', result.error.message)
    } else {
      console.log('Payment succeeded!')
      // Time will be automatically added via webhook
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button disabled={!stripe || loading}>
        {loading ? 'Processing...' : `Pay $${amount/100}`}
      </button>
    </form>
  )
}
```

## Phase 6: Simplified Deployment Strategy

### 6.1 Development Environment
```bash
# Frontend setup
npm create vite@latest vpn-pwa -- --template react-ts
cd vpn-pwa
npm install @supabase/supabase-js @stripe/stripe-js @stripe/react-stripe-js

# Supabase setup
npm install -g supabase
supabase init
supabase start  # Starts local Supabase stack

# Environment variables (.env.local)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your-key
```

### 6.2 Production Deployment (Extremely Simple)
```bash
# 1. Deploy Supabase project
supabase link --project-ref your-project-id
supabase db push  # Deploy schema
supabase functions deploy  # Deploy Edge Functions

# 2. Deploy frontend to Vercel
vercel --prod

# 3. Configure Stripe webhooks to point to:
# https://your-project.supabase.co/functions/v1/stripe-webhooks
```

## Phase 7: Revised Migration Timeline (Accelerated)

### Week 1-2: Foundation Setup
- [x] Set up Supabase project and local development
- [x] Configure Stripe integration with Supabase FDW [\[1\]](https://supabase.com/docs/guides/database/extensions/wrappers/stripe)
- [ ] Create React PWA with Vite and Supabase client
- [ ] Implement Supabase Auth (replaces entire custom auth system)

### Week 3-4: Core Features (Simplified)
- [x] Build proxy session management with Supabase database
- [ ] Implement proxy handler Edge Function
- [x] Set up real-time updates with Supabase Realtime (DB-side)
- [ ] Integrate Stripe Elements for payments

### Week 5-6: PWA Features & Polish
- [ ] Implement Service Worker and PWA manifest
- [ ] Add offline support for cached content
- [x] Set up Stripe webhooks via Edge Functions (DB-side functions created)
- [ ] Mobile responsiveness and UI polish

### Week 7: Testing & Deployment
- [ ] End-to-end testing of proxy and payment flows
- [x] Deploy to production (Vercel + Supabase) - (DB deployment strategy defined)
- [ ] Configure custom domain and SSL
- [ ] User acceptance testing

### Week 8: Launch
- [ ] User migration communication
- [ ] Gradual rollout with monitoring
- [ ] Support documentation and troubleshooting

## Phase 8: Benefits of This Architecture

**Dramatically Reduced Complexity:**
- **No custom backend server needed** - Supabase provides APIs automatically
- **No database management** - Fully managed PostgreSQL
- **No authentication logic** - Built-in auth with JWT and RLS
- **No WebSocket server** - Real-time subscriptions included
- **No payment webhook infrastructure** - Edge Functions handle everything

**Enhanced Capabilities:**
- **Direct SQL queries to Stripe data** via Foreign Data Wrappers [\[1\]](https://supabase.com/docs/guides/database/extensions/wrappers/stripe)
- **Real-time updates** across all connected clients
- **Automatic API generation** from database schema
- **Built-in security** with Row Level Security policies
- **Infinite scalability** with serverless architecture

**Simplified Maintenance:**
- **One-command deployments** via Supabase CLI
- **Automatic scaling** based on usage
- **Built-in monitoring** and analytics
- **No server maintenance** or patching required