# Supabase Edge Function Proxy Service

This document describes the complete proxy service implementation using only Supabase infrastructure.

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────┐
│   React App     │───▶│ Supabase Edge Func   ────▶│ Target Site  │
│ (DirectProxy    │     │ (proxy-service)     │     │              │
│  Viewer)        │     │                     │     │              │
└─────────────────┘     └─────────────────────┘     └──────────────┘
         │                        │
         │                        ▼
         │              ┌─────────────────────┐
         └─────────────▶│  Supabase Database  │
                        │  (Session Tracking) │
                        └─────────────────────┘
```

## Components

### 1. Edge Function: `proxy-service`

Located at: `supabase/functions/proxy-service/index.ts`

**Features:**
- Session validation
- Request proxying
- Response streaming
- Metrics tracking
- Error handling
- CORS support

**URL Format:**
```
https://[your-project].supabase.co/functions/v1/proxy-service/{sessionId}/{targetUrl}
```

### 2. Frontend Component: `DirectProxyViewer`

Located at: `frontend/src/components/Dashboard/DirectProxyViewer.tsx`

**Features:**
- Iframe-based proxy viewer
- URL navigation bar
- Loading states
- Error handling
- Session status display

### 3. Database Functions

- `start_proxy_session(target_domain)`: Creates a new proxy session
- `terminate_proxy_session(session_id)`: Ends an active session
- `update_session_metrics(session_id, bytes, response_time)`: Updates usage metrics
- `cleanup_stale_proxy_sessions()`: Cleans up inactive sessions

## Setup Instructions

### 1. Deploy the Edge Function

```bash
# From project root
cd supabase/functions/proxy-service
supabase functions deploy proxy-service
```

### 2. Apply Database Migrations

```bash
# From project root
supabase db push
```

### 3. Configure Environment Variables

In your `.env` file:
```env
VITE_SUPABASE_URL=https://[your-project].supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Test the Proxy

1. Start your development server
2. Log in to the application
3. Navigate to the Proxy Control page
4. Enter a URL (e.g., "example.com")
5. Click "Start Proxy Session"
6. The DirectProxyViewer will open with the proxied content

## How It Works

### Session Creation Flow

1. User enters target URL in ProxyControl component
2. Frontend calls `start_proxy_session` RPC function
3. Database creates session record with unique ID
4. Session ID returned to frontend
5. DirectProxyViewer opens with proxy URL

### Proxy Request Flow

1. DirectProxyViewer creates iframe with proxy URL
2. Browser requests: `/proxy-service/{sessionId}/{targetUrl}`
3. Edge Function validates session
4. Edge Function fetches target URL
5. Response streamed back to iframe
6. Metrics updated in database

### Security Features

1. **Session Validation**: Every request validates the session ID
2. **Time Balance Check**: Ensures user has sufficient balance
3. **Header Filtering**: Only safe headers are forwarded
4. **CORS Protection**: Proper CORS headers for security
5. **Rate Limiting**: Can be added at Edge Function level

## Limitations

### Technical Limitations

1. **Response Size**: Edge Functions have a 6MB response limit
2. **Execution Time**: 150-second timeout for requests
3. **WebSockets**: Not supported in Edge Functions
4. **Streaming**: Limited streaming capabilities
5. **Binary Content**: May have issues with some binary formats

### Content Limitations

1. **JavaScript**: Sites with heavy JS may not work properly
2. **Authentication**: Cannot proxy authenticated sessions
3. **CORS**: Some sites block proxy requests
4. **CSP**: Content Security Policy may block resources
5. **Cookies**: Session cookies not preserved

## Monitoring and Debugging

### View Logs

```bash
# View Edge Function logs
supabase functions logs proxy-service
```

### Database Queries

```sql
-- View active sessions
SELECT * FROM proxy_sessions WHERE status = 'active';

-- View usage logs
SELECT * FROM usage_logs 
WHERE event_type = 'page_request' 
ORDER BY created_at DESC 
LIMIT 100;

-- Check user balance
SELECT email, time_balance_minutes 
FROM user_profiles 
WHERE id = 'user-id';
```

### Common Issues

1. **"Invalid session" error**
   - Session expired or doesn't exist
   - User terminated the session
   - Database connection issue

2. **"Insufficient balance" error**
   - User's time balance is 0
   - Need to add more time or upgrade subscription

3. **Blank iframe**
   - Target site blocks framing
   - CSP restrictions
   - CORS issues

4. **Slow loading**
   - Large page size
   - Many resources to proxy
   - Network latency

## Performance Optimization

### 1. Caching (Future Enhancement)

```typescript
// Add caching headers for static content
if (contentType?.includes('image') || contentType?.includes('css')) {
  responseHeaders.set('Cache-Control', 'public, max-age=3600')
}
```

### 2. Compression

```typescript
// Enable compression for text content
responseHeaders.set('Content-Encoding', 'gzip')
```

### 3. Resource Filtering

```typescript
// Block unnecessary resources
const blockedTypes = ['font', 'media']
if (blockedTypes.some(type => contentType?.includes(type))) {
  return new Response('Blocked', { status: 204 })
}
```

## Cost Considerations

### Edge Function Pricing

- **Invocations**: First 2M free, then $2 per million
- **Compute Time**: First 500K GB-seconds free
- **Bandwidth**: Standard Supabase bandwidth pricing

### Optimization Tips

1. Implement client-side caching
2. Block unnecessary resources
3. Compress responses
4. Set appropriate timeouts
5. Monitor usage regularly

## Future Enhancements

1. **Advanced Caching**: Redis-based caching layer
2. **Multiple Regions**: Deploy to multiple regions
3. **Custom Headers**: User-configurable headers
4. **Request Filtering**: Block ads and trackers
5. **Session Recording**: Record browsing sessions
6. **API Mode**: REST API for programmatic access
7. **Websocket Support**: Using alternative approaches
8. **Authentication Proxy**: Support for authenticated sites

## Security Best Practices

1. **Rate Limiting**: Implement per-user rate limits
2. **Domain Whitelist**: Allow only approved domains
3. **Content Filtering**: Block malicious content
4. **Request Validation**: Validate all inputs
5. **Audit Logging**: Log all proxy requests
6. **Encryption**: Use HTTPS everywhere
7. **Session Timeout**: Auto-terminate idle sessions

## Troubleshooting Commands

```bash
# Check function status
supabase functions list

# View function configuration
supabase functions inspect proxy-service

# Test function locally
supabase functions serve proxy-service

# Deploy with environment variables
supabase functions deploy proxy-service --env-file .env.local
```

## Support

For issues or questions:
1. Check Edge Function logs
2. Review database session records
3. Test with simple sites first (example.com)
4. Verify CORS configuration
5. Check browser console for errors 