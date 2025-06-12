import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { User, CreditCard, Mail, Phone, MapPin, Calendar, Clock, Zap } from 'lucide-react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { useAuth } from '../../hooks/useAuth'
import { useUserProfile } from '../../hooks/useUserProfile'
import { toast } from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { formatTime } from '../../lib/utils'

interface ProfileData {
  displayName: string
  email: string
  phone: string
  location: string
}

const Account = () => {
  const { user } = useAuth()
  const { profile, refreshProfile } = useUserProfile()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [profileData, setProfileData] = useState<ProfileData>({
    displayName: profile?.display_name || '',
    email: user?.email || '',
    phone: profile?.phone || '',
    location: profile?.location || ''
  })

  const handleUpdateProfile = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          display_name: profileData.displayName,
          phone: profileData.phone,
          location: profileData.location,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user!.id)

      if (error) throw error

      toast.success('Profile updated successfully!')
      setIsEditing(false)
      refreshProfile()
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Account</h2>
        <p className="text-muted-foreground">Manage your profile and billing information</p>
      </div>

      <div className="grid gap-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>Your account details and preferences</CardDescription>
              </div>
              {!isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  size="sm"
                >
                  Edit Profile
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Display Name</label>
                  <Input
                    value={profileData.displayName}
                    onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                    placeholder="Enter your name"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Email</label>
                  <Input
                    value={profileData.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Phone</label>
                  <Input
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Location</label>
                  <Input
                    value={profileData.location}
                    onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                    placeholder="City, Country"
                  />
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleUpdateProfile}
                    loading={loading}
                    disabled={loading}
                  >
                    Save Changes
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditing(false)
                      setProfileData({
                        displayName: profile?.display_name || '',
                        email: user?.email || '',
                        phone: profile?.phone || '',
                        location: profile?.location || ''
                      })
                    }}
                    variant="outline"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{profile?.display_name || 'Not set'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{user?.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{profile?.phone || 'Not set'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{profile?.location || 'Not set'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Member Since</p>
                    <p className="font-medium">{formatDate(profile?.created_at || null)}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Billing & Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Billing & Subscription
            </CardTitle>
            <CardDescription>Manage your subscription and payment methods</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Current Balance */}
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold">Current Balance</h4>
                  </div>
                  <span className="text-2xl font-bold text-primary">
                    {profile ? formatTime(profile.time_balance_minutes) : '...'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Time remaining for proxy sessions
                </p>
              </div>

              {/* Subscription Status */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Subscription Status</span>
                  <span className="font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4 text-green-500" />
                    Active
                  </span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Plan Type</span>
                  <span className="font-medium">Pay As You Go</span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Last Top-up</span>
                  <span className="font-medium">{formatDate(profile?.last_topup_at || null)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button className="flex-1">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Add Time Balance
                </Button>
                <Button variant="outline" className="flex-1">
                  View Billing History
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions for your account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Delete Account</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <Button variant="destructive" size="sm">
                  Delete Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Account 