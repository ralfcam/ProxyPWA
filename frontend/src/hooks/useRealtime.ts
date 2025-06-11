// frontend/src/hooks/useRealtime.ts
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export const useRealtime = (userId: string) => {
  const [proxySession, setProxySession] = useState(null)
  const [stats, setStats] = useState({ bytesTransferred: 0, activeTime: 0 })

  useEffect(() => {
    if (!userId) return

    // Subscribe to proxy session changes
    const sessionSubscription = supabase
      .channel('proxy-sessions')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'proxy_sessions',
          filter: `user_id=eq.${userId}`
        }, 
        (payload) => {
          setProxySession(payload.new)
          setStats({
            bytesTransferred: payload.new.bytes_transferred,
            activeTime: Math.floor((new Date() - new Date(payload.new.started_at)) / 1000)
          })
        }
      )
      .subscribe()

    return () => {
      sessionSubscription.unsubscribe()
    }
  }, [userId])

  return { proxySession, stats }
}