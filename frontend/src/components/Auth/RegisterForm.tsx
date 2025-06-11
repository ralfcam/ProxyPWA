import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import Button from '../ui/Button'
import Input from '../ui/Input'

interface RegisterFormProps {
  onSwitchToLogin: () => void
}

const RegisterForm = ({ onSwitchToLogin }: RegisterFormProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ 
    email?: string
    password?: string
    confirmPassword?: string
    fullName?: string
  }>({})
  
  const { register } = useAuth()

  const validateForm = () => {
    const newErrors: { 
      email?: string
      password?: string
      confirmPassword?: string
      fullName?: string
    } = {}
    
    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    }
    
    if (!email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid'
    }
    
    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(true)
    try {
      const { error } = await register(email, password, fullName)
      
      if (error) {
        toast.error(error.message || 'Registration failed')
      } else {
        toast.success('Account created! Please check your email to verify your account.')
        onSwitchToLogin()
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <Input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
          disabled={loading}
        />
        
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          disabled={loading}
        />
        
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          disabled={loading}
        />
        
        <Input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
          disabled={loading}
        />
      </div>
      
      <Button 
        type="submit" 
        className="w-full" 
        loading={loading}
        disabled={loading}
      >
        Create Account
      </Button>
      
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-primary hover:underline font-medium"
          >
            Sign in
          </button>
        </p>
      </div>
    </form>
  )
}

export default RegisterForm