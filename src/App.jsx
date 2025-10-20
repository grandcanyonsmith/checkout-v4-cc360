import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { Toaster } from 'react-hot-toast'
import { inject } from '@vercel/analytics'

import Header from './components/Header'
import CheckoutForm from './components/CheckoutForm'
import OrderSummary from './components/OrderSummary'
import ErrorBoundary from './components/ErrorBoundary'

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

// Inject Vercel Analytics
inject()

// Course Creator 360 Pricing Configuration
const CC360_PRICING = {
  monthly: {
    priceId: 'price_1Ozb24BnnqL8bKFQEbEdsZqn', // $147/month
    amount: 14700, // $147.00 in cents
    currency: 'usd',
    interval: 'month',
    intervalCount: 1,
    trialPeriodDays: 30,
    displayPrice: '$147',
    displayInterval: 'month',
    title: 'Course Creator 360 Premium',
    description: 'Then $147/month',
    features: [
      'Complete course creation toolkit',
      'Advanced marketing automation', 
      'Student analytics & insights',
      'Custom branding & domains',
      'Priority support & coaching',
      'Unlimited courses & students'
    ],
    savings: null,
    badge: 'Most Popular'
  }
}

function App() {
  const [subscriptionType, setSubscriptionType] = useState('monthly')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Always use monthly for Course Creator 360 flow
  const currentPricing = CC360_PRICING.monthly

  const stripeElementsOptions = {
    mode: 'setup',
    currency: 'usd',
    payment_method_types: ['card'],
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#0475FF',
        colorBackground: '#ffffff',
        colorText: '#111D2C',
        colorDanger: '#FF2F00',
        fontFamily: 'Helvetica Neue, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px'
      },
      rules: {
        '.Input': {
          padding: '12px',
          fontSize: '16px',
          color: '#111D2C'
        },
        '.Input:focus': {
          borderColor: '#0475FF',
          boxShadow: '0 0 0 2px rgba(4, 117, 255, 0.1)'
        }
      }
    },
    loader: 'auto'
  }

  return (
    <ErrorBoundary>
      <Elements stripe={stripePromise} options={stripeElementsOptions}>
        <div className="min-h-screen" style={{ backgroundColor: '#e9f4ff' }}>
          <Toaster 
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1f2937',
                color: '#f9fafb',
                fontSize: '14px',
                fontWeight: '500'
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#f9fafb'
                }
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#f9fafb'
                }
              }
            }}
          />
          
          <Header />
          
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl pb-12">
              {/* Main Content */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8">
                {/* Checkout Form */}
                <div className="lg:col-span-7">
                  <CheckoutForm 
                    pricing={currentPricing}
                    subscriptionType={subscriptionType}
                    isSubmitting={isSubmitting}
                    setIsSubmitting={setIsSubmitting}
                  />
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-5">
                  <OrderSummary 
                    pricing={currentPricing}
                    subscriptionType={subscriptionType}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Elements>
    </ErrorBoundary>
  )
}

export default App 