import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { Toaster } from 'react-hot-toast'
import { inject } from '@vercel/analytics'
import { initializeAffiliateTracking } from './utils/affiliateTracking' 

import Header from './components/Header'
import CheckoutForm from './components/CheckoutForm'
import OrderSummary from './components/OrderSummary'
import ErrorBoundary from './components/ErrorBoundary'

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

// Inject Vercel Analytics
inject()

// Initialize affiliate tracking globally
initializeAffiliateTracking() 

// VERCEL FIX: Bypass Secret required for protected Preview deployments
// YOUR KEY: e3b0c44298fc1c149afbf4c8996fb924
const VERCEL_BYPASS_SECRET = 'e3b0c44298fc1c149afbf4c8996fb924';

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
    metadata: {
      funnel_step: 'checkout_v4_cc360',
      product_code: 'CC360-P-M'
    }
  }
}

function App() {
  const [subscriptionType, setSubscriptionType] = useState('monthly')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // FIX: States for Stripe setup
  const [clientSecret, setClientSecret] = useState(null)
  const [loadingError, setLoadingError] = useState(null)
  
  const currentPricing = CC360_PRICING.monthly
  
  // FIX: Fetch clientSecret on component mount
  useEffect(() => {
    // FIX: Use relative path (empty string) for Vercel production/preview deployments
    const API_BASE_URL = process.env.NODE_ENV === 'production' 
      ? '' 
      : 'http://localhost:3001'

    async function fetchSetupIntentSecret() {
      try {
        setLoadingError(null); 
        
        // Header to bypass Vercel Deployment Protection
        const bypassHeader = { 'x-vercel-protection-bypass': VERCEL_BYPASS_SECRET };
        
        // This calls your backend route to get the client secret
        const response = await fetch(`${API_BASE_URL}/api/billing/create-setup-intent-on-load`, { 
            method: 'POST', 
            headers: { 
                'Content-Type': 'application/json',
                ...bypassHeader // Adding the bypass header
            },
            body: JSON.stringify({ priceId: currentPricing.priceId }) 
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData.error || 'Server returned an error when fetching setup secret.';
          throw new Error(errorMsg);
        }

        const data = await response.json()
        
        if (data.clientSecret) {
          setClientSecret(data.clientSecret)
        } else {
          throw new Error('Server did not return a valid clientSecret.')
        }

      } catch (error) {
        console.error('Error fetching client secret:', error)
        setLoadingError(error.message || 'Failed to connect to billing server.')
      }
    }
    
    fetchSetupIntentSecret();
  }, []) 

  // Stripe Options configuration
  const stripeElementsOptions = {
    // FIX: Pass the fetched clientSecret
    clientSecret: clientSecret,
    // Original options for appearance/styling
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
  
  // FIX: Conditional Rendering: Display Error
  if (loadingError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6" style={{ backgroundColor: '#e9f4ff' }}>
          <div className="text-center p-8 bg-white rounded-xl shadow-2xl max-w-sm">
              <h2 className="text-xl font-bold text-red-600 mb-2">Checkout Error</h2>
              <p className="text-gray-600 mb-6 text-sm">We could not load billing information. Please refresh the page.</p>
              <p className="text-xs text-gray-500 mb-6">Technical Error: {loadingError}</p>
              <button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                  Refresh Page
              </button>
          </div>
      </div>
    )
  }
  
  // FIX: Conditional Rendering: Display Loading
  if (!clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" style={{ backgroundColor: '#e9f4ff' }}>
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-t-4 border-blue-600 border-opacity-25 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading secure checkout...</p>
        </div>
      </div>
    )
  }

  // Main application renders only when clientSecret is ready
  return (
    <ErrorBoundary>
      {/* FIX: Use options with clientSecret */}
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