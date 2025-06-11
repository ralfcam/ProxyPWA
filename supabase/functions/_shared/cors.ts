export const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:54321',
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
    'Access-Control-Allow-Origin': origin || corsHeaders['Access-Control-Allow-Origin']
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }
  return null
} 