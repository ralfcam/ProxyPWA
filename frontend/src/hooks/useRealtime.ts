// frontend/src/hooks/useRealtime.ts
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

interface ProxySession {
  id: string
  user_id: string
  bytes_transferred: number
  started_at: string
  status: string
}

interface Stats {
  bytesTransferred: number
  activeTime: number
}

export const useRealtime = (userId: string) => {
  const [proxySession, setProxySession] = useState<ProxySession | null>(null)
  const [stats, setStats] = useState<Stats>({ bytesTransferred: 0, activeTime: 0 })
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!userId) return

    // Clean up previous subscription if it exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    // Create new subscription
    const channel = supabase.channel(`proxy-sessions-${userId}`)
    channelRef.current = channel

    channel
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'proxy_sessions',
          filter: `user_id=eq.${userId}`
        }, 
        (payload: { new: ProxySession }) => {
          setProxySession(payload.new)
          setStats({
            bytesTransferred: payload.new.bytes_transferred,
            activeTime: Math.floor((Date.now() - new Date(payload.new.started_at).getTime()) / 1000)
          })
        }
      )
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId])

  return { proxySession, stats }
}