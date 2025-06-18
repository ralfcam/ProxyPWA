export interface ProxySession {
  id: string
  target_domain: string
  session_url: string
  status: 'active' | 'expired' | 'terminated' | 'error'
  started_at: string
  bytes_transferred: number
  requests_count: number
}

export interface ProxyViewerProps {
  targetDomain: string
  sessionId: string
  mode: 'direct' | 'external'
  onClose: () => void
  onNavigate?: (url: string) => void
}

export interface ProxyComponentConfig {
  src: string
  sessionId?: string
  mode: 'iframe' | 'ssr'
  cspLevel: 'permissive' | 'balanced' | 'strict'
  fallbackEnabled: boolean
}

export interface ResourceOptimizations {
  crossOriginBlocked: number
  preloadsOptimized: number
  scriptsDisabled: number
}

export interface PreloadMetrics {
  warningsCount: number
  optimizedResources: number
}

export type RenderMode = 'iframe' | 'ssr' | 'auto'
export type SecurityLevel = 'permissive' | 'balanced' | 'strict' 