import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { DOMParser, Element, Document } from 'jsr:@b-fuze/deno-dom'
import { getSupabaseClient } from '../_shared/supabase.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

// SSR Processing Types and Functions
interface SSRProcessingOptions {
  targetUrl: string
  sessionId?: string
  proxyBaseUrl: string
  removeScripts?: boolean
  inlineStyles?: boolean
}

function processHtmlForSSR(
  html: string, 
  options: SSRProcessingOptions
): string {
  const { targetUrl, sessionId, proxyBaseUrl, removeScripts = true, inlineStyles = false } = options
  
  // Parse HTML using deno-dom
  const doc = new DOMParser().parseFromString(html, 'text/html')
  if (!doc) {
    console.warn('Failed to parse HTML document')
    return html
  }

  const targetUrlObj = new URL(targetUrl)
  const baseUrl = `${targetUrlObj.protocol}//${targetUrlObj.host}`

  // Remove problematic security headers from meta tags
  removeSecurityMetaTags(doc)
  
  // Inject base tag for proper resource resolution
  injectBaseTag(doc, baseUrl)
  
  // Transform URLs to absolute paths
  transformUrls(doc, targetUrl)
  
  // Remove or modify problematic scripts
  if (removeScripts) {
    removeProblematicScripts(doc)
  }
  
  // Handle stylesheets
  if (inlineStyles) {
    // Note: Async operations would need to be handled separately
    transformStylesheetUrls(doc, targetUrl)
  } else {
    transformStylesheetUrls(doc, targetUrl)
  }
  
  // Add SSR metadata
  addSSRMetadata(doc, sessionId)
  
  return doc.documentElement?.outerHTML || html
}

function removeSecurityMetaTags(doc: Document): void {
  // Remove CSP and X-Frame-Options meta tags
  const securityMetas = doc.querySelectorAll(
    'meta[http-equiv*="Content-Security-Policy"], ' +
    'meta[http-equiv*="X-Frame-Options"], ' +
    'meta[http-equiv*="content-security-policy"], ' +
    'meta[http-equiv*="x-frame-options"]'
  )
  
  securityMetas.forEach(meta => meta.remove())
}

function injectBaseTag(doc: Document, baseUrl: string): void {
  const head = doc.querySelector('head')
  if (!head) return
  
  // Remove existing base tags
  const existingBase = head.querySelector('base')
  if (existingBase) {
    existingBase.remove()
  }
  
  // Create new base tag
  const baseTag = doc.createElement('base')
  baseTag.setAttribute('href', `${baseUrl}/`)
  head.insertBefore(baseTag, head.firstChild)
}

function transformUrls(doc: Document, targetUrl: string): void {
  const urlAttributes = ['href', 'src', 'action', 'data-src', 'data-href']
  
  urlAttributes.forEach(attr => {
    const elements = doc.querySelectorAll(`[${attr}]`)
    
    elements.forEach((element: Element) => {
      const value = element.getAttribute(attr)
      if (!value || value.startsWith('http') || value.startsWith('data:') || value.startsWith('#')) {
        return
      }
      
      try {
        const absoluteUrl = new URL(value, targetUrl).href
        element.setAttribute(attr, absoluteUrl)
      } catch (error) {
        console.warn(`Failed to transform URL: ${value}`, error)
      }
    })
  })
}

function removeProblematicScripts(doc: Document): void {
  // Remove analytics, tracking, and ad scripts
  const problematicSelectors = [
    'script[src*="analytics"]',
    'script[src*="tracking"]',
    'script[src*="ads"]',
    'script[src*="googletagmanager"]',
    'script[async][src*="google"]',
    'iframe[src*="ads"]'
  ]
  
  problematicSelectors.forEach(selector => {
    const elements = doc.querySelectorAll(selector)
    elements.forEach(el => el.remove())
  })
}

function transformStylesheetUrls(doc: Document, targetUrl: string): void {
  const styleElements = doc.querySelectorAll('link[rel="stylesheet"]')
  
  styleElements.forEach((element: Element) => {
    const href = element.getAttribute('href')
    if (href && !href.startsWith('http') && !href.startsWith('data:')) {
      try {
        const absoluteUrl = new URL(href, targetUrl).href
        element.setAttribute('href', absoluteUrl)
      } catch (error) {
        console.warn(`Failed to transform stylesheet URL: ${href}`, error)
      }
    }
  })
}

function addSSRMetadata(doc: Document, sessionId?: string): void {
  const head = doc.querySelector('head')
  if (!head) return
  
  // Add SSR indicator
  const ssrMeta = doc.createElement('meta')
  ssrMeta.setAttribute('name', 'proxy-ssr-enabled')
  ssrMeta.setAttribute('content', 'true')
  head.appendChild(ssrMeta)
  
  // Add session information if available
  if (sessionId) {
    const sessionMeta = doc.createElement('meta')
    sessionMeta.setAttribute('name', 'proxy-session-id')
    sessionMeta.setAttribute('content', sessionId)
    head.appendChild(sessionMeta)
  }
}

function createSSRResponseHeaders(
  proxyResponse: Response, 
  responseTime: number,
  mode: 'permissive' | 'balanced' | 'strict' = 'balanced'
): Headers {
  const responseHeaders = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
  })

  // Copy safe response headers
  const safeHeaders = [
    'content-type',
    'content-language',
    'cache-control',
    'expires',
    'last-modified'
  ]

  // Remove all potentially problematic security headers
  const excludedHeaders = [
    'content-security-policy',
    'content-security-policy-report-only',
    'x-frame-options',
    'x-content-type-options',
    'strict-transport-security',
    'permissions-policy',
    'feature-policy',
    'referrer-policy'
  ]

  for (const [key, value] of proxyResponse.headers.entries()) {
    const lowerKey = key.toLowerCase()
    if (safeHeaders.includes(lowerKey) && !excludedHeaders.includes(lowerKey)) {
      responseHeaders.set(key, value)
    }
  }

  // Set CSP based on mode
  const cspPolicies = {
    permissive: "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
                "script-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
                "style-src * 'unsafe-inline' data: blob:; " +
                "img-src * data: blob:; " +
                "font-src * data: blob:; " +
                "connect-src * data: blob:; " +
                "frame-ancestors *;",
    
    balanced: "default-src 'self' * data: blob: 'unsafe-inline'; " +
              "script-src 'self' * 'unsafe-inline' 'unsafe-eval'; " +
              "style-src 'self' * 'unsafe-inline'; " +
              "img-src * data: blob:; " +
              "frame-ancestors *;",
    
    strict: "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data:; " +
            "frame-ancestors 'self';"
  }

  responseHeaders.set('Content-Security-Policy', cspPolicies[mode])
  responseHeaders.set('X-Proxy-Status', 'ssr-success')
  responseHeaders.set('X-Response-Time', responseTime.toString())
  responseHeaders.set('X-Proxy-Mode', 'ssr')

  return responseHeaders
}

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  const supabase = getSupabaseClient()

  try {
    const url = new URL(req.url)
    
    // Parse the request to determine proxy mode and extract parameters
    const { mode, sessionId, targetUrl } = parseProxyRequest(url)
    
    // Check for SSR mode parameter
    const ssrMode = url.searchParams.get('ssr') === 'true'
    const cspMode = url.searchParams.get('csp') as 'permissive' | 'balanced' | 'strict' || 'balanced'
    
    // If no target URL is provided, return a helpful message instead of error
    if (!targetUrl) {
      // Check if this is just a test request to the function endpoint
      if (!sessionId) {
        return new Response(
          JSON.stringify({ 
            message: 'Enhanced Proxy Service v2.0 - SSR Enabled',
            status: 'operational',
            features: {
              ssr: 'Server-side rendering for CSP bypass',
              modes: ['iframe', 'ssr', 'auto'],
              cspLevels: ['permissive', 'balanced', 'strict'],
              defaultMode: 'ssr',
              defaultCsp: 'permissive'
            },
            usage: {
              basic: 'GET /proxy-service/{sessionId}/{encodedTargetUrl}',
              withSSR: 'GET /proxy-service/{sessionId}/{encodedTargetUrl}?ssr=true&csp=permissive',
              example: 'GET /proxy-service/abc123/https%3A%2F%2Fexample.com?ssr=true&csp=permissive'
            },
            version: '2.0.0'
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
      
      if (ssrMode) {
        // Use enhanced SSR processing
        responseBody = processHtmlForSSR(htmlText, {
          targetUrl: validatedUrl,
          sessionId,
          proxyBaseUrl: `${url.origin}${url.pathname.split('/proxy-service')[0]}/proxy-service`,
          removeScripts: true,
          inlineStyles: false
        })
      } else {
        // Fall back to existing iframe processing
        const modifiedHtml = modifyHtmlForProxy(htmlText, validatedUrl, sessionId, url.origin + url.pathname.split('/proxy-service')[0] + '/proxy-service')
        responseBody = modifiedHtml
      }
    } else if (contentType.includes('text/css')) {
      // Transform CSS content
      const cssText = await proxyResponse.text()
      responseSize = new TextEncoder().encode(cssText).length
      responseBody = transformCssContent(cssText, validatedUrl)
    } else {
      // For non-HTML/CSS content, just pass through as-is
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
    const responseHeaders = ssrMode ? 
      createSSRResponseHeaders(proxyResponse, endTime - startTime, cspMode) :
      createResponseHeaders(proxyResponse, responseTime)

    // Add telemetry for SSR mode usage
    if (mode === 'authenticated' && sessionId && userId) {
      try {
        await supabase.from('usage_logs').insert({
          user_id: userId,
          session_id: sessionId,
          event_type: 'proxy_mode',
          metadata: {
            mode: ssrMode ? 'ssr' : 'iframe',
            csp_level: ssrMode ? cspMode : null,
            url: validatedUrl,
            response_time_ms: responseTime,
            status_code: proxyResponse.status,
            content_type: contentType
          }
        })
      } catch (error) {
        console.error('Failed to log SSR telemetry:', error)
      }
    }

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
  // Get the origin from the request
  const origin = proxyResponse.headers.get('origin')
  
  // Create response headers with dynamic CORS headers
  const responseHeaders = new Headers({
    ...corsHeaders,
    'Access-Control-Allow-Origin': origin || corsHeaders['Access-Control-Allow-Origin'],
    'Access-Control-Allow-Credentials': 'true'
  })
  
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
  
  // IMPORTANT: Remove X-Frame-Options completely to allow iframe embedding
  responseHeaders.delete('X-Frame-Options')
  
  // Set a MORE permissive CSP for proxied content - Updated to allow scripts and styles
  responseHeaders.set('Content-Security-Policy', 
    "default-src 'self' * data: blob:; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' * data: blob:; " +
    "style-src 'self' 'unsafe-inline' * data: blob:; " +
    "img-src 'self' * data: blob:; " +
    "font-src 'self' * data: blob:; " +
    "connect-src 'self' * data: blob:; " +
    "media-src 'self' * data: blob:; " +
    "object-src 'none'; " +
    "frame-src 'self' * data: blob:; " +
    "worker-src 'self' * blob:; " +
    "form-action 'self' *; " +
    "frame-ancestors *; " +  // Changed from 'self' * to just * to allow any origin
    "base-uri 'self' *; " +
    "manifest-src 'self' *"
  )
  
  // Remove X-Content-Type-Options to allow flexible content handling
  responseHeaders.delete('X-Content-Type-Options')
  
  // Also remove any other headers that might prevent iframe embedding
  responseHeaders.delete('Permissions-Policy')
  responseHeaders.delete('Feature-Policy')
  
  return responseHeaders
}

function modifyHtmlForProxy(html: string, targetUrl: string, sessionId: string | undefined, proxyBaseUrl: string): string {
  // Parse the target URL to get the base URL
  const targetUrlObj = new URL(targetUrl)
  const baseUrl = `${targetUrlObj.protocol}//${targetUrlObj.host}`
  
  // Remove any X-Frame-Options meta tags from the HTML
  html = html.replace(/<meta[^>]*http-equiv=["']?X-Frame-Options["']?[^>]*>/gi, '')
  
  // Remove any Content-Security-Policy meta tags that might restrict iframe usage
  html = html.replace(/<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, '')
  
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
  
  // Transform relative URLs to absolute in HTML attributes
  html = html.replace(
    /(href|src|action|data-src|data-href)=["'](?!https?:\/\/|data:)([^"']+)["']/gi,
    (match, attr, url) => {
      try {
        const absoluteUrl = new URL(url, targetUrl).href
        return `${attr}="${absoluteUrl}"`
      } catch {
        return match
      }
    }
  )
  
  // Transform srcset attributes (for responsive images)
  html = html.replace(
    /srcset=["']([^"']+)["']/gi,
    (match, srcset) => {
      const transformedSrcset = srcset.split(',').map((src: string) => {
        const [url, descriptor] = src.trim().split(/\s+/)
        if (!url.match(/^https?:\/\//)) {
          try {
            const absoluteUrl = new URL(url, targetUrl).href
            return descriptor ? `${absoluteUrl} ${descriptor}` : absoluteUrl
          } catch {
            return src
          }
        }
        return src
      }).join(', ')
      return `srcset="${transformedSrcset}"`
    }
  )
  
  // Remove sandbox attributes from any iframes in the content to allow full functionality
  html = html.replace(/<iframe([^>]*)sandbox=["'][^"']*["']([^>]*)>/gi, '<iframe$1$2>')
  
  // Enhanced helper script with better navigation handling
  const helperScript = `
    <script>
      // Helper script for proxy compatibility
      (function() {
        // Store the original base URL
        window.__proxyBaseUrl = '${baseUrl}';
        window.__proxyServiceUrl = '${proxyBaseUrl}';
        window.__proxySessionId = '${sessionId || ''}';
        window.__targetUrl = '${targetUrl}';
        
        // Override fetch to handle relative URLs and proxy all requests
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
          if (typeof url === 'string') {
            // Convert relative URLs to absolute
            if (!url.match(/^https?:\\/\\//)) {
              url = new URL(url, window.__targetUrl).href;
            }
            // Optionally proxy external requests through our service
            // if (window.__proxySessionId && !url.startsWith(window.location.origin)) {
            //   url = window.__proxyServiceUrl + '/' + window.__proxySessionId + '/' + encodeURIComponent(url);
            // }
          }
          return originalFetch.apply(this, [url, options]);
        };
        
        // Override XMLHttpRequest to handle relative URLs
        const OriginalXHR = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
          const xhr = new OriginalXHR();
          const originalOpen = xhr.open;
          xhr.open = function(method, url, ...args) {
            if (typeof url === 'string' && !url.match(/^https?:\\/\\//)) {
              url = new URL(url, window.__targetUrl).href;
            }
            return originalOpen.apply(this, [method, url, ...args]);
          };
          return xhr;
        };
        
        // Enhanced navigation handling
        function navigateThroughProxy(url) {
          if (window.__proxySessionId) {
            const absoluteUrl = new URL(url, window.__targetUrl).href;
            const encodedUrl = encodeURIComponent(absoluteUrl);
            window.top.location.href = window.__proxyServiceUrl + '/' + window.__proxySessionId + '/' + encodedUrl;
          } else {
            window.top.location.href = url;
          }
        }
        
        // Intercept link clicks for navigation through proxy
        document.addEventListener('click', function(e) {
          const link = e.target.closest('a');
          if (link && link.href && !link.target && !link.download) {
            e.preventDefault();
            navigateThroughProxy(link.href);
          }
        }, true);
        
        // Intercept form submissions
        document.addEventListener('submit', function(e) {
          const form = e.target;
          if (form && form.action && form.method.toLowerCase() === 'get') {
            e.preventDefault();
            const formData = new FormData(form);
            const params = new URLSearchParams(formData);
            const targetUrl = form.action + '?' + params.toString();
            navigateThroughProxy(targetUrl);
          }
        }, true);
        
        // Allow message passing for script execution
        window.addEventListener('message', function(e) { 
          if (e.data && e.data.type === 'execute-script') {
            try { 
              eval(e.data.code); 
            } catch(err) { 
              console.error('Script execution error:', err); 
            }
          }
          // Handle navigation messages from parent
          if (e.data && e.data.type === 'navigate') {
            navigateThroughProxy(e.data.url);
          }
        });
        
        // Override window.location to handle navigation
        try {
          const locationProxy = new Proxy(window.location, {
            get: function(target, prop) {
              if (prop === 'href' || prop === 'toString') {
                return window.__targetUrl;
              }
              if (prop === 'assign' || prop === 'replace') {
                return function(url) {
                  navigateThroughProxy(url);
                };
              }
              return target[prop];
            },
            set: function(target, prop, value) {
              if (prop === 'href') {
                navigateThroughProxy(value);
                return true;
              }
              target[prop] = value;
              return true;
            }
          });
          
          Object.defineProperty(window, 'location', {
            get: () => locationProxy,
            set: (value) => {
              navigateThroughProxy(value);
            },
            configurable: true
          });
        } catch (e) {
          console.warn('Could not override window.location:', e);
        }
        
        // Override history API
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = function(...args) {
          const [state, title, url] = args;
          if (url) {
            navigateThroughProxy(url);
          } else {
            originalPushState.apply(history, args);
          }
        };
        
        history.replaceState = function(...args) {
          const [state, title, url] = args;
          if (url) {
            navigateThroughProxy(url);
          } else {
            originalReplaceState.apply(history, args);
          }
        };
      })();
    </script>
  `
  
  // Inject the helper script after the base tag or at the beginning of head
  if (html.includes('</head>')) {
    html = html.replace('</head>', helperScript + '\n</head>')
  } else if (html.includes('<body')) {
    html = html.replace(/<body([^>]*)>/i, `${helperScript}\n<body$1>`)
  } else {
    // If no proper HTML structure, add at the beginning
    html = helperScript + '\n' + html
  }
  
  return html
}

function transformCssContent(css: string, baseUrl: string): string {
  // Transform relative URLs in CSS to absolute URLs
  return css.replace(
    /url\(["']?(?!https?:\/\/|data:)([^"')]+)["']?\)/gi,
    (match, url) => {
      try {
        // Remove any quotes and whitespace
        const cleanUrl = url.trim().replace(/^["']|["']$/g, '')
        const absoluteUrl = new URL(cleanUrl, baseUrl).href
        return `url("${absoluteUrl}")`
      } catch {
        return match
      }
    }
  )
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