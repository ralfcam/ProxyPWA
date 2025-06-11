import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, ArrowRight, RefreshCw, ExternalLink, Home, Shield, Globe } from 'lucide-react'
import Button from '../ui/Button'

interface ProxyViewerProps {
  sessionUrl: string
  targetDomain: string
  sessionId?: string
  onClose: () => void
  onNavigate?: (url: string) => void
}

const ProxyViewer = ({ sessionUrl, targetDomain, sessionId, onClose, onNavigate }: ProxyViewerProps) => {
  const [currentUrl, setCurrentUrl] = useState(sessionUrl)
  const [displayUrl, setDisplayUrl] = useState(targetDomain)
  const [isLoading, setIsLoading] = useState(true)
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const [urlHistory, setUrlHistory] = useState<string[]>([sessionUrl])
  const [historyIndex, setHistoryIndex] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)

  // Extract the actual target URL from the session URL
  useEffect(() => {
    try {
      const url = new URL(sessionUrl)
      const pathParts = url.pathname.split('/')
      const proxyIndex = pathParts.findIndex(part => part === 'proxy-service')
      if (proxyIndex !== -1 && pathParts.length > proxyIndex + 2) {
        const targetUrl = decodeURIComponent(pathParts.slice(proxyIndex + 2).join('/'))
        setDisplayUrl(targetUrl)
      }
    } catch (error) {
      console.error('Error parsing session URL:', error)
    }
  }, [sessionUrl])

  // Handle navigation through proxy
  const navigateTo = (url: string) => {
    setIsLoading(true)
    
    // Ensure URL has protocol
    let targetUrl = url
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl
    }

    // Construct proxy URL
    const proxyBaseUrl = sessionUrl.split('/proxy-service')[0] + '/proxy-service'
    const encodedUrl = encodeURIComponent(targetUrl)
    const newProxyUrl = sessionId 
      ? `${proxyBaseUrl}/${sessionId}/${encodedUrl}`
      : `${proxyBaseUrl}?url=${encodedUrl}`

    // Update history
    const newHistory = [...urlHistory.slice(0, historyIndex + 1), newProxyUrl]
    setUrlHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
    
    // Navigate
    setCurrentUrl(newProxyUrl)
    setDisplayUrl(targetUrl)
    onNavigate?.(targetUrl)
  }

  const handleRefresh = () => {
    setIsLoading(true)
    if (iframeRef.current) {
      iframeRef.current.src = currentUrl + (currentUrl.includes('?') ? '&' : '?') + 't=' + Date.now()
    }
  }

  const handleGoBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setCurrentUrl(urlHistory[newIndex])
      setIsLoading(true)
    }
  }

  const handleGoForward = () => {
    if (historyIndex < urlHistory.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setCurrentUrl(urlHistory[newIndex])
      setIsLoading(true)
    }
  }

  const handleGoHome = () => {
    navigateTo(targetDomain)
  }

  const handleOpenExternal = () => {
    window.open(displayUrl, '_blank')
  }

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (urlInputRef.current) {
      navigateTo(urlInputRef.current.value)
    }
  }

  // Handle messages from iframe content
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Handle navigation requests from proxied content
      if (event.data?.type === 'navigate' && event.data?.url) {
        navigateTo(event.data.url)
      }
      
      // Handle other message types
      if (event.data?.type === 'proxy-ready') {
        setIsLoading(false)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [historyIndex, urlHistory])

  // Update navigation button states
  useEffect(() => {
    setCanGoBack(historyIndex > 0)
    setCanGoForward(historyIndex < urlHistory.length - 1)
  }, [historyIndex, urlHistory])

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="flex flex-col h-full">
        {/* Enhanced Header with URL Bar */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {/* Top Bar */}
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-2">
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
              >
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
                onClick={handleOpenExternal}
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
            <form onSubmit={handleUrlSubmit} className="flex-1 flex items-center gap-2">
              <div className="flex-1 relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  ref={urlInputRef}
                  type="text"
                  defaultValue={displayUrl}
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

        {/* Iframe Container */}
        <div className="flex-1 relative bg-muted">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 border-3 border-primary/20 rounded-full" />
                  <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin absolute inset-0" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Loading through secure proxy...</p>
                  <p className="text-xs text-muted-foreground mt-1">{displayUrl}</p>
                </div>
              </div>
            </div>
          )}
          
          <iframe
            ref={iframeRef}
            src={currentUrl}
            className="w-full h-full border-0"
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-presentation allow-top-navigation-by-user-activation allow-pointer-lock allow-orientation-lock"
            allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; payment; autoplay; fullscreen; picture-in-picture; xr-spatial-tracking; clipboard-read; clipboard-write"
            referrerPolicy="no-referrer-when-downgrade"
            title={`Secure proxy session for ${displayUrl}`}
          />
        </div>

        {/* Status Bar */}
        <div className="border-t bg-background/95 backdrop-blur px-3 py-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Proxy Active</span>
              {sessionId && <span>Session: {sessionId.slice(0, 8)}...</span>}
            </div>
            <div className="flex items-center gap-4">
              <span>{isLoading ? 'Loading...' : 'Ready'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProxyViewer 