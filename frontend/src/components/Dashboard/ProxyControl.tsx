﻿import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Globe, Power, ExternalLink, Copy, AlertCircle, CheckCircle, Shield } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { useAuth } from '../../hooks/useAuth'
import { useUserProfile } from '../../hooks/useUserProfile'
import { supabase } from '../../lib/supabase'
import { extractDomain, isValidUrl, copyToClipboard, cn } from '../../lib/utils'
import ProxyViewer from './ProxyViewer'
import { ProxySession } from './types'

// Balance Alert Component
const BalanceAlert = ({ balance }: { balance: number }) => {
  if (balance >= 10) return null

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex gap-3">
          <AlertCircle className={cn(
            "h-5 w-5 flex-shrink-0 mt-0.5",
            balance === 0 ? "text-red-500" : "text-amber-500"
          )} />
          <div className="space-y-1">
            <p className="font-medium">
              {balance === 0 ? 'No Balance Remaining' : 'Low Balance Warning'}
            </p>
            <p className="text-sm text-muted-foreground">
              {balance === 0 
                ? 'You have no time balance remaining. Please top up your account to start new sessions.' 
                : `You have ${balance} minutes remaining. Consider topping up your account.`
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Session Status Component
const SessionStatus = ({ 
  session, 
  onOpenViewer, 
  onCopyUrl, 
  onTerminate,
  loading 
}: {
  session: ProxySession
  onOpenViewer: () => void
  onCopyUrl: () => void
  onTerminate: () => void
  loading: boolean
}) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
      <CheckCircle className="h-5 w-5 text-green-600" />
      <div>
        <p className="font-medium text-green-900 dark:text-green-100">
          Proxy Session Active
        </p>
        <p className="text-sm text-green-700 dark:text-green-300">
          Connected to: {session.target_domain}
        </p>
      </div>
    </div>

    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <Button 
          onClick={onOpenViewer}
          className="flex-1"
          variant="outline"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Open Proxy Session
        </Button>
        
        <Button 
          onClick={onCopyUrl}
          variant="outline"
        >
          <Copy className="h-4 w-4 mr-2" />
          Copy URL
        </Button>
      </div>

      <Button 
        onClick={onTerminate}
        variant="destructive"
        loading={loading}
        className="w-full"
      >
        <Power className="h-4 w-4 mr-2" />
        Terminate Session
      </Button>
    </div>

    <div className="grid grid-cols-2 gap-4 text-sm">
      <div>
        <span className="text-muted-foreground">Requests:</span>
        <span className="ml-2 font-medium">{session.requests_count}</span>
      </div>
      <div>
        <span className="text-muted-foreground">Data:</span>
        <span className="ml-2 font-medium">
          {(session.bytes_transferred / 1024 / 1024).toFixed(2)} MB
        </span>
      </div>
    </div>
  </div>
)

// New Session Form Component
const NewSessionForm = ({ 
  onStart, 
  loading, 
  disabled 
}: {
  onStart: (url: string) => void
  loading: boolean
  disabled: boolean
}) => {
  const [targetUrl, setTargetUrl] = useState('')
  const [urlError, setUrlError] = useState('')

  const validateUrl = (url: string) => {
    if (!url.trim()) {
      setUrlError('Please enter a URL')
      return false
    }

    const fullUrl = url.startsWith('http') ? url : `https://${url}`
    
    if (!isValidUrl(fullUrl)) {
      setUrlError('Please enter a valid URL')
      return false
    }

    setUrlError('')
    return true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateUrl(targetUrl)) {
      onStart(targetUrl)
      setTargetUrl('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Target Website</label>
        <Input
          type="text"
          placeholder="Enter URL (e.g., example.com or https://example.com)"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          error={urlError}
          disabled={loading || disabled}
        />
      </div>
      
      <Button 
        type="submit"
        loading={loading}
        disabled={loading || !targetUrl.trim() || disabled}
        className="w-full"
      >
        <Power className="h-4 w-4 mr-2" />
        Start Proxy Session
      </Button>
    </form>
  )
}

const ProxyControl = () => {
  const [loading, setLoading] = useState(false)
  const [activeSession, setActiveSession] = useState<ProxySession | null>(null)
  const [showProxyViewer, setShowProxyViewer] = useState(false)
  const [useDirectProxy, setUseDirectProxy] = useState(true)
  const { user } = useAuth()
  const { profile, refreshProfile } = useUserProfile()

  useEffect(() => {
    if (user) {
      loadActiveSession()
    }
  }, [user])

  const loadActiveSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || !user?.id) return

      const { data, error } = await supabase
        .from('proxy_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1)

      if (error && error.code !== 'PGRST301' && !error.message?.includes('JWT')) {
        console.error('Error loading active session:', error)
        return
      }

      if (data && data.length > 0) {
        setActiveSession(data[0])
      }
    } catch (error) {
      console.error('Error loading active session:', error)
    }
  }

  const startProxySession = async (targetUrl: string) => {
    setLoading(true)
    try {
      const domain = extractDomain(targetUrl)
      
      await supabase.rpc('cleanup_stale_sessions')
      
      const { data: canStart, error: canStartError } = await supabase
        .rpc('can_start_proxy_session')

      if (canStartError) {
        console.error('Error checking session eligibility:', canStartError)
        toast.error('Error checking session eligibility')
        return
      }

      if (!canStart) {
        toast.error('Unable to start session. Please check your balance and active sessions.')
        return
      }

      const { data, error } = await supabase
        .rpc('start_proxy_session', {
          target_domain: domain
        })

      if (error) {
        console.error('Error starting proxy session:', error)
        toast.error(error.message || 'Failed to start proxy session')
        return
      }

      if (data) {
        toast.success('Proxy session started successfully!')
        await loadActiveSession()
        refreshProfile()
      }
    } catch (error) {
      console.error('Error starting proxy session:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const terminateSession = async () => {
    if (!activeSession) return

    setLoading(true)
    try {
      const { error } = await supabase
        .rpc('terminate_proxy_session', {
          session_id: activeSession.id
        })

      if (error) {
        console.error('Error terminating session:', error)
        toast.error('Failed to terminate session')
        return
      }

      toast.success('Session terminated successfully')
      setActiveSession(null)
      refreshProfile()
    } catch (error) {
      console.error('Error terminating session:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const copySessionUrl = async () => {
    if (!activeSession) return
    
    const success = await copyToClipboard(activeSession.session_url)
    if (success) {
      toast.success('Session URL copied to clipboard!')
    } else {
      toast.error('Failed to copy URL')
    }
  }

  const openProxyViewer = () => {
    if (!activeSession) return
    setShowProxyViewer(true)
  }

  return (
    <>
      {showProxyViewer && activeSession && (
        <ProxyViewer
          targetDomain={activeSession.target_domain}
          sessionId={activeSession.id}
          mode={useDirectProxy ? 'direct' : 'external'}
          onClose={() => setShowProxyViewer(false)}
        />
      )}
      
      <div className="space-y-6">
        {/* Balance Warning */}
        {profile && <BalanceAlert balance={profile.time_balance_minutes} />}
        
        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Proxy Control
            </CardTitle>
            <CardDescription>
              Start a secure proxy session to browse anonymously
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!activeSession ? (
              <NewSessionForm
                onStart={startProxySession}
                loading={loading}
                disabled={profile?.time_balance_minutes === 0}
              />
            ) : (
              <SessionStatus
                session={activeSession}
                onOpenViewer={openProxyViewer}
                onCopyUrl={copySessionUrl}
                onTerminate={terminateSession}
                loading={loading}
              />
            )}
          </CardContent>
        </Card>

        {/* Proxy Mode Toggle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Proxy Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-medium">Current Mode</p>
                <p className="text-sm text-muted-foreground">
                  {useDirectProxy ? 'Supabase Edge Function (Recommended)' : 'External Proxy Services'}
                </p>
              </div>
              <Button
                onClick={() => setUseDirectProxy(!useDirectProxy)}
                variant="outline"
                size="sm"
              >
                Switch to {useDirectProxy ? 'External' : 'Direct'}
              </Button>
            </div>
            {!useDirectProxy && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  External proxy mode uses third-party services. For better security and control, use Direct Proxy mode.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Usage Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Each session consumes time from your account balance</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Sessions automatically terminate when inactive for 10 minutes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Only one active session allowed at a time</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Some websites may block proxy connections</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default ProxyControl
