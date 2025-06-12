import { useState } from 'react'
import Button from '../ui/Button'
import UnifiedProxyViewer from './UnifiedProxyViewer'
import EnhancedUnifiedProxyViewer from './EnhancedUnifiedProxyViewer'

// Example of how to integrate the enhanced proxy viewer with SSR mode
const ProxyViewerExample = () => {
  const [showProxy, setShowProxy] = useState(false)
  const [useEnhanced, setUseEnhanced] = useState(true)  // Default to enhanced version
  const [targetUrl] = useState('example.com')
  const [sessionId] = useState('demo-session-123')

  if (showProxy) {
    // Use enhanced viewer with experimental SSR
    if (useEnhanced) {
      return (
        <EnhancedUnifiedProxyViewer
          targetDomain={targetUrl}
          sessionId={sessionId}
          mode="direct"

          onClose={() => setShowProxy(false)}
          onNavigate={(url) => console.log('Navigated to:', url)}
        />
      )
    }

    // Use original viewer (legacy)
    return (
      <UnifiedProxyViewer
        targetDomain={targetUrl}
        sessionId={sessionId}
        mode="direct"
        onClose={() => setShowProxy(false)}
        onNavigate={(url) => console.log('Navigated to:', url)}
      />
    )
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Proxy Viewer Integration Example</h2>
      
      <div className="space-y-2">
        <p className="text-muted-foreground">
          Choose which version of the proxy viewer to use:
        </p>
        
        <div className="flex gap-4">
          <Button 
            onClick={() => {
              setUseEnhanced(false)
              setShowProxy(true)
            }}
            variant="outline"
          >
            Open Legacy Viewer (iframe only)
          </Button>
          
          <Button 
            onClick={() => {
              setUseEnhanced(true)
              setShowProxy(true)
            }}
            variant="primary"
          >
            Open Enhanced Viewer (with SSR)
          </Button>
        </div>
      </div>

      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Integration Notes:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>The enhanced viewer includes experimental SSR mode toggle in settings</li>
          <li>SSR mode provides better compatibility with sites that block iframes</li>
          <li>Fallback to iframe mode is automatic if SSR fails</li>
          <li>Use the enhanced viewer for gradual migration to the new architecture</li>
        </ul>
      </div>

      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="font-semibold mb-2">Quick Start:</h3>
        <pre className="text-xs overflow-x-auto">
{`// Replace existing UnifiedProxyViewer usage:
<UnifiedProxyViewer 
  targetDomain={domain}
  sessionId={sessionId}
  mode="direct"
  onClose={handleClose}
/>

// With enhanced version:
<EnhancedUnifiedProxyViewer 
  targetDomain={domain}
  sessionId={sessionId}
  mode="direct"
  experimentalSSR={true}
  onClose={handleClose}
/>`}
        </pre>
      </div>
    </div>
  )
}

export default ProxyViewerExample 