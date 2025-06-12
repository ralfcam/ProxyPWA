import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, ArrowRight, RefreshCw, ExternalLink, AlertCircle, Shield, Globe, Settings2, Home } from 'lucide-react'
import Button from '../ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import ProxyViewerWrapper from './ProxyViewerWrapper'

interface EnhancedUnifiedProxyViewerProps {
  targetDomain: string
  sessionId: string
  mode: 'direct' | 'external'
  onClose: () => void
  onNavigate?: (url: string) => void
  experimentalSSR?: boolean // Enable experimental SSR mode
}

const EnhancedUnifiedProxyViewer = ({ 
  targetDomain, 
  sessionId, 
  mode, 
  onClose, 
  onNavigate,
  experimentalSSR = true  // Default to true for SSR mode
}: EnhancedUnifiedProxyViewerProps) => {
  const [currentUrl, setCurrentUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [urlHistory, setUrlHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [useWebComponent, setUseWebComponent] = useState(true)  // Default to SSR mode
  const [renderMode, setRenderMode] = useState<'iframe' | 'ssr' | 'auto'>('ssr')  // Default to SSR
  const [cspLevel, setCspLevel] = useState<'permissive' | 'balanced' | 'strict'>('permissive')  // Default to permissive for better compatibility
  const urlInputRef = useRef<HTMLInputElement>(null)
  const viewerRef = useRef<any>(null)
  
  useEffect(() => {
    const url = targetDomain.startsWith('http') ? targetDomain : `https://${targetDomain}`
    setCurrentUrl(url)
    setUrlHistory([url])
    setHistoryIndex(0)
  }, [targetDomain])

  // Navigation functions
  const navigateTo = (url: string) => {
    setIsLoading(true)
    setError('')
    
    let targetUrl = url
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl
    }

    const newHistory = [...urlHistory.slice(0, historyIndex + 1), targetUrl]
    setUrlHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
    
    setCurrentUrl(targetUrl)
    onNavigate?.(targetUrl)
  }

  const handleGoBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setCurrentUrl(urlHistory[newIndex])
      setIsLoading(true)
      setError('')
    }
  }

  const handleGoForward = () => {
    if (historyIndex < urlHistory.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setCurrentUrl(urlHistory[newIndex])
      setIsLoading(true)
      setError('')
    }
  }

  const handleGoHome = () => {
    navigateTo(targetDomain)
  }

  const handleRefresh = () => {
    setIsLoading(true)
    setError('')
    
    // If using Web Component, call its refresh method
    if (useWebComponent && viewerRef.current?.refresh) {
      viewerRef.current.refresh()
    } else {
      // Force reload by updating key
      setCurrentUrl(currentUrl + (currentUrl.includes('?') ? '&' : '?') + 't=' + Date.now())
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

  const handleProxyLoad = (event: { mode: string; url: string }) => {
    setIsLoading(false)
    console.log('Proxy loaded:', event)
  }

  const handleProxyError = (error: Error) => {
    setIsLoading(false)
    setError(error.message)
  }

  const handleProxyNavigate = (url: string) => {
    // Update URL history without triggering navigation
    const newHistory = [...urlHistory.slice(0, historyIndex + 1), url]
    setUrlHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
    setCurrentUrl(url)
    
    // Update input field
    if (urlInputRef.current) {
      urlInputRef.current.value = url
    }
  }

  // Navigation button states
  const canGoBack = historyIndex > 0
  const canGoForward = historyIndex < urlHistory.length - 1

  // External proxy mode UI
  if (mode === 'external') {
    const externalProxies = [
      { name: 'Hide.me', url: 'https://hide.me/en/proxy' },
      { name: 'ProxySite', url: 'https://www.proxysite.com/' },
      { name: 'CroxyProxy', url: 'https://www.croxyproxy.com/' },
      { name: 'KProxy', url: 'https://kproxy.com/' }
    ]

    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="flex flex-col h-full">
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
                        onClick={() => window.open(proxy.url, '_blank')}
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

  // Direct proxy mode UI with enhanced features
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

              {useWebComponent && (
                <div className="flex items-center gap-1 ml-2">
                  <Shield className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">SSR Mode Active</span>
                </div>
              )}
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

          {/* Settings Panel */}
          {showSettings && (
            <div className="border-t bg-muted/50 p-3">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={useWebComponent}
                        onChange={(e) => setUseWebComponent(e.target.checked)}
                        className="rounded"
                      />
                      <span>Enhanced SSR Mode</span>
                      <Shield className="h-3 w-3 text-blue-500" />
                    </label>

                    {useWebComponent && (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Render Mode:</span>
                          <select 
                            value={renderMode} 
                            onChange={(e) => setRenderMode(e.target.value as any)}
                            className="text-xs border rounded px-2 py-1 bg-background"
                          >
                            <option value="auto">Auto-detect</option>
                            <option value="ssr">Force SSR</option>
                            <option value="iframe">Force Iframe</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Security:</span>
                          <select 
                            value={cspLevel} 
                            onChange={(e) => setCspLevel(e.target.value as any)}
                            className="text-xs border rounded px-2 py-1 bg-background"
                          >
                            <option value="permissive">Permissive (Recommended)</option>
                            <option value="balanced">Balanced</option>
                            <option value="strict">Strict</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {useWebComponent && (
                  <div className="text-xs text-muted-foreground pl-6">
                    SSR mode processes content server-side to bypass iframe restrictions. 
                    Use "Permissive" security for maximum compatibility.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-200">
              <Shield className="h-4 w-4 flex-shrink-0" />
              <span>Secure proxy connection • Session: {sessionId.slice(0, 8)}...</span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative bg-muted">
          {/* Error Display */}
          {error && !useWebComponent && (
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
                      <li>Switch render mode to "Force Iframe" in settings</li>
                      <li>Try a more permissive security level</li>
                      <li>Use external proxy mode for problematic sites</li>
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
          
          {/* Proxy Content */}
          {useWebComponent ? (
            <ProxyViewerWrapper
              ref={viewerRef}
              targetUrl={currentUrl}
              sessionId={sessionId}
              mode={renderMode}
              cspLevel={cspLevel}
              fallbackEnabled={true}
              onNavigate={handleProxyNavigate}
              onLoad={handleProxyLoad}
              onError={handleProxyError}
              className="w-full h-full"
            />
          ) : (
            // Legacy iframe implementation
            !error && (
              <iframe
                key={currentUrl}
                src={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-service/${sessionId}/${encodeURIComponent(currentUrl)}`}
                className="w-full h-full border-0"
                onLoad={() => setIsLoading(false)}
                onError={() => setError('Failed to load page through proxy. The website may block proxy connections.')}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-presentation allow-top-navigation-by-user-activation allow-pointer-lock allow-orientation-lock"
                allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; payment; autoplay; fullscreen; picture-in-picture; xr-spatial-tracking; clipboard-read; clipboard-write"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Secure proxy session for ${currentUrl}`}
              />
            )
          )}
        </div>

        {/* Status Bar */}
        <div className="border-t bg-background/95 backdrop-blur px-3 py-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Proxy Active</span>
              <span>Session: {sessionId.slice(0, 8)}...</span>
              {useWebComponent && <span>Mode: {renderMode.toUpperCase()}</span>}
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

export default EnhancedUnifiedProxyViewer 