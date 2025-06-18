import React from 'react'
import { ArrowLeft, ArrowRight, RefreshCw, Home, Globe } from 'lucide-react'
import Button from '../../ui/Button'

interface ProxyNavigationBarProps {
  currentUrl: string
  canGoBack: boolean
  canGoForward: boolean
  isLoading: boolean
  urlInputRef: React.RefObject<HTMLInputElement>
  onGoBack: () => void
  onGoForward: () => void
  onRefresh: () => void
  onGoHome: () => void
  onNavigate: (e: React.FormEvent) => void
}

export const ProxyNavigationBar: React.FC<ProxyNavigationBarProps> = ({
  currentUrl,
  canGoBack,
  canGoForward,
  isLoading,
  urlInputRef,
  onGoBack,
  onGoForward,
  onRefresh,
  onGoHome,
  onNavigate
}) => {
  return (
    <div className="flex items-center gap-2 p-3">
      {/* Navigation Buttons */}
      <div className="flex items-center gap-1">
        <Button
          onClick={onGoBack}
          variant="ghost"
          size="sm"
          disabled={!canGoBack}
          className="px-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        
        <Button
          onClick={onGoForward}
          variant="ghost"
          size="sm"
          disabled={!canGoForward}
          className="px-2"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
        
        <Button
          onClick={onRefresh}
          variant="ghost"
          size="sm"
          disabled={isLoading}
          className="px-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
        
        <Button
          onClick={onGoHome}
          variant="ghost"
          size="sm"
          className="px-2"
        >
          <Home className="h-4 w-4" />
        </Button>
      </div>

      {/* URL Bar */}
      <form onSubmit={onNavigate} className="flex-1 flex items-center gap-2">
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
  )
} 