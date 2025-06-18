# BrowserQL API Quick Reference

## Proxy Service Endpoint

```
GET /functions/v1/proxy-service/{sessionId}/{encodedTargetUrl}
```

## Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `ssr` | boolean | `false` | Enable server-side rendering with BrowserQL |
| `csp` | string | `permissive` | Content Security Policy level: `permissive`, `balanced`, `strict` |
| `quality` | string | `balanced` | Render quality: `fast`, `balanced`, `complete` |
| `bypass` | boolean | `true` | Enable bot detection bypass |
| `proxy` | boolean | `true` | Use residential proxy |
| `country` | string | `nl` | Proxy country code: `us`, `gb`, `de`, `fr`, `nl`, `ca` |

## Example URLs

### Basic BrowserQL Rendering
```
/proxy-service/session123/https%3A%2F%2Fexample.com?ssr=true
```

### With Bot Bypass and US Proxy
```
/proxy-service/session123/https%3A%2F%2Fexample.com?ssr=true&bypass=true&proxy=true&country=us
```

### Complete Mode (with CAPTCHA solving)
```
/proxy-service/session123/https%3A%2F%2Fexample.com?ssr=true&quality=complete&bypass=true
```

### Fast Mode (no bot bypass)
```
/proxy-service/session123/https%3A%2F%2Fexample.com?ssr=true&quality=fast&bypass=false&proxy=false
```

## Response Headers

### BrowserQL-Specific Headers

```http
X-Renderer: browserql-graphql
X-Render-Quality: balanced
X-Render-Time: 2500
X-Region: amsterdam-europe
X-Bot-Bypass: true
X-Proxy-Used: true
X-Proxy-Country: nl
X-Bot-Detection-Bypassed: true
X-Captcha-Solved: false
X-Cloudflare-Found: true
```

### Standard Proxy Headers

```http
X-Proxy-Status: ssr-success
X-Response-Time: 2500
X-Proxy-Mode: ssr
Access-Control-Allow-Origin: *
Content-Security-Policy: [varies by csp level]
```

## Frontend Component Props

```typescript
interface ProxyViewerWrapperProps {
  targetUrl: string
  sessionId?: string
  mode?: 'iframe' | 'ssr' | 'auto'
  cspLevel?: 'permissive' | 'balanced' | 'strict'
  fallbackEnabled?: boolean
  renderQuality?: 'fast' | 'balanced' | 'complete'
  bypassBot?: boolean
  useProxy?: boolean
  proxyCountry?: string
  onNavigate?: (url: string) => void
  onLoad?: (event: { mode: string; url: string }) => void
  onError?: (error: Error) => void
  className?: string
  style?: React.CSSProperties
}
```

## Events

### browserql-metadata Event

```typescript
interface BrowserQLMetadata {
  renderer: string           // 'browserql-graphql'
  renderTime: number        // milliseconds
  region: string           // 'amsterdam-europe'
  botDetectionBypassed: boolean
  captchaSolved: boolean
  cloudflareFound: boolean
}
```

### Usage Example

```typescript
element.addEventListener('browserql-metadata', (event: CustomEvent<BrowserQLMetadata>) => {
  console.log('BrowserQL Metrics:', event.detail)
})
```

## BrowserQL GraphQL Mutations

### Basic Render

```graphql
mutation RenderPage($url: String!) {
  goto(url: $url, waitUntil: networkidle2) {
    status
  }
  content {
    html
  }
}
```

### With Bot Detection Bypass

```graphql
mutation RenderWithBypass($url: String!) {
  goto(url: $url, waitUntil: networkidle2) {
    status
  }
  verify(type: cloudflare) {
    found
    solved
    time
  }
  content {
    html
  }
}
```

### Complete Mode with CAPTCHA

```graphql
mutation RenderComplete($url: String!) {
  goto(url: $url, waitUntil: networkidle0) {
    status
  }
  verify(type: cloudflare) {
    found
    solved
    time
  }
  verify(type: hcaptcha) {
    found
    solved
    time
  }
  content {
    html
  }
  screenshot(type: jpeg, quality: 80) {
    base64
  }
}
```

## Error Handling

### BrowserQL Errors

```typescript
try {
  const result = await renderWithBrowserQL(options)
  if (result.error) {
    // Fall back to traditional proxy
    return handleFallbackProxy(req, url, responseTime)
  }
} catch (error) {
  console.error('BrowserQL failed:', error)
  // Automatic fallback
}
```

### Common Error Codes

- `401`: Invalid or missing BROWSERQL_TOKEN
- `429`: Rate limit exceeded
- `500`: BrowserQL internal error
- `504`: Timeout (increase quality mode)

## Performance Tips

1. **Cache rendered HTML** when possible
2. **Use Fast mode** for non-protected sites
3. **Disable proxy** when not needed (saves 6 units/MB)
4. **Monitor render times** and adjust quality accordingly
5. **Batch similar requests** to optimize proxy usage 