import React, { useEffect, useRef, useCallback, useState } from 'react'

// Import the Web Component
import './ProxyViewerWebComponent'

interface ProxyViewerWrapperProps {
  targetUrl: string
  sessionId?: string
  mode?: 'iframe' | 'ssr' | 'auto'
  cspLevel?: 'permissive' | 'balanced' | 'strict'
  fallbackEnabled?: boolean
  onNavigate?: (url: string) => void
  onLoad?: (event: { mode: string; url: string }) => void
  onError?: (error: Error) => void
  className?: string
  style?: React.CSSProperties
}

const ProxyViewerWrapper = React.forwardRef<HTMLElement, ProxyViewerWrapperProps>(({
  targetUrl,
  sessionId,
  mode = 'auto',
  cspLevel = 'balanced',
  fallbackEnabled = true,
  onNavigate,
  onLoad,
  onError,
  className,
  style
}, ref) => {
  const elementRef = useRef<HTMLElement>(null)
  const [isWebComponentSupported, setIsWebComponentSupported] = useState(true)
  const [currentMode, setCurrentMode] = useState<'ssr' | 'iframe'>('ssr')

  // Get the Supabase project URL from environment
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const isLocalDev = supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')
  const proxyBaseUrl = isLocalDev 
    ? 'http://localhost:54321/functions/v1/proxy-service'
    : `${supabaseUrl}/functions/v1/proxy-service`

  // Check Web Component support
  useEffect(() => {
    const supported = 'customElements' in window && 'attachShadow' in Element.prototype
    setIsWebComponentSupported(supported)
    
    if (!supported && mode !== 'iframe') {
      console.warn('Web Components not supported, falling back to iframe mode')
      setCurrentMode('iframe')
    }
  }, [mode])

  // Determine effective mode
  useEffect(() => {
    if (mode === 'auto') {
      setCurrentMode(isWebComponentSupported ? 'ssr' : 'iframe')
    } else if (mode === 'ssr' && !isWebComponentSupported) {
      setCurrentMode('iframe')
    } else {
      setCurrentMode(mode as 'iframe' | 'ssr')
    }
  }, [mode, isWebComponentSupported])

  // Event handlers
  const handleNavigate = useCallback((event: Event) => {
    const customEvent = event as CustomEvent
    onNavigate?.(customEvent.detail.url)
  }, [onNavigate])

  const handleLoad = useCallback((event: Event) => {
    const customEvent = event as CustomEvent
    onLoad?.(customEvent.detail)
  }, [onLoad])

  const handleError = useCallback((event: Event) => {
    const customEvent = event as CustomEvent
    onError?.(new Error(customEvent.detail.message || 'Unknown error'))
  }, [onError])

  // Set up event listeners
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    element.addEventListener('proxy-navigate', handleNavigate)
    element.addEventListener('proxy-load', handleLoad)
    element.addEventListener('proxy-error', handleError)

    return () => {
      element.removeEventListener('proxy-navigate', handleNavigate)
      element.removeEventListener('proxy-load', handleLoad)
      element.removeEventListener('proxy-error', handleError)
    }
  }, [handleNavigate, handleLoad, handleError])

  // Update element attributes when props change
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    element.setAttribute('src', targetUrl)
    if (sessionId) {
      element.setAttribute('session-id', sessionId)
    }
    element.setAttribute('mode', currentMode)
    element.setAttribute('csp-level', cspLevel)
    element.setAttribute('fallback-enabled', fallbackEnabled.toString())
    element.setAttribute('proxy-base-url', proxyBaseUrl)
  }, [targetUrl, sessionId, currentMode, cspLevel, fallbackEnabled, proxyBaseUrl])

  // Fallback iframe implementation for unsupported browsers
  if (!isWebComponentSupported && currentMode === 'iframe') {
    const iframeUrl = sessionId 
      ? `${proxyBaseUrl}/${sessionId}/${encodeURIComponent(targetUrl)}`
      : `${proxyBaseUrl}?url=${encodeURIComponent(targetUrl)}`

    return (
      <div className={className} style={style}>
        <iframe
          src={iframeUrl}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
          onLoad={() => onLoad?.({ mode: 'iframe', url: targetUrl })}
          onError={() => onError?.(new Error('Failed to load iframe content'))}
          title={`Proxy viewer for ${targetUrl}`}
        />
      </div>
    )
  }

  // Merge refs
  React.useImperativeHandle(ref, () => elementRef.current as any)

  return (
    <proxy-viewer
      ref={elementRef}
      src={targetUrl}
      session-id={sessionId}
      mode={currentMode}
      csp-level={cspLevel}
      fallback-enabled={fallbackEnabled.toString()}
      proxy-base-url={proxyBaseUrl}
      className={className}
      style={style}
    />
  )
})

ProxyViewerWrapper.displayName = 'ProxyViewerWrapper'

export default ProxyViewerWrapper 