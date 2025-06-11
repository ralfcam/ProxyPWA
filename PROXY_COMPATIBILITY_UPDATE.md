# Proxy Service Compatibility Update

## Issue Summary
The proxy service was encountering Content Security Policy (CSP) and sandbox restrictions when accessing certain websites, particularly those with strict security policies like adult content sites.

## Errors Encountered
1. **CSP Violations**: `Refused to apply inline style because it violates the following Content Security Policy directive`
2. **Script Blocking**: `Blocked script execution because the document's frame is sandboxed`
3. **404 Errors**: Resource loading failures due to URL resolution issues

## Solutions Implemented

### 1. Edge Function Improvements

#### CSP Header Management
- **Removed restrictive headers** from proxied responses:
  - `content-security-policy`
  - `x-frame-options`
  - `strict-transport-security`
  - `permissions-policy`
  
- **Added permissive CSP** for proxied content:
  ```
  Content-Security-Policy: default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; 
  script-src * 'unsafe-inline' 'unsafe-eval'; 
  connect-src * data: blob: 'unsafe-inline'; 
  img-src * data: blob: 'unsafe-inline'; 
  frame-src * data: blob: ; 
  style-src * 'unsafe-inline';
  ```

#### HTML Content Modification
- **Base tag injection**: Automatically injects a `<base>` tag into HTML responses to handle relative URL resolution
- **Smart content detection**: Only modifies HTML content, leaving other content types unchanged

### 2. Frontend Improvements

#### Enhanced Iframe Sandbox Permissions
Added more permissive sandbox attributes:
- `allow-modals`
- `allow-downloads`
- `allow-presentation`
- `allow-top-navigation-by-user-activation`

#### Feature Policy
Added `allow` attribute for various features:
- `accelerometer`
- `camera`
- `encrypted-media`
- `geolocation`
- `gyroscope`
- `microphone`
- `payment`

#### Improved Error Handling
- Added specific error messages for known problematic sites
- Visual warnings about compatibility limitations
- Better guidance for users when sites don't work

## Known Limitations

### 1. Adult Content Sites
Many adult content websites (xHamster, PornHub, etc.) implement:
- **Advanced bot detection**: Detects and blocks proxy connections
- **Strict CSP policies**: Prevents execution of modified content
- **JavaScript fingerprinting**: Identifies proxy environments
- **WebRTC checks**: Detects IP mismatches

### 2. Banking and Financial Sites
- Deliberately block proxy connections for security
- Use certificate pinning and other security measures

### 3. Streaming Services
- Netflix, Hulu, etc. actively detect and block proxies
- DRM content cannot be proxied

### 4. Social Media Platforms
- Facebook, Instagram may have limited functionality
- Real-time features (chat, notifications) may not work

## Technical Details

### How the Proxy Works
1. **Request Flow**:
   ```
   Browser -> Iframe -> Edge Function -> Target Website
   ```

2. **URL Format**:
   ```
   https://[supabase-url]/functions/v1/proxy-service/{sessionId}/{encodedTargetUrl}
   ```

3. **HTML Modification Process**:
   - Detects HTML content via Content-Type header
   - Injects base tag for proper URL resolution
   - Preserves original HTML structure

## Best Practices for Users

1. **Use the proxy for**:
   - General web browsing
   - News sites and blogs
   - Research and educational content
   - Sites without strict security policies

2. **Avoid using the proxy for**:
   - Banking or financial transactions
   - Sites requiring login (security risk)
   - Streaming services
   - Sites with sensitive personal data

3. **If a site doesn't work**:
   - Try refreshing the page
   - Check if the site works without the proxy
   - Use the "Open Original Site" option
   - Consider that some sites intentionally block proxies

## Future Improvements

1. **URL Rewriting**: Implement comprehensive URL rewriting to proxy all resources
2. **Cookie Handling**: Better cookie management between proxy and client
3. **WebSocket Support**: Add support for real-time connections
4. **Performance Optimization**: Cache static resources
5. **User Agent Rotation**: Implement rotating user agents to avoid detection

## Security Considerations

- The proxy modifies security headers to allow content execution
- This is necessary for functionality but reduces security
- Users should be aware of the risks when browsing through a proxy
- Never enter sensitive information through a proxy connection 