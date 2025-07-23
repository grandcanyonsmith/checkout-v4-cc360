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
    description: '30-Day Free Trial, then $147/month',
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
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#2563eb',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#dc2626',
        fontFamily: 'Inter, system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px'
      },
      rules: {
        '.Input': {
          padding: '12px',
          fontSize: '16px'
        },
        '.Input:focus': {
          borderColor: '#2563eb',
          boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.1)'
        }
      }
    },
    loader: 'auto'
  }

  return (
    <ErrorBoundary>
      <Elements stripe={stripePromise} options={stripeElementsOptions}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            <div className="max-w-6xl mx-auto">
              {/* Hero Section */}
              <div className="text-center py-8 lg:py-12">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                  Transform Your Knowledge Into
                  <span className="block text-primary-600">Profitable Online Courses</span>
                </h1>
                <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-6">
                  Join thousands of successful course creators using Course Creator 360's complete toolkit to launch, market, and scale their online education business.
                </p>
                <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center">
                    ✅ No setup fees
                  </span>
                  <span className="flex items-center">
                    ✅ 30-day free trial
                  </span>
                  <span className="flex items-center">
                    ✅ Cancel anytime
                  </span>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                {/* Order Summary - Mobile: Top, Desktop: Right */}
                <div className="order-1 lg:order-2 lg:col-span-5">
                  <OrderSummary 
                    pricing={currentPricing}
                    subscriptionType={subscriptionType}
                  />
                </div>

                {/* Checkout Form - Mobile: Bottom, Desktop: Left */}
                <div className="order-2 lg:order-1 lg:col-span-7">
                  <CheckoutForm 
                    pricing={currentPricing}
                    subscriptionType={subscriptionType}
                    isSubmitting={isSubmitting}
                    setIsSubmitting={setIsSubmitting}
                  />
                </div>
              </div>

              {/* Trust Indicators */}
              <div className="mt-16 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Trusted by 10,000+ Course Creators Worldwide
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center opacity-60">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600">10K+</div>
                    <div className="text-sm text-gray-600">Active Creators</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600">$50M+</div>
                    <div className="text-sm text-gray-600">Revenue Generated</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600">500K+</div>
                    <div className="text-sm text-gray-600">Students Enrolled</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600">99.8%</div>
                    <div className="text-sm text-gray-600">Uptime</div>
                  </div>
                </div>
              </div>

              {/* Testimonials */}
              <div className="mt-16">
                <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
                  What Our Creators Say
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    {
                      name: "Sarah Johnson",
                      role: "Digital Marketing Expert",
                      content: "Course Creator 360 helped me launch my first course and make $100k in the first year. The platform is incredibly intuitive!",
                      rating: 5
                    },
                    {
                      name: "Mike Chen",
                      role: "Fitness Coach", 
                      content: "The marketing automation features are game-changing. I've grown from 0 to 5,000 students in just 6 months.",
                      rating: 5
                    },
                    {
                      name: "Emily Rodriguez",
                      role: "Business Consultant",
                      content: "Best investment I've made for my online business. The support team is amazing and the features just keep getting better.",
                      rating: 5
                    }
                  ].map((testimonial, index) => (
                    <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex items-center mb-4">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <span key={i} className="text-yellow-400">⭐</span>
                        ))}
                      </div>
                      <p className="text-gray-600 mb-4 italic">"{testimonial.content}"</p>
                      <div>
                        <div className="font-semibold text-gray-900">{testimonial.name}</div>
                        <div className="text-sm text-gray-500">{testimonial.role}</div>
                      </div>
                    </div>
                  ))}
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