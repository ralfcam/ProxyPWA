import { useState, useEffect, useRef } from 'react'
import { supabase, safeRemoveChannel } from '../lib/supabase'
import { useAuth } from './useAuth'

interface UserProfile {
  id: string
  email: string
  full_name?: string
  display_name?: string
  phone?: string
  location?: string
  time_balance_minutes: number
  subscription_status: string
  subscription_tier: string
  max_concurrent_sessions: number
  total_bytes_used: number
  last_activity_at?: string
  last_topup_at?: string
  created_at?: string
  updated_at?: string
}

export const useUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    try {
      // Check if we have a valid session first
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.log('No active session found')
        setProfile(null)
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        // Don't log 401 errors as they're expected when not authenticated
        if (error.code !== 'PGRST301' && !error.message?.includes('JWT')) {
          console.error('Error fetching user profile:', error)
        }
        return
      }

      setProfile(data)
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [user])

  // Subscribe to real-time updates of user profile
  useEffect(() => {
    let mounted = true
    
    const setupChannel = async () => {
      if (!user || !mounted) return

      // Clean up previous subscription if it exists
      if (channelRef.current) {
        await safeRemoveChannel(channelRef.current)
        channelRef.current = null
      }

      // Create new subscription with a unique channel name
      const channelName = `user_profile_${user.id}_${Date.now()}`
      const channel = supabase.channel(channelName)
      channelRef.current = channel
      
      try {
        await channel
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'user_profiles',
              filter: `id=eq.${user.id}`,
            },
            (payload) => {
              if (mounted) {
                setProfile(payload.new as UserProfile)
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
  }, [user])

  const refreshProfile = () => {
    fetchProfile()
  }

  return { profile, loading, refreshProfile }
} 