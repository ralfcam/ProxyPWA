import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { getSupabaseClient } from '../_shared/supabase.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  const supabase = getSupabaseClient()

  try {
    const url = new URL(req.url)
    const reportType = url.searchParams.get('type') || 'daily'
    const userId = url.searchParams.get('user_id')
    const startDate = url.searchParams.get('start_date')
    const endDate = url.searchParams.get('end_date') || new Date().toISOString()

    // Validate admin access
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization provided')
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.is_admin) {
      throw new Error('Admin access required')
    }

    let analyticsQuery

    switch (reportType) {
      case 'daily': {
        // Daily usage statistics
        analyticsQuery = supabase
          .from('usage_logs')
          .select(`
            date_trunc('day', created_at) as day,
            count(*) as total_requests,
            sum(bytes_transferred) as total_bytes,
            avg(response_time_ms) as avg_response_time,
            count(CASE WHEN event_type = 'error' THEN 1 END) as error_count
          `)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .eq('user_id', userId)
          .group('day')
          .order('day')
        break
      }

      case 'user_activity': {
        // User activity metrics
        analyticsQuery = supabase
          .from('user_profiles')
          .select(`
            id,
            email,
            subscription_status,
            subscription_tier,
            time_balance_minutes,
            total_bytes_used,
            last_activity_at,
            (
              SELECT count(*)
              FROM proxy_sessions ps
              WHERE ps.user_id = user_profiles.id
              AND ps.status = 'active'
            ) as active_sessions
          `)
          .order('last_activity_at', { ascending: false })
        break
      }

      case 'subscription_metrics': {
        // Subscription and revenue metrics
        analyticsQuery = supabase
          .from('payment_transactions')
          .select(`
            date_trunc('month', created_at) as month,
            count(*) as transaction_count,
            sum(amount_cents) as total_revenue,
            avg(amount_cents) as avg_transaction_value
          `)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .group('month')
          .order('month')
        break
      }

      case 'error_analysis': {
        // Error analysis and patterns
        analyticsQuery = supabase
          .from('usage_logs')
          .select(`
            event_type,
            metadata->>'error' as error_type,
            count(*) as error_count
          `)
          .eq('event_type', 'error')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .group('event_type, metadata->>\'error\'')
          .order('error_count', { ascending: false })
        break
      }

      default:
        throw new Error('Invalid report type')
    }

    const { data, error: queryError } = await analyticsQuery

    if (queryError) {
      throw new Error(`Query error: ${queryError.message}`)
    }

    // Log analytics request
    await supabase.from('admin_audit_log').insert({
      admin_id: user.id,
      action: 'analytics_report',
      details: {
        report_type: reportType,
        user_id: userId,
        start_date: startDate,
        end_date: endDate
      }
    })

    return new Response(JSON.stringify(data), {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json' 
      }
    })
  } catch (error) {
    console.error('Analytics error:', error.message)

    return new Response(JSON.stringify({ error: error.message }), {
      status: error.message.includes('Unauthorized') || error.message.includes('Admin') ? 401 : 400,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json' 
      }
    })
  }
})