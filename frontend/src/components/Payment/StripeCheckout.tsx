// frontend/src/components/Payment/StripeCheckout.tsx
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { supabase } from '../../lib/supabase'

const stripePromise = loadStripe('pk_test_your_publishable_key')

export const StripeCheckout = ({ amount, timePackage }: { amount: number, timePackage: string }) => {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm amount={amount} timePackage={timePackage} />
    </Elements>
  )
}

const CheckoutForm = ({ amount, timePackage }: { amount: number, timePackage: string }) => {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)

    // Create payment intent via Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: { amount, timePackage }
    })

    if (error) {
      console.error('Payment failed:', error)
      setLoading(false)
      return
    }

    // Confirm payment with Stripe
    const result = await stripe.confirmCardPayment(data.clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement)!,
      }
    })

    if (result.error) {
      console.error('Payment failed:', result.error.message)
    } else {
      console.log('Payment succeeded!')
      // Time will be automatically added via webhook
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button disabled={!stripe || loading}>
        {loading ? 'Processing...' : `Pay $${amount/100}`}
      </button>
    </form>
  )
}