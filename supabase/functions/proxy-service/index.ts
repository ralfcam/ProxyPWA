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
    
    // Parse the request to determine proxy mode and extract parameters
    const { mode, sessionId, targetUrl } = parseProxyRequest(url)
    
    // If no target URL is provided, return a helpful message instead of error
    if (!targetUrl) {
      // Check if this is just a test request to the function endpoint
      if (!sessionId) {
        return new Response(
          JSON.stringify({ 
            message: 'Proxy service is running. Please provide a session ID and target URL.',
            usage: 'GET /proxy-service/{sessionId}/{encodedTargetUrl}',
            example: 'GET /proxy-service/abc123/https%3A%2F%2Fexample.com'
          }), 
          { 
            status: 200,
            headers: { 
              ...corsHeaders,
              'Content-Type': 'application/json' 
            }
          }
        )
      }
      throw new Error('Missing target URL')
    }

    console.log('Proxy request:', { mode, sessionId, targetUrl })

    // Validate target URL
    const validatedUrl = validateAndNormalizeUrl(targetUrl)

    // In authenticated mode, validate session and check user balance
    let userId: string | null = null
    if (mode === 'authenticated' && sessionId) {
      userId = await validateSessionAndUser(supabase, sessionId)
    }

    // Create headers for the proxy request
    const proxyHeaders = createProxyHeaders(req)

    // Make the proxy request
    const startTime = Date.now()
    
    const proxyResponse = await fetch(validatedUrl, {
      method: req.method,
      headers: proxyHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      redirect: 'follow',
    })
    
    const endTime = Date.now()
    const responseTime = endTime - startTime

    // Get response body
    const contentType = proxyResponse.headers.get('content-type') || ''
    let responseBody: ArrayBuffer | string
    let responseSize: number

    // Check if the response is HTML that needs modification
    if (contentType.includes('text/html')) {
      const htmlText = await proxyResponse.text()
      responseSize = new TextEncoder().encode(htmlText).length
      
      // Inject base tag and modify HTML for proxy compatibility
      const modifiedHtml = modifyHtmlForProxy(htmlText, validatedUrl, sessionId, url.origin + url.pathname.split('/proxy-service')[0] + '/proxy-service')
      responseBody = modifiedHtml
    } else {
      // For non-HTML content, just pass through as-is
      responseBody = await proxyResponse.arrayBuffer()
      responseSize = responseBody.byteLength
    }

    // Update metrics and logs for authenticated requests
    if (mode === 'authenticated' && sessionId && userId) {
      await updateMetricsAndLogs(supabase, {
        sessionId,
        userId,
        targetUrl: validatedUrl,
        responseSize,
        responseTime,
        statusCode: proxyResponse.status,
        method: req.method,
        userAgent: req.headers.get('user-agent'),
        contentType: contentType,
      })
    }

    // Create response headers
    const responseHeaders = createResponseHeaders(proxyResponse, responseTime)

    // Return the proxied response
    return new Response(responseBody, {
      status: proxyResponse.status,
      statusText: proxyResponse.statusText,
      headers: responseHeaders,
    })

  } catch (error) {
    console.error('Proxy error:', error)

    // Log error if possible
    try {
      await supabase.from('usage_logs').insert({
        event_type: 'error',
        metadata: { 
          error: error.message,
          url: req.url,
          method: req.method,
          timestamp: new Date().toISOString()
        }
      })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }

    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }), 
      { 
        status: error.message.includes('session') || error.message.includes('balance') ? 401 : 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        }
      }
    )
  }
})

interface ProxyRequest {
  mode: 'authenticated' | 'simple'
  sessionId?: string
  targetUrl?: string
}

function parseProxyRequest(url: URL): ProxyRequest {
  const pathParts = url.pathname.split('/')
  const functionIndex = pathParts.findIndex(part => part === 'proxy-service')
  
  // Check for simple proxy mode with query parameter
  if (url.searchParams.has('url')) {
    return {
      mode: 'simple',
      targetUrl: url.searchParams.get('url') || undefined
    }
  }
  
  // Check for authenticated mode with path parameters
  if (functionIndex !== -1 && pathParts.length > functionIndex + 2) {
    const sessionId = pathParts[functionIndex + 1]
    const targetUrlParts = pathParts.slice(functionIndex + 2)
    const targetUrl = decodeURIComponent(targetUrlParts.join('/'))
    
    return {
      mode: 'authenticated',
      sessionId,
      targetUrl
    }
  }
  
  // Check for legacy formats
  const sessionToken = url.searchParams.get('session')
  const targetParam = url.searchParams.get('target')
  
  if (sessionToken) {
    return {
      mode: 'authenticated',
      sessionId: sessionToken,
      targetUrl: targetParam || undefined
    }
  }
  
  throw new Error('Invalid request format')
}

function validateAndNormalizeUrl(targetUrl: string): string {
  // Ensure target URL has protocol
  let normalizedUrl = targetUrl
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl
  }

  // Validate URL format
  try {
    new URL(normalizedUrl)
    return normalizedUrl
  } catch {
    throw new Error('Invalid target URL format')
  }
}

async function validateSessionAndUser(supabase: any, sessionId: string): Promise<string> {
  // Validate session
  const { data: session, error: sessionError } = await supabase
    .from('proxy_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('status', 'active')
    .single()

  if (sessionError || !session) {
    console.error('Session error:', sessionError)
    throw new Error('Invalid or expired session')
  }

  // Get user profile
  const { data: userProfile, error: userError } = await supabase
    .from('user_profiles')
    .select('id, email, time_balance_minutes, subscription_status')
    .eq('id', session.user_id)
    .single()

  if (userError || !userProfile) {
    console.error('User profile error:', userError)
    throw new Error('User profile not found')
  }

  // Check user's time balance
  if (userProfile.time_balance_minutes <= 0 && userProfile.subscription_status !== 'active') {
    // Update session status to expired
    await supabase
      .from('proxy_sessions')
      .update({ 
        status: 'expired', 
        ended_at: new Date().toISOString(),
        error_message: 'Insufficient time balance'
      })
      .eq('id', sessionId)

    throw new Error('Insufficient time balance')
  }

  return session.user_id
}

function createProxyHeaders(req: Request): Headers {
  const proxyHeaders = new Headers()
  
  // Copy safe headers from the original request
  const safeHeaders = [
    'accept',
    'accept-language',
    'cache-control',
    'content-type',
    'user-agent'
  ]
  
  for (const [key, value] of req.headers.entries()) {
    if (safeHeaders.includes(key.toLowerCase())) {
      proxyHeaders.set(key, value)
    }
  }

  // Override/add specific headers
  proxyHeaders.set('User-Agent', req.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
  
  // Remove headers that might cause issues
  proxyHeaders.delete('host')
  proxyHeaders.delete('origin')
  proxyHeaders.delete('referer')
  
  return proxyHeaders
}

function createResponseHeaders(proxyResponse: Response, responseTime: number): Headers {
  const responseHeaders = new Headers(corsHeaders)
  
  // Copy safe response headers
  const safeResponseHeaders = [
    'content-type',
    'content-encoding',
    'content-language',
    'cache-control',
    'expires',
    'last-modified',
    'etag'
  ]
  
  // Headers to explicitly exclude (security-related)
  const excludedHeaders = [
    'content-security-policy',
    'content-security-policy-report-only',
    'x-frame-options',
    'x-content-type-options',
    'strict-transport-security',
    'permissions-policy',
    'feature-policy'
  ]
  
  for (const [key, value] of proxyResponse.headers.entries()) {
    const lowerKey = key.toLowerCase()
    if (safeResponseHeaders.includes(lowerKey) && !excludedHeaders.includes(lowerKey)) {
      responseHeaders.set(key, value)
    }
  }

  // Add custom headers
  responseHeaders.set('X-Proxy-Status', 'success')
  responseHeaders.set('X-Response-Time', responseTime.toString())
  
  // Set a permissive CSP for proxied content
  responseHeaders.set('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * data: blob: 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src * data: blob: ; style-src * 'unsafe-inline';")
  
  return responseHeaders
}

function modifyHtmlForProxy(html: string, targetUrl: string, sessionId: string | undefined, proxyBaseUrl: string): string {
  // Parse the target URL to get the base URL
  const targetUrlObj = new URL(targetUrl)
  const baseUrl = `${targetUrlObj.protocol}//${targetUrlObj.host}`
  
  // Inject base tag if not present
  if (!html.includes('<base')) {
    const headMatch = html.match(/<head[^>]*>/i)
    if (headMatch) {
      const baseTag = `<base href="${baseUrl}/">`
      html = html.replace(headMatch[0], `${headMatch[0]}\n    ${baseTag}`)
    } else {
      // If no head tag, inject at the beginning
      html = `<base href="${baseUrl}/">\n${html}`
    }
  }
  
  // Optional: Rewrite absolute URLs to go through the proxy
  // This is commented out for now as it can be complex and may break some sites
  // if (sessionId) {
  //   // Rewrite src and href attributes
  //   html = html.replace(
  //     /(?:src|href)="(https?:\/\/[^"]+)"/gi,
  //     (match, url) => {
  //       const encodedUrl = encodeURIComponent(url)
  //       return match.replace(url, `${proxyBaseUrl}/${sessionId}/${encodedUrl}`)
  //     }
  //   )
  // }
  
  return html
}

interface MetricsData {
  sessionId: string
  userId: string
  targetUrl: string
  responseSize: number
  responseTime: number
  statusCode: number
  method: string
  userAgent: string | null
  contentType: string | null
}

async function updateMetricsAndLogs(supabase: any, data: MetricsData): Promise<void> {
  // Update session metrics
  try {
    await supabase.rpc('update_session_metrics', {
      p_session_id: data.sessionId,
      p_bytes_transferred: data.responseSize,
      p_response_time_ms: data.responseTime
    })
  } catch (error) {
    console.error('Failed to update metrics:', error)
  }

  // Log the request
  try {
    await supabase.from('usage_logs').insert({
      user_id: data.userId,
      session_id: data.sessionId,
      event_type: 'page_request',
      target_url: data.targetUrl,
      bytes_transferred: data.responseSize,
      response_time_ms: data.responseTime,
      status_code: data.statusCode,
      metadata: {
        method: data.method,
        content_type: data.contentType,
        user_agent: data.userAgent,
      }
    })
  } catch (error) {
    console.error('Failed to log request:', error)
  }
} 