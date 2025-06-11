import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useUserProfile } from '../../hooks/useUserProfile'
import { 
  Shield, 
  Activity, 
  Settings, 
  User, 
  LogOut, 
  Menu, 
  X,
  Zap,
  Clock,
  Wifi
} from 'lucide-react'
import Button from '../ui/Button'
import { cn, formatTime } from '../../lib/utils'

interface DashboardLayoutProps {
  children: React.ReactNode
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()
  const { profile } = useUserProfile()
  const location = useLocation()

  const navigation = [
    { name: 'Proxy Control', href: '/dashboard/proxy', icon: Wifi, current: location.pathname.includes('/proxy') },
    { name: 'Statistics', href: '/dashboard/statistics', icon: Activity, current: location.pathname.includes('/statistics') },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings, current: location.pathname.includes('/settings') },
    { name: 'Account', href: '/dashboard/account', icon: User, current: location.pathname.includes('/account') },
  ]

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar */}
      <div className={cn(
        "fixed inset-0 z-50 lg:hidden",
        sidebarOpen ? "block" : "hidden"
      )}>
        <div className="fixed inset-0 bg-black/20" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-background border-r">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-semibold">VPN PWA</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <nav className="p-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  item.current
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:block">
        <div className="sidebar h-full">
          <div className="flex items-center gap-2 p-6 border-b">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">VPN PWA</span>
          </div>
          
          <nav className="p-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  item.current
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            ))}
          </nav>
          
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse-green" />
                <span className="text-muted-foreground">Connected</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="navbar sticky top-0 z-40 px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <h1 className="text-lg font-semibold">
                {navigation.find(item => item.current)?.name || 'Dashboard'}
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Balance:</span>
                  <span className={cn(
                    "font-medium",
                    profile?.time_balance_minutes === 0 ? "text-red-600" : 
                    profile?.time_balance_minutes && profile.time_balance_minutes < 10 ? "text-amber-600" : 
                    "text-green-600"
                  )}>
                    {profile ? formatTime(profile.time_balance_minutes) : '...'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Status:</span>
                  <span className={cn(
                    "font-medium",
                    profile?.time_balance_minutes === 0 ? "text-red-600" : "text-green-600"
                  )}>
                    {profile?.time_balance_minutes === 0 ? 'No Balance' : 'Ready'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <span className="hidden sm:block text-sm font-medium">
                  {user?.email}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout 