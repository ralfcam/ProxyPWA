import { useState, useEffect } from 'react'
import { ArrowLeft, ExternalLink, AlertCircle, Globe, Shield, Copy, CheckCircle } from 'lucide-react'
import Button from '../ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card'
import { copyToClipboard } from '../../lib/utils'
import { toast } from 'react-hot-toast'

interface WebProxyViewerProps {
  targetDomain: string
  onClose: () => void
}

const WebProxyViewer = ({ targetDomain, onClose }: WebProxyViewerProps) => {
  const [currentUrl, setCurrentUrl] = useState('')
  const [copied, setCopied] = useState(false)
  
  const proxyServices = [
    {
      name: 'Hide.me Proxy',
      url: 'https://hide.me/en/proxy',
      description: 'Free web proxy with SSL support',
      color: 'bg-blue-500'
    },
    {
      name: 'ProxySite',
      url: 'https://www.proxysite.com/',
      description: 'Fast and reliable proxy service',
      color: 'bg-green-500'
    },
    {
      name: 'CroxyProxy',
      url: 'https://www.croxyproxy.com/',
      description: 'Advanced free web proxy',
      color: 'bg-purple-500'
    },
    {
      name: 'KProxy',
      url: 'https://kproxy.com/',
      description: 'Anonymous web proxy',
      color: 'bg-orange-500'
    }
  ]
  
  useEffect(() => {
    // Ensure the target has a protocol
    const url = targetDomain.startsWith('http') ? targetDomain : `https://${targetDomain}`
    setCurrentUrl(url)
  }, [targetDomain])

  const handleCopyUrl = async () => {
    const success = await copyToClipboard(currentUrl)
    if (success) {
      setCopied(true)
      toast.success('URL copied to clipboard!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const openWithProxy = (proxyUrl: string) => {
    window.open(proxyUrl, '_blank')
    // After opening, show instructions
    toast.success('Proxy opened in new tab. Paste your URL there!', {
      duration: 5000
    })
  }

  const openDirectly = () => {
    window.open(currentUrl, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="min-h-full p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          {/* Main Content */}
          <div className="space-y-6">
            {/* Target URL Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Target Website
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={currentUrl}
                    onChange={(e) => setCurrentUrl(e.target.value)}
                    className="flex-1 px-3 py-2 bg-muted rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Button
                    onClick={handleCopyUrl}
                    variant="outline"
                    size="sm"
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    onClick={openDirectly}
                    variant="outline"
                    size="sm"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  How to Use Web Proxy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Quick Instructions:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Click on one of the proxy services below</li>
                    <li>The proxy website will open in a new tab</li>
                    <li>Paste your target URL ({currentUrl}) in the proxy's URL field</li>
                    <li>Click the proxy's "Go" or "Browse" button</li>
                  </ol>
                </div>
                
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>
                    Note: Free proxy services have limitations. For better performance and security,
                    consider using a VPN service or deploying your own proxy server.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Proxy Services */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Available Proxy Services</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {proxyServices.map((service) => (
                  <Card 
                    key={service.name}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => openWithProxy(service.url)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-lg ${service.color} flex items-center justify-center`}>
                          <Globe className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{service.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {service.description}
                          </p>
                          <div className="flex items-center gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                openWithProxy(service.url)
                              }}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Open Proxy
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Alternative Options */}
            <Card>
              <CardHeader>
                <CardTitle>Alternative Options</CardTitle>
                <CardDescription>
                  For a better proxy experience, consider these alternatives
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-1">Deploy Your Own Proxy</h4>
                  <p className="text-sm text-muted-foreground">
                    Set up a dedicated proxy server using Squid, Nginx, or a cloud service
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-1">Use a VPN Service</h4>
                  <p className="text-sm text-muted-foreground">
                    VPN services provide better security and performance than web proxies
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-1">Browser Extensions</h4>
                  <p className="text-sm text-muted-foreground">
                    Install proxy extensions like FoxyProxy or Proxy SwitchyOmega
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WebProxyViewer 