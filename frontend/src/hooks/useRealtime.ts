// frontend/src/hooks/useRealtime.ts
import { useEffect, useState, useRef } from 'react'
import { supabase, safeRemoveChannel } from '../lib/supabase'

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
    let mounted = true
    
    const setupChannel = async () => {
      if (!userId || !mounted) return

      // Clean up previous subscription if it exists
      if (channelRef.current) {
        await safeRemoveChannel(channelRef.current)
        channelRef.current = null
      }

      // Create new subscription with a unique channel name
      const channelName = `proxy-sessions-${userId}_${Date.now()}`
      const channel = supabase.channel(channelName)
      channelRef.current = channel

      try {
        await channel
          .on('postgres_changes', 
            { 
              event: 'UPDATE', 
              schema: 'public', 
              table: 'proxy_sessions',
              filter: `user_id=eq.${userId}`
            }, 
            (payload: { new: ProxySession }) => {
              if (mounted) {
                setProxySession(payload.new)
                setStats({
                  bytesTransferred: payload.new.bytes_transferred,
                  activeTime: Math.floor((Date.now() - new Date(payload.new.started_at).getTime()) / 1000)
                })
              }
            }
          )
          .subscribe()
      } catch (error) {
        console.error('Error setting up channel:', error)
        if (mounted) {
          channelRef.current = null
        }
      }
    }

    setupChannel()

    return () => {
      mounted = false
      safeRemoveChannel(channelRef.current)
      channelRef.current = null
    }
  }, [userId])

  return { proxySession, stats }
}