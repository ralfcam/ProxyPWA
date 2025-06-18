import React from 'react'
import { ArrowLeft, ExternalLink, Globe } from 'lucide-react'
import Button from '../../ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card'

interface ExternalProxyModeProps {
  currentUrl: string
  onClose: () => void
  onOpenOriginal: () => void
}

const externalProxies = [
  { name: 'Hide.me', url: 'https://hide.me/en/proxy' },
  { name: 'ProxySite', url: 'https://www.proxysite.com/' },
  { name: 'CroxyProxy', url: 'https://www.croxyproxy.com/' },
  { name: 'KProxy', url: 'https://kproxy.com/' }
]

export const ExternalProxyMode: React.FC<ExternalProxyModeProps> = ({
  currentUrl,
  onClose,
  onOpenOriginal
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="flex flex-col h-full">
        <div className="border-b bg-background/95 backdrop-blur p-4">
          <div className="flex items-center justify-between">
            <Button onClick={onClose} variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <Button onClick={onOpenOriginal} variant="outline" size="sm">
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