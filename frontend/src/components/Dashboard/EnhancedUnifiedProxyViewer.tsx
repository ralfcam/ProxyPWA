import { useState, useEffect } from 'react'
import { ArrowLeft, ExternalLink, AlertCircle, Shield, Settings2, Globe, ArrowRight, RefreshCw, Home } from 'lucide-react'
import Button from '../ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import ProxyViewerWrapper from './ProxyViewerWrapper'
import { useProxyViewer } from './hooks/useProxyViewer'
import { ExternalProxyMode } from './components/ExternalProxyMode'
import { ProxyNavigationBar } from './components/ProxyNavigationBar'
import { ProxyViewerProps, RenderMode, SecurityLevel } from './types'

const EnhancedUnifiedProxyViewer = ({ 
  targetDomain, 
  sessionId, 
  mode, 
  onClose, 
  onNavigate: onNavigateCallback
}: ProxyViewerProps) => {
  const [showSettings, setShowSettings] = useState(false)
  const [useWebComponent, setUseWebComponent] = useState(true)  // Default to SSR mode
  const [renderMode, setRenderMode] = useState<RenderMode>('ssr')  // Default to SSR
  const [cspLevel, setCspLevel] = useState<SecurityLevel>('permissive')  // Default to permissive for better compatibility
  const [streamingOptimization, setStreamingOptimization] = useState(true)
  
  // BaaS-specific state variables (replacing BrowserQL)
  const [renderQuality, setRenderQuality] = useState<'fast' | 'balanced' | 'complete'>('balanced')
  const [baasOptions, setBaasOptions] = useState({
    stealth: true,
    blockAds: true,
    blockResources: false
  })

  const [baasMetrics, setBaasMetrics] = useState({
    renderTime: 0,
    loadTime: 0,
    networkRequests: 0,
    renderer: 'browserless-baas'
  })
  
  const {
    currentUrl,
    isLoading,
    error,
    preloadMetrics,
    crossOriginErrors,
    resourceOptimizations,
    urlInputRef,
    viewerRef,
    canGoBack,
    canGoForward,
    setPreloadMetrics,
    setResourceOptimizations,
    navigateTo,
    handleGoBack,
    handleGoForward,
    handleGoHome,
    handleRefresh,
    handleNavigate,
    handleOpenOriginal,
    handleProxyLoad,
    handleProxyError,
    handleProxyNavigate
  } = useProxyViewer(targetDomain)

  // The console monitoring is already handled in useProxyViewer hook

  // Enhanced Web Component event monitoring
  useEffect(() => {
    if (viewerRef.current) {
      const handleVideoOptimized = (event: CustomEvent) => {
        setPreloadMetrics(prev => ({ 
          ...prev, 
          optimizedResources: prev.optimizedResources + 1 
        }))
      }

      const handleResourceOptimized = (event: CustomEvent) => {
        const { type, count } = event.detail
        setResourceOptimizations(prev => ({
          ...prev,
          [type]: ((prev as any)[type] || 0) + (count || 1)
        }))
      }

      const handleBaasMetadata = (event: CustomEvent) => {
        const metadata = event.detail
        if (metadata) {
          setBaasMetrics(prev => ({
            ...prev,
            ...metadata
          }))
        }
      }

      viewerRef.current.addEventListener('video-optimized', handleVideoOptimized)
      viewerRef.current.addEventListener('resource-optimized', handleResourceOptimized)
      viewerRef.current.addEventListener('baas-metadata', handleBaasMetadata)
      
      return () => {
        if (viewerRef.current) {
          viewerRef.current.removeEventListener('video-optimized', handleVideoOptimized)
          viewerRef.current.removeEventListener('resource-optimized', handleResourceOptimized)
          viewerRef.current.removeEventListener('baas-metadata', handleBaasMetadata)
        }
      }
    }
  }, [useWebComponent])

  const optimizeStreamingContent = (element: HTMLElement) => {
    // Find and optimize video elements within the proxy content
    const videos = element.querySelectorAll('video[data-lazy-video]')
    videos.forEach(video => {
      // Implement intersection observer for lazy video loading
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const videoElement = entry.target as HTMLVideoElement
            if (videoElement.getAttribute('preload') === 'metadata') {
              videoElement.setAttribute('preload', 'auto')
            }
            observer.unobserve(videoElement)
            setPreloadMetrics(prev => ({ 
              ...prev, 
              optimizedResources: prev.optimizedResources + 1 
            }))
          }
        })
      })
      observer.observe(video)
    })
  }

  // Override handleProxyLoad to add streaming optimization
  const enhancedHandleProxyLoad = (event: { mode: string; url: string }) => {
    handleProxyLoad(event)
    
    // Post-load optimization for streaming content
    if (useWebComponent && viewerRef.current && streamingOptimization) {
      optimizeStreamingContent(viewerRef.current)
    }
  }

  // Wrap navigateTo to call the callback
  const wrappedNavigateTo = (url: string) => {
    navigateTo(url)
    onNavigateCallback?.(url)
  }

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

                  {useWebComponent && (
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={streamingOptimization}
                        onChange={(e) => setStreamingOptimization(e.target.checked)}
                        className="rounded"
                      />
                      <span>Optimize Streaming Content</span>
                    </label>
                  )}
                </div>
                
                {useWebComponent && (
                  <div className="text-xs text-muted-foreground pl-6">
                    SSR mode processes content server-side to bypass iframe restrictions. 
                    Use "Permissive" security for maximum compatibility.
                    {streamingOptimization && ' Streaming optimization reduces preload warnings for video content by using lazy loading strategies.'}
                  </div>
                )}

                {useWebComponent && renderMode === 'ssr' && (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Render Quality:</span>
                      <select 
                        value={renderQuality} 
                        onChange={(e) => setRenderQuality(e.target.value as any)}
                        className="text-xs border rounded px-2 py-1 bg-background ml-2"
                      >
                        <option value="fast">Fast (15s timeout)</option>
                        <option value="balanced">Balanced (30s timeout)</option>
                        <option value="complete">Complete (45s timeout)</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={baasOptions.stealth}
                          onChange={(e) => setBaasOptions(prev => ({ ...prev, stealth: e.target.checked }))}
                          className="rounded"
                        />
                        <span>Stealth Browsing</span>
                      </label>
                      
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={baasOptions.blockAds}
                          onChange={(e) => setBaasOptions(prev => ({ ...prev, blockAds: e.target.checked }))}
                          className="rounded"
                        />
                        <span>Block Ads & Trackers</span>
                      </label>
                      
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={baasOptions.blockResources}
                          onChange={(e) => setBaasOptions(prev => ({ ...prev, blockResources: e.target.checked }))}
                          className="rounded"
                        />
                        <span>Block Heavy Resources (Fast Mode)</span>
                      </label>
                    </div>
                    
                    <div className="text-xs text-muted-foreground mt-2">
                      BaaS provides simplified browser automation through REST API.
                      Stealth mode bypasses most bot detection systems.
                    </div>
                    
                    {baasMetrics.renderTime > 0 && (
                      <div className="mt-3 p-2 bg-green-100 dark:bg-green-900/30 rounded text-xs">
                        ✓ BaaS Rendering Complete
                        <div className="flex flex-wrap gap-2 mt-1 text-xs">
                          <span>Render Time: {baasMetrics.renderTime}ms</span>
                          <span>Load Time: {baasMetrics.loadTime}ms</span>
                          <span>Network Requests: {baasMetrics.networkRequests}</span>
                          <span>Region: Amsterdam</span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {useWebComponent && (
                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-medium">Security & Performance:</div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {resourceOptimizations.crossOriginBlocked > 0 && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                          🔒 {resourceOptimizations.crossOriginBlocked} cross-origin resources blocked
                        </span>
                      )}
                      {resourceOptimizations.preloadsOptimized > 0 && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded">
                          ⚡ {resourceOptimizations.preloadsOptimized} preloads optimized
                        </span>
                      )}
                      {resourceOptimizations.scriptsDisabled > 0 && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 rounded">
                          🛡️ {resourceOptimizations.scriptsDisabled} unsafe scripts disabled
                        </span>
                      )}
                    </div>
                    {crossOriginErrors.length > 0 && (
                      <details className="group">
                        <summary className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400 cursor-pointer">
                          ⚠️ {crossOriginErrors.length} cross-origin warnings
                          <span className="text-muted-foreground">(click to expand)</span>
                        </summary>
                        <div className="mt-1 space-y-1 pl-4">
                          {crossOriginErrors.map((error, index) => (
                            <div key={index} className="text-xs text-muted-foreground truncate">
                              {error}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
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
              renderQuality={renderQuality}
              stealth={baasOptions.stealth}
              blockAds={baasOptions.blockAds}
              blockResources={baasOptions.blockResources}
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
                onLoad={() => handleProxyLoad({ mode: 'iframe', url: currentUrl })}
                onError={() => handleProxyError(new Error('Failed to load page through proxy. The website may block proxy connections.'))}
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
              {streamingOptimization && preloadMetrics.optimizedResources > 0 && (
                <span className="text-green-600 dark:text-green-400">
                  ✓ {preloadMetrics.optimizedResources} videos optimized
                </span>
              )}
              {preloadMetrics.warningsCount > 0 && (
                <span className="text-yellow-600 dark:text-yellow-400">
                  ⚠ {preloadMetrics.warningsCount} preload warnings
                </span>
              )}
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