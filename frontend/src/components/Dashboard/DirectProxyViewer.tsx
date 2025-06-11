import { useState, useEffect } from 'react'
import { ArrowLeft, RefreshCw, ExternalLink, AlertCircle, Shield, Globe } from 'lucide-react'
import Button from '../ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'

interface DirectProxyViewerProps {
  targetDomain: string
  sessionId: string
  onClose: () => void
}

const DirectProxyViewer = ({ targetDomain, sessionId, onClose }: DirectProxyViewerProps) => {
  const [currentUrl, setCurrentUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [iframeKey, setIframeKey] = useState(0)
  
  // Get the Supabase project URL from environment
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  // For local development, use the local Edge Functions URL
  const isLocalDev = supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')
  const proxyBaseUrl = isLocalDev 
    ? 'http://localhost:54321/functions/v1/proxy-service'
    : `${supabaseUrl}/functions/v1/proxy-service`
  
  useEffect(() => {
    // Ensure the target has a protocol
    const url = targetDomain.startsWith('http') ? targetDomain : `https://${targetDomain}`
    setCurrentUrl(url)
  }, [targetDomain])

  const getProxyUrl = (url: string) => {
    // Encode the URL to handle special characters
    const encodedUrl = encodeURIComponent(url)
    return `${proxyBaseUrl}/${sessionId}/${encodedUrl}`
  }

  const handleRefresh = () => {
    setIsLoading(true)
    setError('')
    // Force iframe refresh by changing key
    setIframeKey(prev => prev + 1)
  }

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault()
    if (currentUrl) {
      setIsLoading(true)
      setError('')
      // Force iframe to load new URL
      setIframeKey(prev => prev + 1)
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

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button onClick={onClose} variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              
              <form onSubmit={handleNavigate} className="flex items-center gap-2">
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={currentUrl}
                    onChange={(e) => setCurrentUrl(e.target.value)}
                    className="pl-10 pr-3 py-2 bg-muted rounded-md text-sm w-[400px] focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter URL..."
                  />
                </div>
                <Button type="submit" size="sm" disabled={isLoading}>
                  Go
                </Button>
                <Button 
                  type="button" 
                  onClick={handleRefresh} 
                  variant="ghost" 
                  size="sm"
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </form>
            </div>
            
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

        {/* Security Notice */}
        <div className="bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-200">
              <Shield className="h-4 w-4 flex-shrink-0" />
              <span>Secure proxy connection via Supabase Edge Functions - Session ID: {sessionId.slice(0, 8)}...</span>
            </div>
            <div className="text-xs text-amber-600 dark:text-amber-400">
              Note: Some websites may have limited functionality through proxy
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative bg-muted">
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Loading through proxy...</p>
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
                    <p className="text-sm font-medium">Possible reasons:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>The website blocks proxy connections</li>
                      <li>The URL is incorrect or unreachable</li>
                      <li>Your session has expired</li>
                      <li>Content Security Policy restrictions</li>
                    </ul>
                  </div>
                  
                  {/* Special note for adult content sites */}
                  {(currentUrl.includes('xhamster') || currentUrl.includes('pornhub') || currentUrl.includes('xvideos')) && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>Note:</strong> Adult content websites often have strict security policies that prevent them from working through proxies. This is a limitation of the website, not the proxy service.
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button onClick={handleRefresh} size="sm">
                      Try Again
                    </Button>
                    <Button onClick={handleOpenOriginal} variant="outline" size="sm">
                      Open Original Site
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Proxy Iframe */}
          {!error && (
            <iframe
              key={iframeKey}
              src={getProxyUrl(currentUrl)}
              className="w-full h-full border-0"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-presentation allow-top-navigation-by-user-activation"
              allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; payment"
              title={`Proxy view of ${currentUrl}`}
            />
          )}
        </div>

        {/* Footer Status Bar */}
        <div className="border-t bg-background/95 backdrop-blur p-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Target: {currentUrl}</span>
              <span>•</span>
              <span>Status: {isLoading ? 'Loading...' : error ? 'Error' : 'Connected'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : isLoading ? 'bg-yellow-500' : 'bg-green-500'}`} />
              <span>Proxy Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DirectProxyViewer 