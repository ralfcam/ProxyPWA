import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Settings as SettingsIcon } from 'lucide-react'

const Settings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground">Manage your preferences and app configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            App Settings
          </CardTitle>
          <CardDescription>Configure your VPN PWA experience</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Settings panel coming soon...
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Settings 