import { useState } from 'react'
import { ArrowLeft, RefreshCw, ExternalLink } from 'lucide-react'
import Button from '../ui/Button'

interface ProxyViewerProps {
  sessionUrl: string
  targetDomain: string
  onClose: () => void
}

const ProxyViewer = ({ sessionUrl, targetDomain, onClose }: ProxyViewerProps) => {
  const [iframeUrl, setIframeUrl] = useState(sessionUrl)
  const [isLoading, setIsLoading] = useState(true)

  const handleRefresh = () => {
    setIsLoading(true)
    // Force iframe refresh by updating key
    setIframeUrl(sessionUrl + '&t=' + Date.now())
  }

  const handleOpenExternal = () => {
    window.open(sessionUrl, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleRefresh}
                  variant="ghost"
                  size="sm"
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
                
                <div className="px-3 py-1 bg-muted rounded-md text-sm">
                  {targetDomain}
                </div>
              </div>
            </div>
            
            <Button
              onClick={handleOpenExternal}
              variant="outline"
              size="sm"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        </div>

        {/* Iframe Container */}
        <div className="flex-1 relative bg-muted">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Loading proxy session...</p>
              </div>
            </div>
          )}
          
          <iframe
            src={iframeUrl}
            className="w-full h-full border-0"
            onLoad={() => setIsLoading(false)}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-presentation allow-top-navigation-by-user-activation allow-pointer-lock allow-orientation-lock"
            allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; payment; autoplay; fullscreen; picture-in-picture; xr-spatial-tracking"
            referrerPolicy="no-referrer-when-downgrade"
            title={`Proxy session for ${targetDomain}`}
          />
        </div>
      </div>
    </div>
  )
}

export default ProxyViewer 