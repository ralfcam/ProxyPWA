export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth, cookie, credentials',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
}

export function handleCors(req: Request): Response | null {
  // Get the origin from the request headers
  const origin = req.headers.get('origin')
  
  // Create a copy of corsHeaders with dynamic origin if present
  const headers = {
    ...corsHeaders,
    // Use the specific origin if provided, otherwise use wildcard
    'Access-Control-Allow-Origin': origin || '*',
    // Note: When using credentials, we can't use wildcard origin
    'Access-Control-Allow-Credentials': origin ? 'true' : 'false'
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }
  return null
} 