# Enhanced SSR Proxy Implementation

This document outlines the implementation of the Enhanced Edge Functions + Web Components architecture for the VPN FR proxy service.

## Overview

The implementation addresses Content Security Policy (CSP) violations and iframe restrictions by introducing:
1. **Server-Side Rendering (SSR)** capabilities in the Edge Function
2. **Web Components** with Shadow DOM encapsulation
3. **Flexible CSP management** with multiple security levels
4. **Graceful fallback** mechanisms

## Phase 1: Enhanced Edge Function

### Key Features

1. **deno-dom Integration**: HTML parsing and manipulation on the server
2. **Flexible CSP Modes**: Permissive, Balanced, and Strict modes
3. **Advanced HTML Processing**: Security meta tag removal, URL transformation, script filtering
4. **Backwards Compatibility**: Existing iframe mode remains functional

### Usage

To use SSR mode, append query parameters to your proxy requests:

```
GET /proxy-service/{sessionId}/{encodedUrl}?ssr=true&csp=balanced
```

Parameters:
- `ssr=true`: Enable SSR processing
- `csp`: Security level (permissive|balanced|strict)

### Configuration

The Edge Function uses `deno.json` for dependency management:

```json
{
  "imports": {
    "@b-fuze/deno-dom": "jsr:@b-fuze/deno-dom@^0.1.47",
    "@std/path": "jsr:@std/path@^1.0.3",
    "@supabase/supabase-js": "npm:@supabase/supabase-js@2"
  }
}
```

## Phase 2: Web Component Architecture

### Components

1. **ProxyViewerElement** (`ProxyViewerWebComponent.ts`)
   - Custom element with Shadow DOM
   - Supports both SSR and iframe modes
   - Built-in navigation controls
   - Automatic fallback handling

2. **ProxyViewerWrapper** (`ProxyViewerWrapper.tsx`)
   - React wrapper for the Web Component
   - Browser compatibility checks
   - Event handling integration
   - Fallback to iframe for unsupported browsers

3. **EnhancedUnifiedProxyViewer** (`EnhancedUnifiedProxyViewer.tsx`)
   - Full-featured proxy viewer with experimental SSR toggle
   - Settings panel for mode and CSP configuration
   - Maintains compatibility with existing UI

### Integration

The Web Component can be used in three ways:

1. **Direct HTML**:
```html
<proxy-viewer
  src="https://example.com"
  session-id="abc123"
  mode="ssr"
  csp-level="balanced"
></proxy-viewer>
```

2. **React Component**:
```tsx
<ProxyViewerWrapper
  targetUrl="https://example.com"
  sessionId={sessionId}
  mode="auto"
  cspLevel="balanced"
  onNavigate={handleNavigate}
  onLoad={handleLoad}
  onError={handleError}
/>
```

3. **Enhanced Viewer** (recommended - now the default):
```tsx
<EnhancedUnifiedProxyViewer
  targetDomain="example.com"
  sessionId={sessionId}
  mode="direct"
  onClose={handleClose}
  // SSR is enabled by default, no need to specify experimentalSSR
/>
```

## CSP Security Levels

### Permissive Mode
- Allows all external resources
- Enables inline scripts and styles
- Suitable for maximum compatibility

### Balanced Mode (Default)
- Allows self and external resources
- Maintains inline script capability
- Good balance of security and functionality

### Strict Mode
- Only allows same-origin resources
- Enhanced security but limited functionality
- Use for trusted content only

## Migration Guide

### Version 2.0 Update (Current)
The Enhanced Proxy Viewer now **defaults to SSR mode** for improved compatibility and performance. The legacy UnifiedProxyViewer is deprecated.

### Migration Steps:

1. **Replace Imports**: Change from `UnifiedProxyViewer` to `EnhancedUnifiedProxyViewer`
2. **Default Behavior**: SSR mode is now enabled by default (no need for `experimentalSSR={true}`)
3. **Test Thoroughly**: The system automatically falls back to iframe mode if SSR fails
4. **Monitor Performance**: Check browser console for mode switching
5. **Customize if Needed**: Use settings panel to adjust render mode and CSP levels

## Troubleshooting

### Common Issues

1. **SSR Content Not Loading**
   - Check browser console for Web Component support
   - Verify Edge Function is deployed with deno-dom
   - Try permissive CSP mode

2. **Navigation Not Working**
   - Ensure session ID is valid
   - Check for JavaScript errors in proxied content
   - Try iframe mode as fallback

3. **Styling Issues**
   - Shadow DOM isolates styles by design
   - Use CSS custom properties for theming
   - Consider inline styles option

### Debug Mode

Enable debug logging in browser console:
```javascript
localStorage.setItem('proxy-debug', 'true')
```

## Performance Considerations

1. **SSR Processing**: Adds 50-200ms server-side latency
2. **DOM Parsing**: Memory usage scales with HTML size
3. **Web Components**: Native performance in modern browsers
4. **Fallback Mode**: Minimal overhead when using iframe

## Security Notes

1. **Script Filtering**: SSR mode removes tracking/analytics by default
2. **URL Transformation**: All resources converted to absolute URLs
3. **Session Validation**: Maintains existing authentication checks
4. **CSP Enforcement**: Configurable based on content trust level

## Future Enhancements

1. **Cache Layer**: Redis-based HTML caching
2. **Streaming SSR**: Progressive rendering for large pages
3. **Custom Transformers**: Plugin system for content modification
4. **Analytics Dashboard**: SSR vs iframe usage metrics
5. **A/B Testing**: Automated mode selection based on success rates

## Deployment

### Edge Function

```bash
# Deploy with Supabase CLI
supabase functions deploy proxy-service
```

### Frontend Components

```bash
# Build and deploy frontend
npm run build
```

## Monitoring

Track SSR adoption and performance:

```sql
-- SSR usage by mode
SELECT 
  jsonb_extract_path_text(metadata, 'mode') as mode,
  COUNT(*) as request_count,
  AVG(response_time_ms) as avg_response_time
FROM usage_logs
WHERE event_type = 'proxy_request'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY mode;
```

## Support

For issues or questions:
1. Check browser console for errors
2. Review Edge Function logs in Supabase dashboard
3. Test with different CSP modes
4. Try fallback to iframe mode

Remember: This is an experimental feature. Always maintain the ability to fall back to iframe mode for critical operations. 