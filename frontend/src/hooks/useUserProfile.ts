import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

interface UserProfile {
  id: string
  email: string
  full_name?: string
  time_balance_minutes: number
  subscription_status: string
  subscription_tier: string
  max_concurrent_sessions: number
  total_bytes_used: number
  last_activity_at?: string
}

export const useUserProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
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
    if (!user) return

    const channel = supabase.channel(`user_profile_${user.id}`)
    
    channel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          setProfile(payload.new as UserProfile)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const refreshProfile = () => {
    fetchProfile()
  }

  return { profile, loading, refreshProfile }
} 