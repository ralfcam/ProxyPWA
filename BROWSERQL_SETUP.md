# BrowserQL Integration Setup Guide

## Overview

BrowserQL has been integrated into your VPN proxy service to provide enhanced SSR (Server-Side Rendering) capabilities with advanced bot detection bypass, CAPTCHA solving, and residential proxy support.

## Architecture

```
User Request → Edge Function → BrowserQL API → Rendered HTML → Client
```

## Setup Steps

### 1. Get Your BrowserQL Token

1. Sign up for a Browserless Cloud account at [browserless.io](https://browserless.io)
2. Navigate to your account dashboard
3. Copy your API token

### 2. Configure Supabase Environment

Add your BrowserQL token to your Supabase Edge Function environment variables:

```bash
# Using Supabase CLI
supabase secrets set BROWSERQL_TOKEN=your_browserql_token_here

# Or add it in your Supabase dashboard:
# Project Settings → Edge Functions → Environment Variables
```

### 3. Deploy the Updated Edge Function

```bash
# Deploy the proxy-service function with BrowserQL support
supabase functions deploy proxy-service
```

## Features

### 🛡️ Bot Detection Bypass
- **Cloudflare**: Automatic detection and bypass
- **hCAPTCHA**: Automatic solving (in complete mode)
- **Fingerprinting**: Human-like browser behavior

### 🌍 Residential Proxies
- **Geo-targeting**: Choose from multiple countries
- **Sticky sessions**: Maintain same IP for entire session
- **High success rate**: 95%+ on protected sites

### ⚡ Render Quality Modes

| Mode | Timeout | Features | Use Case |
|------|---------|----------|----------|
| **Fast** | 15s | Basic rendering, no CAPTCHA | Simple sites |
| **Balanced** | 30s | Bot bypass, no CAPTCHA | Most sites |
| **Complete** | 60s | Bot bypass + CAPTCHA solve | Heavily protected sites |

## Usage Examples

### Basic SSR with BrowserQL

```typescript
// Frontend usage
const proxyUrl = `/proxy-service/${sessionId}/${encodeURIComponent(targetUrl)}?ssr=true`
```

### With Bot Detection Bypass

```typescript
const proxyUrl = `/proxy-service/${sessionId}/${encodeURIComponent(targetUrl)}?ssr=true&bypass=true&proxy=true`
```

### With Specific Country Proxy

```typescript
const proxyUrl = `/proxy-service/${sessionId}/${encodeURIComponent(targetUrl)}?ssr=true&country=us&quality=complete`
```

## Frontend Integration

The React components have been updated to support BrowserQL:

### Available Props

```typescript
<ProxyViewerWrapper
  targetUrl="https://example.com"
  sessionId={sessionId}
  mode="ssr"
  renderQuality="balanced"     // fast | balanced | complete
  bypassBot={true}            // Enable bot detection bypass
  useProxy={true}             // Use residential proxy
  proxyCountry="nl"           // Proxy country code
  onLoad={handleLoad}
  onError={handleError}
/>
```

### BrowserQL Metrics

The component exposes BrowserQL metrics through events:

```typescript
const handleBrowserQLMetadata = (event: CustomEvent) => {
  const metadata = event.detail
  console.log({
    renderTime: metadata.renderTime,
    botDetectionBypassed: metadata.botDetectionBypassed,
    captchaSolved: metadata.captchaSolved,
    cloudflareFound: metadata.cloudflareFound
  })
}

viewerRef.current.addEventListener('browserql-metadata', handleBrowserQLMetadata)
```

## Monitoring & Debugging

### Response Headers

BrowserQL adds these headers to help with debugging:

- `X-Renderer: browserql-graphql` - Confirms BrowserQL was used
- `X-Render-Quality: balanced` - Quality mode used
- `X-Render-Time: 2500` - Render time in milliseconds
- `X-Bot-Detection-Bypassed: true` - Bot bypass status
- `X-Captcha-Solved: true` - CAPTCHA solving status
- `X-Cloudflare-Found: true` - Cloudflare detection status

### Usage Logs

BrowserQL usage is logged in the `usage_logs` table:

```sql
SELECT * FROM usage_logs 
WHERE event_type = 'browserql_render'
ORDER BY created_at DESC;
```

## Pricing Considerations

### BrowserQL Costs

- **Regular rendering**: 1 unit per request
- **With residential proxy**: 6 units per MB
- **CAPTCHA solving**: Additional units

### Optimization Tips

1. **Use Fast mode** for simple sites without protection
2. **Enable proxy only** when needed (protected sites)
3. **Cache rendered content** when possible
4. **Monitor usage** through the Browserless dashboard

## Troubleshooting

### Common Issues

1. **BROWSERQL_TOKEN not set**
   - Ensure the environment variable is properly configured
   - Check Supabase logs for the error

2. **Timeout errors**
   - Try increasing the quality mode to "complete"
   - Some sites may require more time to render

3. **Proxy country not working**
   - Ensure the country code is valid (us, gb, de, fr, nl, ca)
   - Check if residential proxy is enabled

### Fallback Behavior

If BrowserQL fails, the system automatically falls back to traditional proxy mode:

1. BrowserQL attempt fails
2. System logs the error
3. Fallback to standard fetch proxy
4. User sees the content (if accessible)

## Security Notes

1. **API Token**: Keep your BrowserQL token secure
2. **Rate Limiting**: Implement rate limiting to prevent abuse
3. **Content Filtering**: The system sanitizes cross-origin content
4. **CSP Policies**: Adjustable security levels (permissive, balanced, strict)

## Next Steps

1. Test with various protected sites
2. Monitor usage and optimize settings
3. Implement caching for frequently accessed content
4. Consider implementing request queuing for high traffic

## Support

- **BrowserQL Docs**: [docs.browserless.io/browserql](https://docs.browserless.io/browserql)
- **API Status**: Check [status.browserless.io](https://status.browserless.io)
- **Support**: support@browserless.io 