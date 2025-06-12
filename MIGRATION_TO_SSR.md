# Migration Guide: Unified Proxy Viewer → Enhanced SSR Proxy Viewer

## Overview

As of v2.0, the proxy service defaults to **Server-Side Rendering (SSR) mode** for improved compatibility with websites that block iframes. The legacy `UnifiedProxyViewer` component is now deprecated in favor of `EnhancedUnifiedProxyViewer`.

## Key Changes

### 1. Default SSR Mode
- **Old**: Iframe-only rendering with CSP restrictions
- **New**: SSR by default with automatic iframe fallback
- **Benefit**: Works with more websites, bypasses CSP restrictions

### 2. Component Name Change
- **Deprecated**: `UnifiedProxyViewer`
- **Current**: `EnhancedUnifiedProxyViewer`

### 3. New Features
- Real-time mode switching (SSR ↔ Iframe)
- Configurable CSP levels (Permissive, Balanced, Strict)
- Better error handling with automatic fallback
- Enhanced navigation with history support

## Quick Migration

### Step 1: Update Imports

```diff
- import UnifiedProxyViewer from './UnifiedProxyViewer'
+ import EnhancedUnifiedProxyViewer from './EnhancedUnifiedProxyViewer'
```

### Step 2: Update Component Usage

```diff
- <UnifiedProxyViewer
+ <EnhancedUnifiedProxyViewer
    targetDomain={domain}
    sessionId={sessionId}
    mode="direct"
    onClose={handleClose}
    onNavigate={handleNavigate}
  />
```

### Step 3: Remove Deprecated Props (if any)

The new component accepts the same props, but SSR is enabled by default:

```tsx
// Old way (if you were testing SSR)
<EnhancedUnifiedProxyViewer experimentalSSR={true} />

// New way (SSR is default)
<EnhancedUnifiedProxyViewer />
```

## Configuration Options

### Disable SSR (Use Legacy Iframe Mode)

If you need to force iframe mode:

```tsx
<EnhancedUnifiedProxyViewer
  targetDomain={domain}
  sessionId={sessionId}
  mode="direct"
  experimentalSSR={false}  // Explicitly disable SSR
  onClose={handleClose}
/>
```

### Runtime Mode Switching

Users can switch modes via the settings panel:
1. Click the settings icon (⚙️)
2. Toggle "Enhanced SSR Mode"
3. Choose render mode: Auto-detect, Force SSR, or Force Iframe
4. Adjust security level if needed

## API Changes

### Edge Function

The proxy service endpoint now supports SSR parameters:

```bash
# Legacy (iframe only)
GET /proxy-service/{sessionId}/{encodedUrl}

# Enhanced (with SSR)
GET /proxy-service/{sessionId}/{encodedUrl}?ssr=true&csp=permissive
```

### Default Parameters
- `ssr`: `true` (when using EnhancedUnifiedProxyViewer)
- `csp`: `permissive` (for maximum compatibility)

## Troubleshooting

### Common Issues After Migration

1. **"Component not found" error**
   - Ensure you've imported `EnhancedUnifiedProxyViewer`
   - Check the import path is correct

2. **SSR content not loading**
   - Check Edge Function logs for errors
   - Try switching to iframe mode in settings
   - Verify the target website allows proxying

3. **Performance issues**
   - SSR adds 50-200ms latency
   - Consider using iframe mode for simple sites
   - Monitor network requests in DevTools

### Debug Mode

Enable debug logging:
```javascript
// In browser console
localStorage.setItem('proxy-debug', 'true')
```

## Rollback Plan

If you need to temporarily rollback:

1. Keep the old import available:
```tsx
import UnifiedProxyViewer from './UnifiedProxyViewer'
// Use only when necessary, will show deprecation warning
```

2. Use feature flag:
```tsx
const useNewProxy = process.env.REACT_APP_USE_SSR_PROXY !== 'false'

{useNewProxy ? (
  <EnhancedUnifiedProxyViewer {...props} />
) : (
  <UnifiedProxyViewer {...props} />
)}
```

## Benefits of Migration

1. **Better Compatibility**: Works with sites that block iframes
2. **Improved Security**: Server-side processing removes tracking scripts
3. **Enhanced UX**: Real-time mode switching without page reload
4. **Future-Proof**: Ongoing development focuses on SSR mode

## Timeline

- **v1.0**: Legacy iframe-only proxy
- **v1.5**: Experimental SSR mode added
- **v2.0**: SSR mode as default ← **Current**
- **v3.0**: Legacy component removal (planned)

## Support

For migration assistance:
1. Check the [main documentation](./SSR_PROXY_IMPLEMENTATION.md)
2. Review Edge Function logs for SSR errors
3. Test with different CSP modes
4. Report issues with specific websites

Remember: The system automatically falls back to iframe mode if SSR fails, ensuring continuity of service during migration. 