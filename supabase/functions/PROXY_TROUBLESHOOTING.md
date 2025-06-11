# Proxy Service Troubleshooting Guide

## 404 Error When Accessing Proxy Service

If you're getting a 404 error when trying to use the proxy service, follow these steps:

### 1. Check if Edge Function is Deployed

For local development:
```bash
# List all functions
npx supabase functions list

# If proxy-service is not listed, deploy it locally
npx supabase functions serve proxy-service --no-verify-jwt
```

For production:
```bash
# Deploy the function
npx supabase functions deploy proxy-service
```

### 2. Verify the URL Format

The proxy URL should follow this format:
```
http://localhost:54321/functions/v1/proxy-service/{sessionId}/{encodedTargetUrl}
```

Example:
```
http://localhost:54321/functions/v1/proxy-service/813589a2-bca5-4730-9c88-965816221311/https%3A%2F%2Fgoogle.com
```

### 3. Check Session Status

Run this SQL query to verify your session is active:
```sql
SELECT id, status, target_domain, started_at, last_activity_at
FROM proxy_sessions
WHERE id = '813589a2-bca5-4730-9c88-965816221311';
```

### 4. Test with Simple Proxy

Deploy and test the simple proxy function:
```bash
# Deploy simple proxy
npx supabase functions deploy simple-proxy

# Test it
curl "http://localhost:54321/functions/v1/simple-proxy?url=https://example.com"
```

### 5. Check Supabase Logs

```bash
# View function logs
npx supabase functions logs proxy-service

# Check Supabase status
npx supabase status
```

### 6. Common Issues and Solutions

#### Issue: Function not found (404)
**Solution**: Deploy the function
```bash
npx supabase functions deploy proxy-service
```

#### Issue: Session invalid
**Solution**: Create a new session
```sql
-- Check active sessions
SELECT * FROM proxy_sessions WHERE status = 'active' AND user_id = auth.uid();
```

#### Issue: CORS errors
**Solution**: Ensure CORS headers are properly set in the Edge Function

#### Issue: Local development not working
**Solution**: Use the correct local URL
```javascript
// In DirectProxyViewer.tsx
const proxyBaseUrl = 'http://localhost:54321/functions/v1/proxy-service'
```

### 7. Manual Testing

Test the proxy directly with curl:
```bash
# Test OPTIONS (CORS preflight)
curl -X OPTIONS http://localhost:54321/functions/v1/proxy-service

# Test with a simple URL
curl "http://localhost:54321/functions/v1/proxy-service/test-session-id/https%3A%2F%2Fexample.com"
```

### 8. Database Function Check

Ensure the `update_session_metrics` function exists:
```sql
-- Check if function exists
SELECT proname, pronargs 
FROM pg_proc 
WHERE proname = 'update_session_metrics';
```

### 9. Alternative: Use WebProxyViewer

If the Edge Function proxy continues to have issues, you can temporarily use the WebProxyViewer component which uses external proxy services:

```typescript
// In ProxyControl.tsx
import WebProxyViewer from './WebProxyViewer'

// Use WebProxyViewer instead of DirectProxyViewer
```

### 10. Debug Mode

Enable debug logging in the Edge Function:
```typescript
// Add to proxy-service/index.ts
console.log('Request URL:', req.url)
console.log('Session ID:', sessionId)
console.log('Target URL:', targetUrl)
```

Then check logs:
```bash
npx supabase functions logs proxy-service --tail
```

## Quick Fix Steps

1. **Stop all services**
   ```bash
   # Stop any running functions
   Ctrl+C in terminal running functions
   ```

2. **Restart Supabase**
   ```bash
   npx supabase stop
   npx supabase start
   ```

3. **Deploy function**
   ```bash
   npx supabase functions deploy proxy-service
   ```

4. **Test function**
   ```bash
   # Create a test session and try accessing it
   ```

## Contact Support

If none of these solutions work:
1. Check Supabase status page
2. Review Edge Function documentation
3. Check GitHub issues for similar problems
4. Contact Supabase support with:
   - Error messages
   - Function logs
   - Browser console errors 