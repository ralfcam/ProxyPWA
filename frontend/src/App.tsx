import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './hooks/useAuth'
import AuthPage from './components/Auth/AuthPage'
import Dashboard from './components/Dashboard/Dashboard'
import LoadingSpinner from './components/ui/LoadingSpinner'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route 
            path="/auth" 
            element={!user ? <AuthPage /> : <Navigate to="/dashboard" replace />} 
          />
          <Route 
            path="/dashboard/*" 
            element={user ? <Dashboard /> : <Navigate to="/auth" replace />} 
          />
          <Route 
            path="/" 
            element={<Navigate to={user ? "/dashboard" : "/auth"} replace />} 
          />
          <Route 
            path="*" 
            element={<Navigate to={user ? "/dashboard" : "/auth"} replace />} 
          />
        </Routes>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'hsl(var(--card))',
              color: 'hsl(var(--card-foreground))',
              border: '1px solid hsl(var(--border))',
            },
          }}
        />
      </div>
    </Router>
  )
}

export default App