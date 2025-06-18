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

// Enhanced function to sanitize and rewrite problematic cross-origin content
function sanitizeCrossOriginContent(doc: Document, targetUrl: string): {
  blockedScripts: number
  blockedFrames: number
  sanitizedInlineScripts: number
} {
  const targetOrigin = new URL(targetUrl).origin
  const metrics = {
    blockedScripts: 0,
    blockedFrames: 0,
    sanitizedInlineScripts: 0
  }

  // Enhanced script sanitization with whitelisting support
  const scriptWhitelist = [
    'https://cdn.jsdelivr.net',
    'https://unpkg.com',
    'https://cdnjs.cloudflare.com'
  ]

  // Remove or modify scripts that attempt cross-origin access
  const crossOriginScripts = doc.querySelectorAll('script[src]')
  crossOriginScripts.forEach((script: Element) => {
    const src = script.getAttribute('src')
    if (src) {
      try {
        const scriptUrl = new URL(src, targetUrl)
        const isWhitelisted = scriptWhitelist.some(domain => scriptUrl.origin.includes(domain))
        
        if (scriptUrl.origin !== targetOrigin && !isWhitelisted) {
          // Convert cross-origin scripts to safe placeholders
          script.setAttribute('data-original-src', src)
          script.setAttribute('data-blocked-origin', scriptUrl.origin)
          script.removeAttribute('src')
          
          // Add a safe placeholder script
          const safeScript = doc.createElement('script')
          safeScript.textContent = `console.info('[Proxy] Cross-origin script blocked:', '${src}');`
          script.parentNode?.replaceChild(safeScript, script)
          
          metrics.blockedScripts++
        }
      } catch (error) {
        console.warn(`[Proxy] Failed to process script URL: ${src}`, error)
        script.remove()
        metrics.blockedScripts++
      }
    }
  })

  // Enhanced iframe handling with security attributes
  const iframes = doc.querySelectorAll('iframe[src]')
  iframes.forEach((iframe: Element) => {
    const src = iframe.getAttribute('src')
    if (src) {
      try {
        const iframeUrl = new URL(src, targetUrl)
        if (iframeUrl.origin !== targetOrigin) {
          // Apply strict sandboxing to cross-origin iframes
          iframe.setAttribute('sandbox', 'allow-scripts allow-forms')
          iframe.setAttribute('data-original-src', src)
          iframe.setAttribute('data-cross-origin', 'true')
          iframe.setAttribute('loading', 'lazy')
          
          // Add CSP for the iframe
          iframe.setAttribute('csp', "default-src 'none'; script-src 'none';")
          
          metrics.blockedFrames++
        }
      } catch (error) {
        console.warn(`[Proxy] Failed to process iframe URL: ${src}`, error)
        iframe.remove()
        metrics.blockedFrames++
      }
    }
  })

  // Remove postMessage and parent frame access attempts
  const inlineMetrics = removeFrameAccessScripts(doc)
  metrics.sanitizedInlineScripts = inlineMetrics.sanitizedCount

  return metrics
}

function removeFrameAccessScripts(doc: Document): { sanitizedCount: number } {
  const inlineScripts = doc.querySelectorAll('script:not([src])')
  let sanitizedCount = 0
  
  inlineScripts.forEach((script: Element) => {
    const content = script.textContent || ''
    
    // Enhanced patterns that commonly cause cross-origin violations
    const problematicPatterns = [
      { pattern: /window\.parent/gi, replacement: 'window.self' },
      { pattern: /window\.top/gi, replacement: 'window.self' },
      { pattern: /parent\.postMessage/gi, replacement: 'console.log' },
      { pattern: /top\.postMessage/gi, replacement: 'console.log' },
      { pattern: /document\.domain/gi, replacement: '""' },
      { pattern: /window\.frames/gi, replacement: '[]' },
      { pattern: /\.contentWindow/gi, replacement: '.contentDocument' },
      { pattern: /window\.frameElement/gi, replacement: 'null' }
    ]

    let modifiedContent = content
    let hasProblematicCode = false
    
    for (const { pattern, replacement } of problematicPatterns) {
      if (pattern.test(modifiedContent)) {
        hasProblematicCode = true
        modifiedContent = modifiedContent.replace(pattern, replacement)
      }
    }

    if (hasProblematicCode) {
      script.setAttribute('data-original-content', content)
      script.setAttribute('data-sanitized', 'true')
      script.textContent = `// [Proxy] Script sanitized for cross-origin safety\ntry {\n${modifiedContent}\n} catch(e) { console.warn('[Proxy] Sanitized script error:', e); }`
      sanitizedCount++
    }
  })
  
  return { sanitizedCount }
}

function addIntelligentResourceHints(doc: Document, targetUrl: string): number {
  const head = doc.querySelector('head')
  if (!head) return 0

  const targetOrigin = new URL(targetUrl).origin
  let hintsAdded = 0

  // Add DNS prefetch for cross-origin resources
  const crossOriginResources = new Set<string>()
  
  // Collect cross-origin resources
  doc.querySelectorAll('[src], [href]').forEach((element: Element) => {
    const url = element.getAttribute('src') || element.getAttribute('href')
    if (url && !url.startsWith('#') && !url.startsWith('data:')) {
      try {
        const resourceUrl = new URL(url, targetUrl)
        if (resourceUrl.origin !== targetOrigin && resourceUrl.protocol.startsWith('http')) {
          crossOriginResources.add(resourceUrl.origin)
        }
      } catch (error) {
        // Invalid URL, skip
      }
    }
  })

  // Add DNS prefetch hints
  crossOriginResources.forEach(origin => {
    const dnsPrefetch = doc.createElement('link')
    dnsPrefetch.setAttribute('rel', 'dns-prefetch')
    dnsPrefetch.setAttribute('href', origin)
    dnsPrefetch.setAttribute('data-added-by', 'ssr-optimizer')
    head.appendChild(dnsPrefetch)
    hintsAdded++
  })
  
  return hintsAdded
}

function addOptimizedCSPMeta(doc: Document): void {
  const head = doc.querySelector('head')
  if (!head) return

  // Add a permissive but controlled CSP via meta tag
  const cspMeta = doc.createElement('meta')
  cspMeta.setAttribute('http-equiv', 'Content-Security-Policy')
  cspMeta.setAttribute('content', 
    "default-src * data: blob: 'unsafe-inline' 'unsafe-eval'; " +
    "script-src * data: blob: 'unsafe-inline' 'unsafe-eval'; " +
    "style-src * data: blob: 'unsafe-inline'; " +
    "img-src * data: blob:; " +
    "media-src * data: blob: https:; " +
    "connect-src * data: blob:; " +
    "frame-src * data: blob:; " +
    "frame-ancestors *; " +
    "base-uri *;"
  )
  head.appendChild(cspMeta)
}

// Enhanced logging with structured data
function logSSROptimizations(
  targetUrl: string, 
  optimizations: string[],
  metrics?: {
    sanitization?: ReturnType<typeof sanitizeCrossOriginContent>
    preloads?: ReturnType<typeof removeOrModifyVideoPreloads>
  }
): void {
  const logData = {
    url: targetUrl,
    timestamp: new Date().toISOString(),
    optimizations: optimizations.length,
    details: optimizations,
    metrics: {
      totalBlockedScripts: metrics?.sanitization?.blockedScripts || 0,
      totalBlockedFrames: metrics?.sanitization?.blockedFrames || 0,
      totalSanitizedInline: metrics?.sanitization?.sanitizedInlineScripts || 0,
      totalVideoOptimizations: metrics?.preloads?.videoPreloadsOptimized || 0,
      totalHLSRemoved: metrics?.preloads?.hlsSegmentsRemoved || 0,
      totalResourceHints: metrics?.preloads?.resourceHintsAdded || 0
    }
  }
  
  console.log('[SSR Proxy] Optimizations applied:', logData)
}

function processHtmlForSSR(
  html: string, 
  options: SSRProcessingOptions
): string {
  const { targetUrl, sessionId, proxyBaseUrl, removeScripts = true, inlineStyles = false } = options
  
  const doc = new DOMParser().parseFromString(html, 'text/html')
  if (!doc) {
    console.warn('Failed to parse HTML document')
    return html
  }

  const targetUrlObj = new URL(targetUrl)
  const baseUrl = `${targetUrlObj.protocol}//${targetUrlObj.host}`
  const optimizations: string[] = []

  // Remove problematic security headers from meta tags
  removeSecurityMetaTags(doc)
  optimizations.push('removed-security-meta-tags')

  // Inject base tag for proper resource resolution
  injectBaseTag(doc, baseUrl)
  optimizations.push('injected-base-tag')

  // **NEW: Sanitize cross-origin content**
  const sanitizationMetrics = sanitizeCrossOriginContent(doc, targetUrl)
  optimizations.push(`sanitized-cross-origin-content: ${sanitizationMetrics.blockedScripts} scripts, ${sanitizationMetrics.blockedFrames} frames, ${sanitizationMetrics.sanitizedInlineScripts} inline`)

  // Transform URLs to absolute paths
  transformUrls(doc, targetUrl)
  optimizations.push('transformed-urls')

  // Remove or modify problematic scripts
  if (removeScripts) {
    removeProblematicScripts(doc)
    optimizations.push('removed-problematic-scripts')
  }

  // **ENHANCED: Better preload resource management**
  const preloadMetrics = removeOrModifyVideoPreloads(doc, targetUrl)
  optimizations.push(`optimized-preloads: ${preloadMetrics.videoPreloadsOptimized} videos, ${preloadMetrics.hlsSegmentsRemoved} HLS, ${preloadMetrics.crossOriginPreloadsFixed} cross-origin, ${preloadMetrics.resourceHintsAdded} hints`)

  // Optimize video elements for lazy loading
  optimizeVideoPreloads(doc)
  optimizations.push('optimized-video-elements')

  // **NEW: Add Content Security Policy meta tag**
  addOptimizedCSPMeta(doc)
  optimizations.push('added-optimized-csp')

  // Add SSR metadata
  addSSRMetadata(doc, sessionId)
  optimizations.push('added-ssr-metadata')

  // Use enhanced logging with metrics
  logSSROptimizations(targetUrl, optimizations, {
    sanitization: sanitizationMetrics,
    preloads: preloadMetrics
  })
  
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

function removeOrModifyVideoPreloads(doc: Document, targetUrl: string): {
  videoPreloadsOptimized: number
  hlsSegmentsRemoved: number
  crossOriginPreloadsFixed: number
  resourceHintsAdded: number
} {
  const metrics = {
    videoPreloadsOptimized: 0,
    hlsSegmentsRemoved: 0,
    crossOriginPreloadsFixed: 0,
    resourceHintsAdded: 0
  }
  
  // Enhanced preload management for various resource types
  const preloadLinks = doc.querySelectorAll('link[rel="preload"]')
  
  preloadLinks.forEach((link: Element) => {
    const href = link.getAttribute('href')
    const asAttribute = link.getAttribute('as')
    
    if (!href) return

    try {
      const resourceUrl = new URL(href, targetUrl)
      
      // Handle different resource types
      if (asAttribute === 'video' || href.includes('.m3u8') || href.includes('.mp4')) {
        // Convert video preloads to prefetch
        link.setAttribute('rel', 'prefetch')
        link.removeAttribute('as')
        link.setAttribute('data-converted', 'video-preload-to-prefetch')
        metrics.videoPreloadsOptimized++
      } else if (href.includes('.ts') || href.includes('hls')) {
        // Remove HLS segment preloads entirely
        link.remove()
        metrics.hlsSegmentsRemoved++
      } else if (asAttribute === 'script' && resourceUrl.origin !== new URL(targetUrl).origin) {
        // Handle cross-origin script preloads
        link.setAttribute('rel', 'prefetch')
        link.setAttribute('crossorigin', 'anonymous')
        link.setAttribute('data-converted', 'cross-origin-script')
        metrics.crossOriginPreloadsFixed++
      } else if (asAttribute === 'style' && resourceUrl.origin !== new URL(targetUrl).origin) {
        // Handle cross-origin style preloads
        link.setAttribute('rel', 'prefetch')
        link.setAttribute('crossorigin', 'anonymous')
        link.setAttribute('data-converted', 'cross-origin-style')
        metrics.crossOriginPreloadsFixed++
      }
    } catch (error) {
      console.warn(`[Proxy] Failed to process preload URL: ${href}`, error)
      link.remove()
    }
  })

  // Add intelligent resource hints for better performance
  const hintsAdded = addIntelligentResourceHints(doc, targetUrl)
  metrics.resourceHintsAdded = hintsAdded
  
  return metrics
}

function optimizeVideoPreloads(doc: Document): void {
  const videoElements = doc.querySelectorAll('video')
  
  videoElements.forEach((video: Element) => {
    // Set preload to metadata for HLS videos to reduce bandwidth
    const src = video.getAttribute('src')
    if (src && (src.includes('.m3u8') || src.includes('hls'))) {
      video.setAttribute('preload', 'metadata')
    }
    
    // Add data attribute for lazy loading detection
    video.setAttribute('data-lazy-video', 'true')
  })
}

// BrowserQL Integration - Enhanced SSR Proxy with Bot Detection Bypass
// Updated BrowserQL configuration for Amsterdam endpoint
const BROWSERQL_ENDPOINT = 'https://production-ams.browserless.io/chromium/bql'
const BROWSERQL_TOKEN = Deno.env.get('BROWSERQL_TOKEN') || '2SWMmTcJ5Xy9YFNd1c30ebed5875c88c3a2b2505ba65ccedb'

interface BrowserQLRenderOptions {
  targetUrl: string
  sessionId?: string
  waitUntil?: 'load' | 'domcontentloaded' | 'networkIdle' | 'firstMeaningfulPaint' | 'firstContentfulPaint'
  timeout?: number
  viewport?: { width: number; height: number }
  userAgent?: string
  useProxy?: boolean
  proxyCountry?: string
  bypassBot?: boolean
  solveCaptcha?: boolean
}

interface BrowserQLResponse {
  data?: {
    goto?: { status: number }
    html?: { html: string }
    screenshot?: { base64: string }
    verify?: { found: boolean; solved: boolean; time: number }
    captcha?: { found: boolean; solved: boolean; time: number }
  }
  errors?: Array<{ message: string }>
}

async function renderWithBrowserQL(
  options: BrowserQLRenderOptions
): Promise<{ html: string; screenshot?: string; error?: string; metadata?: any }> {
  
  const {
    targetUrl,
    sessionId,
    waitUntil = 'networkIdle',
    timeout = 30000,
    viewport = { width: 1920, height: 1080 },
    userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    useProxy = true,
    proxyCountry = 'nl', // Netherlands for Amsterdam region
    bypassBot = true,
    solveCaptcha = true
  } = options

  if (!BROWSERQL_TOKEN) {
    console.error('BROWSERQL_TOKEN environment variable is not set')
    throw new Error('BrowserQL configuration error')
  }

  try {
    console.log(`Rendering ${targetUrl} with BrowserQL (Amsterdam region)`)
    
    // Build the GraphQL query with conditional bot detection bypass
    const query = `
      mutation RenderPage($url: String!) {
        goto(url: $url, waitUntil: ${waitUntil}) {
          status
        }
        
        ${bypassBot ? `
        # Bypass Cloudflare and other bot detection
        verify(type: cloudflare) {
          found
          solved
          time
        }
        ` : ''}
        
        ${solveCaptcha ? `
        # Solve CAPTCHAs if present
        verify(type: hcaptcha) {
          found
          solved
          time
        }
        ` : ''}
        
        # Get the page HTML
        html {
          html
        }
        
        # Optional: Get screenshot for debugging
        screenshot(type: jpeg, quality: 80) {
          base64
        }
      }
    `

    // Build query parameters for enhanced bot detection bypass
    const queryParams = new URLSearchParams({
      token: BROWSERQL_TOKEN,
      timeout: timeout.toString(),
      ...(useProxy && {
        proxy: 'residential',
        proxyCountry,
        proxySticky: 'true' // Maintain same IP for entire session
      })
    })
    
    const requestBody = {
      query,
      variables: { url: targetUrl }
    }

    console.log('BrowserQL request:', { targetUrl, useProxy, proxyCountry, bypassBot })
    
    const response = await fetch(`${BROWSERQL_ENDPOINT}?${queryParams.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': userAgent
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`BrowserQL API error (${response.status}): ${errorText}`)
    }

    const result: BrowserQLResponse = await response.json()
    
    if (result.errors && result.errors.length > 0) {
      throw new Error(`BrowserQL GraphQL errors: ${result.errors.map(e => e.message).join(', ')}`)
    }

    if (!result.data?.html?.html) {
      throw new Error('No HTML content received from BrowserQL')
    }

    // Extract metadata about bot detection bypass
    const metadata = {
      status: result.data.goto?.status || 200,
      botDetectionBypassed: !!result.data.verify?.solved,
      captchaSolved: !!result.data.captcha?.solved,
      cloudflareFound: !!result.data.verify?.found,
      captchaFound: !!result.data.captcha?.found,
      verificationTime: result.data.verify?.time || 0,
      captchaTime: result.data.captcha?.time || 0
    }

    // Post-process the rendered HTML
    const processedHtml = postProcessBrowserQLHTML(result.data.html.html, targetUrl, sessionId, metadata)
    
    console.log('BrowserQL rendering successful:', {
      url: targetUrl,
      status: metadata.status,
      botDetectionBypassed: metadata.botDetectionBypassed,
      captchaSolved: metadata.captchaSolved
    })
    
    return { 
      html: processedHtml,
      screenshot: result.data.screenshot?.base64,
      metadata
    }
    
  } catch (error) {
    console.error('BrowserQL rendering failed:', error)
    return { 
      html: '', 
      error: `BrowserQL rendering failed: ${error.message}` 
    }
  }
}

// Enhanced post-processing for BrowserQL rendered content
function postProcessBrowserQLHTML(
  html: string, 
  targetUrl: string, 
  sessionId?: string,
  metadata?: any
): string {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    if (!doc) return html

    const head = doc.querySelector('head')
    if (!head) return html

    // Remove existing base tags
    const existingBase = head.querySelector('base')
    if (existingBase) existingBase.remove()
    
    // Inject base tag for proper resource resolution
    const baseTag = doc.createElement('base')
    baseTag.setAttribute('href', new URL(targetUrl).origin + '/')
    head.insertBefore(baseTag, head.firstChild)

    // Add BrowserQL metadata
    const browserqlMeta = doc.createElement('meta')
    browserqlMeta.setAttribute('name', 'browserql-rendered')
    browserqlMeta.setAttribute('content', 'true')
    head.appendChild(browserqlMeta)

    if (sessionId) {
      const sessionMeta = doc.createElement('meta')
      sessionMeta.setAttribute('name', 'proxy-session-id')
      sessionMeta.setAttribute('content', sessionId)
      head.appendChild(sessionMeta)
    }

    // Add metadata about bot detection bypass
    if (metadata) {
      const metadataMeta = doc.createElement('meta')
      metadataMeta.setAttribute('name', 'browserql-metadata')
      metadataMeta.setAttribute('content', JSON.stringify(metadata))
      head.appendChild(metadataMeta)
    }

    // Remove any remaining frame-busting scripts
    const scripts = doc.querySelectorAll('script')
    scripts.forEach(script => {
      const content = script.textContent || ''
      if (content.includes('top.location') || 
          content.includes('parent.location') ||
          content.includes('window.top') ||
          content.includes('frameElement')) {
        script.remove()
      }
    })

    return doc.documentElement?.outerHTML || html
  } catch (error) {
    console.warn('BrowserQL post-processing failed, returning original HTML:', error)
    return html
  }
}

// Fallback handler for when BrowserQL fails
async function handleFallbackProxy(
  req: Request, 
  validatedUrl: string, 
  responseTime: number
): Promise<Response> {
  try {
    // Use the existing proxy logic as fallback
    const proxyHeaders = createProxyHeaders(req)
    const proxyResponse = await fetch(validatedUrl, {
      method: req.method,
      headers: proxyHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      redirect: 'follow',
    })
    
    const contentType = proxyResponse.headers.get('content-type') || ''
    let responseBody: ArrayBuffer | string
    
    if (contentType.includes('text/html')) {
      const htmlText = await proxyResponse.text()
      responseBody = modifyHtmlForProxy(
        htmlText, 
        validatedUrl, 
        undefined, 
        new URL(req.url).origin + '/proxy-service'
      )
    } else {
      responseBody = await proxyResponse.arrayBuffer()
    }
    
    const responseHeaders = createResponseHeaders(proxyResponse, responseTime)
    responseHeaders.set('X-Fallback-Mode', 'traditional-proxy')
    
    return new Response(responseBody, {
      status: proxyResponse.status,
      statusText: proxyResponse.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    throw new Error(`Fallback proxy also failed: ${error.message}`)
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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Range',
    'Accept-Ranges': 'bytes'
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

  // Set CSP based on mode with enhanced media policies
  const cspPolicies = {
    permissive: "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
                "script-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
                "style-src * 'unsafe-inline' data: blob:; " +
                "img-src * data: blob:; " +
                "media-src * data: blob: https:; " +
                "connect-src * data: blob: wss: ws:; " +
                "font-src * data: blob:; " +
                "frame-ancestors *;",
    
    balanced: "default-src 'self' * data: blob: 'unsafe-inline'; " +
              "script-src 'self' * 'unsafe-inline' 'unsafe-eval'; " +
              "style-src 'self' * 'unsafe-inline'; " +
              "img-src * data: blob:; " +
              "media-src * data: blob: https:; " +
              "connect-src * data: blob: wss: ws:; " +
              "frame-ancestors *;",
    
    strict: "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data:; " +
            "media-src 'self' https:; " +
            "connect-src 'self' wss: ws:; " +
            "frame-ancestors 'self';"
  }

  responseHeaders.set('Content-Security-Policy', cspPolicies[mode])
  responseHeaders.set('X-Proxy-Status', 'ssr-success')
  responseHeaders.set('X-Response-Time', responseTime.toString())
  responseHeaders.set('X-Proxy-Mode', 'ssr')

  return responseHeaders
}

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  const supabase = getSupabaseClient()

  try {
    const url = new URL(req.url)
    
    // Parse the request to determine proxy mode and extract parameters
    const { mode, sessionId, targetUrl } = parseProxyRequest(url)
    
    // Enhanced SSR mode detection with BrowserQL parameters
    const ssrMode = url.searchParams.get('ssr') === 'true'
    const cspMode = url.searchParams.get('csp') as 'permissive' | 'balanced' | 'strict' || 'permissive'
    const renderQuality = url.searchParams.get('quality') as 'fast' | 'balanced' | 'complete' || 'balanced'
    const bypassBot = url.searchParams.get('bypass') !== 'false' // Default to true
    const useProxy = url.searchParams.get('proxy') !== 'false' // Default to true
    const proxyCountry = url.searchParams.get('country') || 'nl' // Default to Netherlands
    const customWait = url.searchParams.get('wait') as 'load' | 'domcontentloaded' | 'networkIdle' | 'firstMeaningfulPaint' | 'firstContentfulPaint' | null
    
    // If no target URL is provided, return a helpful message instead of error
    if (!targetUrl) {
      // Check if this is just a test request to the function endpoint
      if (!sessionId) {
        return new Response(
          JSON.stringify({ 
            message: 'Enhanced Proxy Service v3.0 - BrowserQL Enabled',
            status: 'operational',
            features: {
              renderer: 'browserql-graphql',
              region: 'amsterdam-europe',
              capabilities: [
                'bot-detection-bypass',
                'captcha-solving',
                'residential-proxies',
                'javascript-execution',
                'screenshot-capture'
              ],
              modes: ['iframe', 'ssr'],
              qualities: ['fast', 'balanced', 'complete'],
              waitStrategies: ['load', 'domcontentloaded', 'networkIdle', 'firstMeaningfulPaint', 'firstContentfulPaint'],
              defaultMode: 'ssr',
              defaultQuality: 'balanced'
            },
            usage: {
              basic: 'GET /proxy-service/{sessionId}/{encodedTargetUrl}?ssr=true',
              withBotBypass: 'GET /proxy-service/{sessionId}/{encodedTargetUrl}?ssr=true&bypass=true&proxy=true',
              withCountry: 'GET /proxy-service/{sessionId}/{encodedTargetUrl}?ssr=true&country=us&quality=complete',
              withCustomWait: 'GET /proxy-service/{sessionId}/{encodedTargetUrl}?ssr=true&wait=load',
              fastMode: 'GET /proxy-service/{sessionId}/{encodedTargetUrl}?ssr=true&quality=fast&wait=load'
            },
            parameters: {
              ssr: 'Enable server-side rendering (true/false)',
              quality: 'Render quality: fast, balanced, complete',
              wait: 'Wait strategy: load, domcontentloaded, networkIdle, firstMeaningfulPaint, firstContentfulPaint',
              bypass: 'Enable bot detection bypass (true/false)',
              proxy: 'Use residential proxy (true/false)',
              country: 'Proxy country code (nl, us, gb, de, fr, ca)',
              csp: 'Content Security Policy level (permissive, balanced, strict)'
            },
            version: '3.0.0'
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

    console.log('Proxy request:', { mode, sessionId, targetUrl, ssrMode, bypassBot, useProxy, proxyCountry })

    // Validate target URL
    const validatedUrl = validateAndNormalizeUrl(targetUrl)

    // In authenticated mode, validate session and check user balance
    let userId: string | null = null
    if (mode === 'authenticated' && sessionId) {
      userId = await validateSessionAndUser(supabase, sessionId)
    }

    const startTime = Date.now()

    // Handle SSR mode with BrowserQL
    if (ssrMode) {
      console.log(`Using BrowserQL for enhanced SSR rendering: ${validatedUrl}`)
      
      // Configure BrowserQL options based on quality setting
      const browserqlOptions: BrowserQLRenderOptions = {
        targetUrl: validatedUrl,
        sessionId,
        waitUntil: customWait || (renderQuality === 'fast' ? 'load' : 
                  renderQuality === 'complete' ? 'networkIdle' : 'firstContentfulPaint'),
        timeout: renderQuality === 'fast' ? 20000 : 
                renderQuality === 'complete' ? 90000 : 45000,
        userAgent: req.headers.get('user-agent') || undefined,
        useProxy,
        proxyCountry,
        bypassBot,
        solveCaptcha: renderQuality === 'complete' // Only solve CAPTCHAs on complete quality
      }

      console.log(`BrowserQL settings: quality=${renderQuality}, waitUntil=${browserqlOptions.waitUntil}, timeout=${browserqlOptions.timeout}ms`)

      const renderResult = await renderWithBrowserQL(browserqlOptions)
      const endTime = Date.now()
      const responseTime = endTime - startTime

      if (renderResult.error) {
        console.error('BrowserQL rendering failed:', renderResult.error)
        
        // For timeout errors, try again with faster settings
        if (renderResult.error.includes('timeout') && renderQuality !== 'fast') {
          console.log('Retrying with faster settings due to timeout...')
          const fastOptions = {
            ...browserqlOptions,
            waitUntil: 'load' as const,
            timeout: 20000,
            bypassBot: false,
            useProxy: false
          }
          const retryResult = await renderWithBrowserQL(fastOptions)
          if (!retryResult.error) {
            console.log('Retry successful with faster settings')
            return new Response(retryResult.html, {
              status: 200,
              headers: createSSRResponseHeaders(new Response(retryResult.html), responseTime, cspMode)
            })
          }
        }
        
        // Fallback to traditional proxy mode
        console.log('Falling back to traditional proxy mode')
        return await handleFallbackProxy(req, validatedUrl, responseTime)
      }

      const responseHeaders = createSSRResponseHeaders(
        new Response(renderResult.html), 
        responseTime, 
        cspMode
      )

      // Enhanced headers for BrowserQL rendered content
      responseHeaders.set('X-Renderer', 'browserql-graphql')
      responseHeaders.set('X-Render-Quality', renderQuality)
      responseHeaders.set('X-Render-Time', responseTime.toString())
      responseHeaders.set('X-Region', 'amsterdam-europe')
      responseHeaders.set('X-Bot-Bypass', bypassBot.toString())
      responseHeaders.set('X-Proxy-Used', useProxy.toString())
      responseHeaders.set('X-Proxy-Country', proxyCountry)

      // Add metadata headers if available
      if (renderResult.metadata) {
        responseHeaders.set('X-Bot-Detection-Bypassed', renderResult.metadata.botDetectionBypassed.toString())
        responseHeaders.set('X-Captcha-Solved', renderResult.metadata.captchaSolved.toString())
        responseHeaders.set('X-Cloudflare-Found', renderResult.metadata.cloudflareFound.toString())
      }

      // Update metrics for authenticated requests
      if (mode === 'authenticated' && sessionId && userId) {
        await updateMetricsAndLogs(supabase, {
          sessionId,
          userId,
          targetUrl: validatedUrl,
          responseSize: new TextEncoder().encode(renderResult.html).length,
          responseTime,
          statusCode: 200,
          method: req.method,
          userAgent: req.headers.get('user-agent'),
          contentType: 'text/html',
        })

        // Enhanced logging for BrowserQL usage
        await supabase.from('usage_logs').insert({
          user_id: userId,
          session_id: sessionId,
          event_type: 'browserql_render',
          metadata: {
            renderer: 'browserql-graphql',
            quality: renderQuality,
            url: validatedUrl,
            response_time_ms: responseTime,
            html_size_bytes: new TextEncoder().encode(renderResult.html).length,
            bot_bypass_enabled: bypassBot,
            proxy_enabled: useProxy,
            proxy_country: proxyCountry,
            bot_detection_bypassed: renderResult.metadata?.botDetectionBypassed || false,
            captcha_solved: renderResult.metadata?.captchaSolved || false,
            cloudflare_found: renderResult.metadata?.cloudflareFound || false
          }
        })
      }

      return new Response(renderResult.html, {
        status: 200,
        headers: responseHeaders
      })
    }

    // Handle traditional proxy mode (non-SSR)
    // Create headers for the proxy request
    const proxyHeaders = createProxyHeaders(req)

    // Make the proxy request
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