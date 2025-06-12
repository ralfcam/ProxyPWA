import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Moon, Sun, Bell, Shield, Globe, Save } from 'lucide-react'
import Button from '../ui/Button'
import { toast } from 'react-hot-toast'
import { useTheme } from '../../hooks/useTheme'

interface SettingsState {
  theme: 'light' | 'dark' | 'system'
  notifications: {
    sessionStart: boolean
    sessionEnd: boolean
    lowBalance: boolean
  }
  security: {
    autoTerminate: boolean
    terminateMinutes: number
  }
  proxy: {
    preferredMode: 'direct' | 'external'
    autoReconnect: boolean
  }
}

const Settings = () => {
  const { theme, setTheme } = useTheme()
  const [settings, setSettings] = useState<SettingsState>({
    theme: theme as 'light' | 'dark' | 'system',
    notifications: {
      sessionStart: true,
      sessionEnd: true,
      lowBalance: true
    },
    security: {
      autoTerminate: true,
      terminateMinutes: 10
    },
    proxy: {
      preferredMode: 'direct',
      autoReconnect: false
    }
  })
  const [hasChanges, setHasChanges] = useState(false)

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('vpn-pwa-settings')
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      setSettings(parsed)
    }
  }, [])

  const updateSettings = (updates: Partial<SettingsState>) => {
    setSettings(prev => ({ ...prev, ...updates }))
    setHasChanges(true)
  }

  const saveSettings = () => {
    localStorage.setItem('vpn-pwa-settings', JSON.stringify(settings))
    setTheme(settings.theme)
    setHasChanges(false)
    toast.success('Settings saved successfully!')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className="text-muted-foreground">Manage your preferences and app configuration</p>
        </div>
        {hasChanges && (
          <Button onClick={saveSettings} size="sm">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        )}
      </div>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>Customize how the app looks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Theme</label>
            <div className="grid grid-cols-3 gap-2">
              {(['light', 'dark', 'system'] as const).map((themeOption) => (
                <button
                  key={themeOption}
                  onClick={() => updateSettings({ theme: themeOption })}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    settings.theme === themeOption
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    {themeOption === 'light' && <Sun className="h-5 w-5" />}
                    {themeOption === 'dark' && <Moon className="h-5 w-5" />}
                    {themeOption === 'system' && (
                      <div className="flex">
                        <Sun className="h-5 w-5 -mr-1" />
                        <Moon className="h-5 w-5 -ml-1" />
                      </div>
                    )}
                    <span className="text-sm capitalize">{themeOption}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Control when you receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium">Session Started</p>
                <p className="text-sm text-muted-foreground">Notify when a proxy session starts</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.sessionStart}
                onChange={(e) => updateSettings({
                  notifications: { ...settings.notifications, sessionStart: e.target.checked }
                })}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium">Session Ended</p>
                <p className="text-sm text-muted-foreground">Notify when a proxy session ends</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.sessionEnd}
                onChange={(e) => updateSettings({
                  notifications: { ...settings.notifications, sessionEnd: e.target.checked }
                })}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium">Low Balance</p>
                <p className="text-sm text-muted-foreground">Notify when balance is running low</p>
              </div>
              <input
                type="checkbox"
                checked={settings.notifications.lowBalance}
                onChange={(e) => updateSettings({
                  notifications: { ...settings.notifications, lowBalance: e.target.checked }
                })}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>Manage security preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium">Auto-terminate Inactive Sessions</p>
                <p className="text-sm text-muted-foreground">Automatically end sessions after inactivity</p>
              </div>
              <input
                type="checkbox"
                checked={settings.security.autoTerminate}
                onChange={(e) => updateSettings({
                  security: { ...settings.security, autoTerminate: e.target.checked }
                })}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
            </label>

            {settings.security.autoTerminate && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Inactivity Timeout (minutes)
                </label>
                <select
                  value={settings.security.terminateMinutes}
                  onChange={(e) => updateSettings({
                    security: { ...settings.security, terminateMinutes: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Proxy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Proxy Preferences
          </CardTitle>
          <CardDescription>Configure proxy behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Preferred Proxy Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updateSettings({
                  proxy: { ...settings.proxy, preferredMode: 'direct' }
                })}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  settings.proxy.preferredMode === 'direct'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <p className="font-medium">Direct Proxy</p>
                <p className="text-sm text-muted-foreground">Supabase Edge Functions</p>
              </button>
              
              <button
                onClick={() => updateSettings({
                  proxy: { ...settings.proxy, preferredMode: 'external' }
                })}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  settings.proxy.preferredMode === 'external'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <p className="font-medium">External Proxy</p>
                <p className="text-sm text-muted-foreground">Third-party services</p>
              </button>
            </div>
          </div>

          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-medium">Auto-reconnect</p>
              <p className="text-sm text-muted-foreground">Automatically reconnect dropped sessions</p>
            </div>
            <input
              type="checkbox"
              checked={settings.proxy.autoReconnect}
              onChange={(e) => updateSettings({
                proxy: { ...settings.proxy, autoReconnect: e.target.checked }
              })}
              className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
          </label>
        </CardContent>
      </Card>
    </div>
  )
}

export default Settings 