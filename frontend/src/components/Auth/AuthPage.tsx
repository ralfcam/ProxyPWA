import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'
import { Shield, Zap, Lock, Globe } from 'lucide-react'

const AuthPage = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50 p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Hero Section */}
        <div className="space-y-8 text-center lg:text-left order-2 lg:order-1">
          <div className="space-y-4">
            <div className="flex items-center justify-center lg:justify-start gap-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">VPN PWA</h1>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-foreground">
              Secure Cloud Proxy
            </h2>
            <p className="text-xl text-muted-foreground max-w-lg">
              Anonymous browsing made simple. Access any website securely through our cloud proxy infrastructure.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8">
            <div className="space-y-2 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Lightning Fast</h3>
              <p className="text-sm text-muted-foreground">
                High-speed proxy servers worldwide
              </p>
            </div>
            
            <div className="space-y-2 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Secure</h3>
              <p className="text-sm text-muted-foreground">
                End-to-end encrypted connections
              </p>
            </div>
            
            <div className="space-y-2 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Global</h3>
              <p className="text-sm text-muted-foreground">
                Access from anywhere in the world
              </p>
            </div>
          </div>
        </div>

        {/* Auth Form */}
        <div className="order-1 lg:order-2">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center">
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </CardTitle>
              <CardDescription className="text-center">
                {mode === 'login' 
                  ? 'Sign in to your account to continue' 
                  : 'Enter your details to create your account'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mode === 'login' ? (
                <LoginForm onSwitchToRegister={() => setMode('register')} />
              ) : (
                <RegisterForm onSwitchToLogin={() => setMode('login')} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default AuthPage 