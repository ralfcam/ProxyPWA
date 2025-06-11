import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { User, CreditCard } from 'lucide-react'

const Account = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Account</h2>
        <p className="text-muted-foreground">Manage your profile and billing information</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Your account details and preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Profile management coming soon...
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Billing & Subscription
            </CardTitle>
            <CardDescription>Manage your subscription and payment methods</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Billing management coming soon...
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Account 