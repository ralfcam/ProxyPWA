import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Activity, Clock, Globe, Zap, TrendingUp, Calendar } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { formatTime } from '../../lib/utils'

interface SessionStats {
  total_sessions: number
  total_minutes: number
  total_bytes: number
  total_requests: number
  avg_session_duration: number
  top_domains: Array<{
    domain: string
    sessions: number
    bytes: number
  }>
}

interface RecentSession {
  id: string
  target_domain: string
  started_at: string
  ended_at: string | null
  status: string
  bytes_transferred: number
  requests_count: number
  minutes_used: number
}

const Statistics = () => {
  const [stats, setStats] = useState<SessionStats | null>(null)
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      loadStatistics()
    }
  }, [user])

  const loadStatistics = async () => {
    try {
      setLoading(true)
      
      // Load aggregate statistics - pass user_id and days_back
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_user_session_stats', {
          user_uuid: user!.id,
          days_back: 30 // Get stats for last 30 days
        })
      
      if (statsError) {
        console.error('Error loading statistics:', statsError)
      } else if (statsData) {
        // The function returns a single row, so we need to access the first element
        const stats = Array.isArray(statsData) ? statsData[0] : statsData
        setStats(stats)
      }

      // Load recent sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('proxy_sessions')
        .select('*')
        .eq('user_id', user!.id)
        .order('started_at', { ascending: false })
        .limit(10)

      if (sessionsError) {
        console.error('Error loading recent sessions:', sessionsError)
      } else if (sessionsData) {
        setRecentSessions(sessionsData)
      }
    } catch (error) {
      console.error('Error loading statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 MB'
    const mb = bytes / 1024 / 1024
    return mb < 1 ? `${(bytes / 1024).toFixed(2)} KB` : `${mb.toFixed(2)} MB`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20'
      case 'terminated':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
      case 'expired':
        return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20'
      case 'error':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20'
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Usage Statistics</h2>
        <p className="text-muted-foreground">Track your proxy usage and performance metrics</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats?.total_sessions || 0}
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Used</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : formatBytes(Number(stats?.total_bytes) || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total bandwidth</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Used</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : formatTime(Number(stats?.total_minutes) || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Session time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats?.avg_session_duration ? `${Math.round(Number(stats.avg_session_duration))} min` : '-- min'}
            </div>
            <p className="text-xs text-muted-foreground">Per session</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Domains */}
      {stats?.top_domains && stats.top_domains.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Top Domains
            </CardTitle>
            <CardDescription>Most visited domains in the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.top_domains.slice(0, 5).map((domain: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                  <span className="font-medium">{domain.domain}</span>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{domain.sessions} sessions</span>
                    <span>{formatBytes(domain.bytes)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Usage Trends
          </CardTitle>
          <CardDescription>Your proxy usage over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Usage charts coming soon...
          </div>
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Sessions
          </CardTitle>
          <CardDescription>Your latest proxy sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading sessions...
            </div>
          ) : recentSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sessions yet. Start your first proxy session to see statistics here.
            </div>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{session.target_domain}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(session.started_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <p className="text-muted-foreground">
                        {session.requests_count} requests
                      </p>
                      <p className="text-muted-foreground">
                        {formatBytes(session.bytes_transferred)}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                      {session.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Statistics
