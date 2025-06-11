# Proxy Functionality Setup Guide

## Overview

The VPN PWA application includes a proxy feature that allows users to browse websites through a proxy server. This document explains how the proxy functionality works and how to set it up properly.

## Current Implementation

### Development Setup

For development, the application uses a web proxy service approach:

1. **Database Function**: When a user starts a proxy session, the `start_proxy_session` function creates a session record and generates a proxy URL
2. **Frontend Viewer**: The `WebProxyViewer` component provides links to external proxy services where users can browse their target websites
3. **Session Tracking**: User sessions are tracked in the database with metrics like bytes transferred and request counts

### Why External Proxy Services?

Due to browser security restrictions (CORS, X-Frame-Options), embedding proxy services in iframes is not possible. Instead, we provide a user-friendly interface to popular web proxy services.

### Components

- **ProxyControl.tsx**: Main UI for starting/stopping proxy sessions
- **WebProxyViewer.tsx**: Displays the proxied content in an iframe
- **Database Functions**:
  - `can_start_proxy_session()`: Checks if user can start a session
  - `start_proxy_session(target_domain)`: Creates a new proxy session
  - `terminate_proxy_session(session_id)`: Ends a proxy session
  - `update_session_metrics()`: Updates session statistics

## Production Setup

For production use, you need to deploy a proper proxy server. Here are the recommended approaches:

### Option 1: Deploy a Proxy Server

1. **Set up a proxy server** using one of these solutions:
   - [Squid Proxy](http://www.squid-cache.org/)
   - [Tinyproxy](https://tinyproxy.github.io/)
   - [3proxy](https://github.com/3proxy/3proxy)
   - Custom Node.js proxy using [http-proxy-middleware](https://github.com/chimurai/http-proxy-middleware)

2. **Update the proxy URL** in the database:
   ```sql
   UPDATE system_settings 
   SET value = '"https://your-proxy-server.com"' 
   WHERE key = 'proxy_base_url';
   ```

3. **Configure authentication** between your app and proxy server

### Option 2: Use a Proxy Service

1. **Subscribe to a proxy service** like:
   - [Bright Data](https://brightdata.com/)
   - [SmartProxy](https://smartproxy.com/)
   - [Oxylabs](https://oxylabs.io/)

2. **Integrate their API** in the proxy handler function

3. **Update the proxy handler** to use their endpoints

### Option 3: Deploy Your Own Proxy Edge Function

Create a more robust proxy handler:

```typescript
// supabase/functions/advanced-proxy/index.ts
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'

serve(async (req) => {
  // Add authentication
  // Add rate limiting
  // Add content filtering
  // Add caching
  // Handle different content types
  // etc.
})
```

## Security Considerations

1. **Authentication**: Always authenticate proxy requests to prevent abuse
2. **Rate Limiting**: Implement rate limiting to prevent excessive usage
3. **Content Filtering**: Block malicious or inappropriate content
4. **SSL/TLS**: Always use HTTPS for proxy connections
5. **Access Control**: Restrict which domains can be accessed
6. **Logging**: Log all proxy requests for security auditing

## Environment Variables

Add these to your `.env` file:

```env
# For development (using public CORS proxy)
VITE_PROXY_URL=https://corsproxy.io/?

# For production (your proxy server)
VITE_PROXY_URL=https://your-proxy-server.com/proxy/
```

## Testing the Proxy

1. Start a proxy session from the dashboard
2. Enter a URL (e.g., "example.com")
3. Click "Open Proxy Session"
4. The website should load in the proxy viewer

## Limitations

### Development Mode
- Uses public CORS proxy services which have limitations
- Many websites block CORS proxies
- Limited to simple HTTP/HTTPS requests
- No support for authenticated sessions

### Production Requirements
- Requires a dedicated proxy server
- Needs proper authentication and security
- Should handle various content types
- Must manage SSL certificates properly

## Troubleshooting

### "Unable to load page" error
- The target website may block proxy connections
- Try a different website
- Check if the proxy server is running

### Session not starting
- Check user's time balance
- Verify database functions are deployed
- Check for active session limits

### Performance issues
- Proxy server may be overloaded
- Network latency between servers
- Large content being transferred

## Future Improvements

1. **Multiple Proxy Servers**: Load balance across multiple servers
2. **Geographic Selection**: Let users choose proxy location
3. **Advanced Filtering**: Content filtering and ad blocking
4. **Session Recording**: Record browsing sessions for replay
5. **API Integration**: Direct API access for programmatic use

## Support

For help setting up the proxy functionality:
1. Check the logs in Supabase dashboard
2. Test with simple websites first
3. Verify all database migrations are applied
4. Ensure proper CORS headers are set 

---

Next Steps for Production
Deploy a Proper Proxy Server:
Use Squid, Nginx, or a custom Node.js proxy
Update the proxy_base_url in system settings
Use a Proxy Service API:
Integrate with services like Bright Data or SmartProxy
Update the proxy handler to use their APIs