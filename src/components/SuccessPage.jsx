import { useEffect, useState } from 'react'
import { CheckCircleIcon, ArrowRightIcon } from '@heroicons/react/24/solid'
import { motion } from 'framer-motion'

export default function SuccessPage() {
  const [countdown, setCountdown] = useState(5)
  const [redirectUrl] = useState('https://link.coursecreator360.com/widget/bookings/cc360/onboarding')

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          window.location.href = redirectUrl
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [redirectUrl])

  const handleContinue = () => {
    window.location.href = redirectUrl
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-primary-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6"
        >
          <CheckCircleIcon className="w-10 h-10 text-green-600" />
        </motion.div>

        {/* Success Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Payment Successful! 🎉
          </h1>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Welcome to Course Creator 360! Your free trial has started and you now have access to all premium features.
          </p>
        </motion.div>

        {/* Features List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-green-50 rounded-lg p-4 mb-6"
        >
          <h3 className="text-sm font-semibold text-green-800 mb-3">What's next:</h3>
          <ul className="text-sm text-green-700 space-y-2 text-left">
            <li className="flex items-center">
              <CheckCircleIcon className="w-4 h-4 mr-2 text-green-600 flex-shrink-0" />
              Complete your onboarding
            </li>
            <li className="flex items-center">
              <CheckCircleIcon className="w-4 h-4 mr-2 text-green-600 flex-shrink-0" />
              Create your first course
            </li>
            <li className="flex items-center">
              <CheckCircleIcon className="w-4 h-4 mr-2 text-green-600 flex-shrink-0" />
              Explore premium features
            </li>
          </ul>
        </motion.div>

        {/* Continue Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <button
            onClick={handleContinue}
            className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-700 transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <span>Continue to Onboarding</span>
            <ArrowRightIcon className="w-4 h-4" />
          </button>
          
          <p className="text-xs text-gray-500">
            Redirecting automatically in {countdown} seconds...
          </p>
        </motion.div>

        {/* Support Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 pt-4 border-t border-gray-100"
        >
          <p className="text-xs text-gray-500">
            Need help?{' '}
            <a href="#" className="text-primary-600 hover:text-primary-700 underline">
              Contact support
            </a>
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
} 