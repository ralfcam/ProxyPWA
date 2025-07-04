/// <reference types="https://deno.land/x/deno@v1.34.0/lib/deno.d.ts" />

// supabase/functions/stripe-webhooks/index.ts
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { getSupabaseClient } from '../_shared/supabase.ts'
import Stripe from 'https://esm.sh/stripe@12.18.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  const supabase = getSupabaseClient()
  
  try {
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      throw new Error('No signature provided')
    }

    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    if (!webhookSecret) {
      throw new Error('Webhook secret not configured')
    }

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    )

    // Log the webhook event
    await supabase.from('admin_audit_log').insert({
      admin_id: 'system',
      action: `stripe_webhook_${event.type}`,
      details: { event_id: event.id, type: event.type }
    })

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object
        const timeToAdd = calculateTimeFromAmount(paymentIntent.amount)
        
        // Record the payment transaction
        await supabase.from('payment_transactions').insert({
          user_id: paymentIntent.metadata.user_id,
          stripe_payment_intent_id: paymentIntent.id,
          amount_cents: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: 'succeeded',
          time_minutes_purchased: timeToAdd,
          description: paymentIntent.description
        })

        // Add time to user's balance
        await supabase.rpc('add_time_balance', {
          user_id: paymentIntent.metadata.user_id,
          minutes_to_add: timeToAdd
        })

        // Log usage event
        await supabase.from('usage_logs').insert({
          user_id: paymentIntent.metadata.user_id,
          event_type: 'payment',
          metadata: {
            payment_intent_id: paymentIntent.id,
            amount: paymentIntent.amount,
            minutes_added: timeToAdd
          }
        })
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const status = getSubscriptionStatus(subscription.status)
        const tier = getSubscriptionTier(subscription.items.data[0].price.id)

        await supabase
          .from('user_profiles')
          .update({ 
            subscription_status: status,
            subscription_tier: tier,
            time_balance_minutes: status === 'active' ? 999999 : 0,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_customer_id', subscription.customer)

        // Log subscription change
        await supabase.from('usage_logs').insert({
          user_id: subscription.metadata.user_id,
          event_type: 'payment',
          metadata: {
            subscription_id: subscription.id,
            status,
            tier,
            event_type: event.type
          }
        })
        break
      }

      case 'customer.created': {
        const customer = event.data.object
        await supabase
          .from('user_profiles')
          .update({ 
            stripe_customer_id: customer.id,
            updated_at: new Date().toISOString()
          })
          .eq('email', customer.email)
        break
      }
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error.message)
    
    // Log the error
    await supabase.from('admin_audit_log').insert({
      admin_id: 'system',
      action: 'stripe_webhook_error',
      details: { error: error.message }
    })

    return new Response(error.message, { status: 400 })
  }
})

function calculateTimeFromAmount(amount: number): number {
  // Get pricing from system settings
  const pricePerHour = 500 // cents
  return Math.floor((amount / pricePerHour) * 60)
}

function getSubscriptionStatus(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
    'active': 'active',
    'past_due': 'past_due',
    'canceled': 'cancelled',
    'unpaid': 'past_due',
    'incomplete': 'free',
    'incomplete_expired': 'free',
    'trialing': 'active'
  }
  return statusMap[stripeStatus] || 'free'
}

function getSubscriptionTier(priceId: string): string {
  // Map price IDs to tiers - should be configured in system settings
  const tierMap: Record<string, string> = {
    'price_basic': 'basic',
    'price_premium': 'premium',
    'price_enterprise': 'enterprise'
  }
  return tierMap[priceId] || 'basic'
}