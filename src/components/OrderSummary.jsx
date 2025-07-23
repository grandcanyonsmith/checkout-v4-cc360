import { useState } from 'react'
import { ChevronDownIcon, ChevronUpIcon, CheckIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { cn } from '../utils/cn'

export default function OrderSummary({ pricing, subscriptionType }) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!pricing) {
    return (
      <div className="card animate-pulse">
        <div className="card-body">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100)
  }

  const trialEndDate = new Date()
  trialEndDate.setDate(trialEndDate.getDate() + 30)

  return (
    <div className="card sticky top-8 animate-fade-in">
      <div className="card-body space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <SparklesIcon className="h-6 w-6 text-primary-600 mr-2" />
            <h3 className="text-xl font-bold text-gray-900">
              {pricing.title}
            </h3>
          </div>
          {pricing.badge && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
              {pricing.badge}
            </span>
          )}
        </div>

        {/* Trial Information */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-800 mb-1">
              30-Day Free Trial
            </div>
            <p className="text-sm text-green-700 mb-2">
              Start today, no payment required
            </p>
            <p className="text-xs text-green-600">
              Trial ends {trialEndDate.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </p>
          </div>
        </div>

        {/* Pricing Details */}
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-gray-200">
            <span className="text-gray-600">Trial Period</span>
            <span className="font-semibold text-gray-900">Free for 30 days</span>
          </div>
          
          <div className="flex justify-between items-center py-3 border-b border-gray-200">
            <span className="text-gray-600">After Trial</span>
            <span className="font-semibold text-gray-900">
              {formatPrice(pricing.amount)}/{pricing.displayInterval}
            </span>
          </div>

          <div className="flex justify-between items-center py-3 border-b border-gray-200">
            <span className="text-gray-600">Setup Fee</span>
            <span className="font-semibold text-green-600">$0.00</span>
          </div>

          <div className="flex justify-between items-center py-3 text-lg font-bold">
            <span className="text-gray-900">Today's Total</span>
            <span className="text-green-600">FREE</span>
          </div>
        </div>

        {/* Features Toggle for Mobile */}
        <div className="lg:hidden">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between py-3 text-left"
          >
            <span className="font-semibold text-gray-900">What's Included</span>
            {isExpanded ? (
              <ChevronUpIcon className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-gray-500" />
            )}
          </button>
        </div>

        {/* Features List */}
        <div className={cn(
          "space-y-3",
          "lg:block", // Always show on desktop
          !isExpanded && "hidden lg:block" // Hide on mobile when collapsed
        )}>
          <h4 className="font-semibold text-gray-900 hidden lg:block">What's Included:</h4>
          <ul className="space-y-3">
            {pricing.features.map((feature, index) => (
              <li key={index} className="flex items-start space-x-3">
                <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Money Back Guarantee */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-center">
            <div className="text-sm font-semibold text-blue-800 mb-1">
              💰 Risk-Free Guarantee
            </div>
            <p className="text-xs text-blue-700">
              Cancel anytime during your trial. No questions asked.
            </p>
          </div>
        </div>

        {/* Support Notice */}
        <div className="text-center text-xs text-gray-500 space-y-1">
          <p>🔒 Secure checkout powered by Stripe</p>
          <p>📧 Questions? Email support@coursecreator360.com</p>
          <p>📞 Call us: 1-800-CC360-HELP</p>
        </div>
      </div>
    </div>
  )
} 