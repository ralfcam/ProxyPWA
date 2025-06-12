import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, ArrowRight, RefreshCw, ExternalLink, AlertCircle, Shield, Globe, Settings2, Home } from 'lucide-react'
import Button from '../ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'

interface UnifiedProxyViewerProps {
  targetDomain: string
  sessionId: string
  mode: 'direct' | 'external'
  onClose: () => void
  onNavigate?: (url: string) => void
}

const UnifiedProxyViewer = ({ targetDomain, sessionId, mode, onClose, onNavigate }: UnifiedProxyViewerProps) => {
  const [currentUrl, setCurrentUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [iframeKey, setIframeKey] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [urlHistory, setUrlHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  
  // Get the Supabase project URL from environment
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const isLocalDev = supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')
  const proxyBaseUrl = isLocalDev 
    ? 'http://localhost:54321/functions/v1/proxy-service'
    : `${supabaseUrl}/functions/v1/proxy-service`
  
  useEffect(() => {
    const url = targetDomain.startsWith('http') ? targetDomain : `https://${targetDomain}`
    setCurrentUrl(url)
    // Initialize history with the first URL
    setUrlHistory([url])
    setHistoryIndex(0)
  }, [targetDomain])

  const getProxyUrl = (url: string) => {
    const encodedUrl = encodeURIComponent(url)
    return `${proxyBaseUrl}/${sessionId}/${encodedUrl}`
  }

  // Navigation functions
  const navigateTo = (url: string) => {
    setIsLoading(true)
    setError('')
    
    // Ensure URL has protocol
    let targetUrl = url
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl
    }

    // Update history
    const newHistory = [...urlHistory.slice(0, historyIndex + 1), targetUrl]
    setUrlHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
    
    // Navigate
    setCurrentUrl(targetUrl)
    setIframeKey(prev => prev + 1)
    onNavigate?.(targetUrl)
  }

  const handleGoBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setCurrentUrl(urlHistory[newIndex])
      setIsLoading(true)
      setError('')
      setIframeKey(prev => prev + 1)
    }
  }

  const handleGoForward = () => {
    if (historyIndex < urlHistory.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setCurrentUrl(urlHistory[newIndex])
      setIsLoading(true)
      setError('')
      setIframeKey(prev => prev + 1)
    }
  }

  const handleGoHome = () => {
    navigateTo(targetDomain)
  }

  const handleRefresh = () => {
    setIsLoading(true)
    setError('')
    if (iframeRef.current) {
      iframeRef.current.src = getProxyUrl(currentUrl) + (currentUrl.includes('?') ? '&' : '?') + 't=' + Date.now()
    } else {
      setIframeKey(prev => prev + 1)
    }
  }

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault()
    if (urlInputRef.current && urlInputRef.current.value) {
      navigateTo(urlInputRef.current.value)
    }
  }

  const handleOpenOriginal = () => {
    window.open(currentUrl, '_blank')
  }

  const handleIframeLoad = () => {
    setIsLoading(false)
  }

  const handleIframeError = () => {
    setIsLoading(false)
    setError('Failed to load page through proxy. The website may block proxy connections.')
  }

  // Handle messages from iframe content
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Handle navigation requests from proxied content
      if (event.data?.type === 'navigate' && event.data?.url) {
        navigateTo(event.data.url)
      }
      
      // Handle proxy ready signal
      if (event.data?.type === 'proxy-ready') {
        setIsLoading(false)
      }
      
      // Handle proxy errors
      if (event.data?.type === 'proxy-error') {
        setError(event.data.message || 'Failed to load content through proxy')
        setIsLoading(false)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [historyIndex, urlHistory])

  // Navigation button states
  const canGoBack = historyIndex > 0
  const canGoForward = historyIndex < urlHistory.length - 1

  // External proxy services
  const externalProxies = [
    { name: 'Hide.me', url: 'https://hide.me/en/proxy' },
    { name: 'ProxySite', url: 'https://www.proxysite.com/' },
    { name: 'CroxyProxy', url: 'https://www.croxyproxy.com/' },
    { name: 'KProxy', url: 'https://kproxy.com/' }
  ]

  const openExternalProxy = (proxyUrl: string) => {
    window.open(proxyUrl, '_blank')
  }

  // External proxy mode UI
  if (mode === 'external') {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="border-b bg-background/95 backdrop-blur p-4">
            <div className="flex items-center justify-between">
              <Button onClick={onClose} variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              
              <Button onClick={handleOpenOriginal} variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Original
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    External Proxy Services
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="font-medium mb-2">How to use:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Click on a proxy service below</li>
                      <li>Paste this URL: <code className="bg-muted px-1 rounded">{currentUrl}</code></li>
                      <li>Click the proxy's "Go" button</li>
                    </ol>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {externalProxies.map((proxy) => (
                      <Button
                        key={proxy.name}
                        onClick={() => openExternalProxy(proxy.url)}
                        variant="outline"
                        className="h-auto p-4 justify-start"
                      >
                        <div>
                          <p className="font-medium">{proxy.name}</p>
                          <p className="text-xs text-muted-foreground">Click to open</p>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Direct proxy mode UI (enhanced with navigation features)
  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="flex flex-col h-full">
        {/* Enhanced Header with Navigation */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {/* Top Bar */}
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-2">
              <Button onClick={onClose} variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              
              <div className="flex items-center gap-1 ml-4">
                <Shield className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Secure Proxy</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowSettings(!showSettings)}
                variant="ghost"
                size="sm"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleOpenOriginal}
                variant="outline"
                size="sm"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Original
              </Button>
            </div>
          </div>

          {/* Navigation Bar */}
          <div className="flex items-center gap-2 p-3">
            {/* Navigation Buttons */}
            <div className="flex items-center gap-1">
              <Button
                onClick={handleGoBack}
                variant="ghost"
                size="sm"
                disabled={!canGoBack}
                className="px-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              
              <Button
                onClick={handleGoForward}
                variant="ghost"
                size="sm"
                disabled={!canGoForward}
                className="px-2"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
              
              <Button
                onClick={handleRefresh}
                variant="ghost"
                size="sm"
                disabled={isLoading}
                className="px-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              
              <Button
                onClick={handleGoHome}
                variant="ghost"
                size="sm"
                className="px-2"
              >
                <Home className="h-4 w-4" />
              </Button>
            </div>

            {/* URL Bar */}
            <form onSubmit={handleNavigate} className="flex-1 flex items-center gap-2">
              <div className="flex-1 relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  ref={urlInputRef}
                  type="text"
                  defaultValue={currentUrl}
                  className="w-full pl-10 pr-3 py-1.5 text-sm bg-muted rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter URL..."
                  onFocus={(e) => e.target.select()}
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="sm"
              >
                Go
              </Button>
            </form>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-200">
              <Shield className="h-4 w-4 flex-shrink-0" />
              <span>Secure proxy connection • Session: {sessionId.slice(0, 8)}...</span>
            </div>
            {showSettings && (
              <div className="text-xs text-muted-foreground">
                Advanced settings coming soon...
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative bg-muted">
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 border-3 border-primary/20 rounded-full" />
                  <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin absolute inset-0" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Loading through secure proxy...</p>
                  <p className="text-xs text-muted-foreground mt-1">{currentUrl}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Error Display */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <Card className="max-w-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    Proxy Error
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Possible solutions:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Check if the URL is correct</li>
                      <li>Try refreshing the page</li>
                      <li>Switch to external proxy mode</li>
                      <li>Some sites block all proxy connections</li>
                    </ul>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleRefresh} size="sm">
                      Try Again
                    </Button>
                    <Button onClick={handleOpenOriginal} variant="outline" size="sm">
                      Open Original
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Proxy Iframe */}
          {!error && (
            <iframe
              ref={iframeRef}
              key={iframeKey}
              src={getProxyUrl(currentUrl)}
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-presentation allow-top-navigation-by-user-activation allow-pointer-lock allow-orientation-lock"
              allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; payment; autoplay; fullscreen; picture-in-picture; xr-spatial-tracking; clipboard-read; clipboard-write"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Secure proxy session for ${currentUrl}`}
            />
          )}
        </div>

        {/* Status Bar */}
        <div className="border-t bg-background/95 backdrop-blur px-3 py-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Proxy Active</span>
              <span>Session: {sessionId.slice(0, 8)}...</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Target: {currentUrl}</span>
              <span>{isLoading ? 'Loading...' : error ? 'Error' : 'Ready'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UnifiedProxyViewer 