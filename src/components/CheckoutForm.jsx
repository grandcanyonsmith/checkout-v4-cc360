import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js'
import toast from 'react-hot-toast'
import { 
  EyeIcon, 
  EyeSlashIcon, 
  CheckCircleIcon, 
  CreditCardIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'

import { checkoutSchema, validatePasswordStrength, formatPhoneNumber, formatZipCode } from '../utils/validation'
import { cn } from '../utils/cn'
import FormField from './FormField'
import PasswordStrength from './PasswordStrength'

export default function CheckoutForm({ pricing, subscriptionType, isSubmitting, setIsSubmitting }) {
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({ checks: [], passedCount: 0, isValid: false })
  const [paymentElementReady, setPaymentElementReady] = useState(false)
  const [formError, setFormError] = useState('')
  
  const stripe = useStripe()
  const elements = useElements()

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isValid, isDirty },
    setValue,
    trigger
  } = useForm({
    resolver: zodResolver(checkoutSchema),
    mode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      zipCode: '',
      password: '',
      terms: false
    }
  })

  const watchedPassword = watch('password')
  const watchedFields = watch()

  // Update password strength when password changes
  useEffect(() => {
    if (watchedPassword) {
      setPasswordStrength(validatePasswordStrength(watchedPassword))
    } else {
      setPasswordStrength({ checks: [], passedCount: 0, isValid: false })
    }
  }, [watchedPassword])

  // Check if form is ready for submission
  const isFormReady = isValid && isDirty && passwordStrength.isValid && paymentElementReady

  const showError = (message) => {
    setFormError(message)
    toast.error(message)
  }

  const clearError = () => {
    setFormError('')
  }

  const handlePhoneChange = (value, onChange) => {
    const formatted = formatPhoneNumber(value)
    onChange(formatted)
  }

  const handleZipCodeChange = (value, onChange) => {
    const formatted = formatZipCode(value)
    onChange(formatted)
  }

  // Better Stripe error handling
  const handleStripeError = (error) => {
    console.error('Stripe error:', error)
    
    let userMessage = ''
    
    switch (error.code) {
      case 'card_declined':
        if (error.decline_code === 'insufficient_funds') {
          userMessage = 'Your card was declined due to insufficient funds. Please try a different payment method.'
        } else if (error.decline_code === 'lost_card' || error.decline_code === 'stolen_card') {
          userMessage = 'Your card was declined. Please contact your bank or try a different payment method.'
        } else if (error.decline_code === 'expired_card') {
          userMessage = 'Your card has expired. Please use a different payment method.'
        } else if (error.decline_code === 'incorrect_cvc') {
          userMessage = 'The security code (CVC) you entered is incorrect. Please check and try again.'
        } else if (error.decline_code === 'incorrect_number') {
          userMessage = 'The card number you entered is incorrect. Please check and try again.'
        } else if (error.decline_code === 'generic_decline') {
          userMessage = 'This card cannot be used for subscriptions. Please try a different payment method.'
        } else {
          userMessage = 'Your card was declined. Please try a different payment method or contact your bank.'
        }
        break
        
      case 'incorrect_number':
      case 'invalid_number':
        userMessage = 'The card number you entered is invalid. Please check the number and try again.'
        break
        
      case 'invalid_expiry_month':
      case 'invalid_expiry_year':
        userMessage = 'The expiration date you entered is invalid. Please check and try again.'
        break
        
      case 'invalid_cvc':
      case 'incorrect_cvc':
        userMessage = 'The security code (CVC) you entered is invalid. Please check and try again.'
        break
        
      case 'expired_card':
        userMessage = 'Your card has expired. Please use a different payment method.'
        break
        
      case 'processing_error':
        userMessage = 'There was an error processing your payment. Please try again in a few moments.'
        break
        
      case 'rate_limit':
        userMessage = 'Too many payment attempts. Please wait a moment before trying again.'
        break
        
      case 'authentication_required':
        userMessage = 'Your bank requires additional authentication. Please complete the verification process.'
        break

      case 'card_not_supported':
        userMessage = 'This type of card is not supported. Please use a different payment method.'
        break

      case 'testmode_charges_only':
        userMessage = 'Test cards cannot be used. Please use a real payment method.'
        break
        
      default:
        userMessage = error.message || 'An error occurred while processing your payment. Please try again.'
        break
    }
    
    showError(userMessage)
    return false
  }

  const onSubmit = async (data) => {
    if (!stripe || !elements) {
      showError('Payment system not loaded. Please refresh the page.')
      return
    }

    if (isSubmitting) return

    try {
      setIsSubmitting(true)
      clearError()
      
      // Step 1: Create customer first
      const API_BASE_URL = process.env.NODE_ENV === 'production' 
        ? 'https://cc360-checkout-production.up.railway.app'
        : 'http://localhost:3001';
      const customerResponse = await fetch(`${API_BASE_URL}/api/billing/create-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          name: `${data.firstName} ${data.lastName}`,
          phone: data.phone.replace(/\D/g, ''),
          zipCode: data.zipCode,
          metadata: {
            subscription_type: subscriptionType,
            trial_signup: new Date().toISOString()
          }
        })
      })

      if (!customerResponse.ok) {
        const errorData = await customerResponse.json()
        throw new Error(errorData.error || 'Failed to create customer account. Please try again.')
      }

      const { customerId } = await customerResponse.json()

      // Step 2: Create SetupIntent for card validation (Course Creator 360 flow)
      const setupResponse = await fetch(`${API_BASE_URL}/api/billing/create-setup-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerId
        })
      })

      if (!setupResponse.ok) {
        const errorData = await setupResponse.json()
        throw new Error(errorData.error || 'Failed to setup payment method. Please try again.')
      }

      const { clientSecret } = await setupResponse.json()

      // Step 3: Submit the elements form first (required by Stripe)
      const { error: submitError } = await elements.submit()
      
      if (submitError) {
        handleStripeError(submitError)
        return
      }

      // Step 4: Confirm setup intent to validate card
      const { setupIntent, error: setupError } = await stripe.confirmSetup({
        elements,
        clientSecret,
        confirmParams: {
          return_url: window.location.href,
          payment_method_data: {
            billing_details: {
              name: `${data.firstName} ${data.lastName}`,
              email: data.email,
              phone: data.phone.replace(/\D/g, ''),
              address: {
                postal_code: data.zipCode,
                country: 'US'
              }
            }
          }
        },
        redirect: 'if_required'
      })

      // Step 5: Handle setup errors (card validation failures)
      if (setupError) {
        handleStripeError(setupError)
        return
      }

      if (!setupIntent || setupIntent.status !== 'succeeded') {
        showError('Card validation failed. Please try a different payment method.')
        return
      }

      // Step 6: Start 30-day trial subscription (Course Creator 360 flow)
      const trialResponse = await fetch(`${API_BASE_URL}/api/billing/start-trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerId,
          paymentMethodId: setupIntent.payment_method,
          priceId: pricing.priceId,
          userInfo: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone.replace(/\D/g, ''),
            zipCode: data.zipCode
          }
        })
      })

      if (!trialResponse.ok) {
        const errorData = await trialResponse.json()
        throw new Error(errorData.error || 'Failed to start trial. Please contact support.')
      }

      const { subscriptionId, status } = await trialResponse.json()

      // Step 7: Success - redirect to onboarding
      const successUrl = 'https://link.coursecreator360.com/widget/bookings/cc360/onboarding'
      const params = new URLSearchParams({
        subscription_id: subscriptionId,
        customer_id: customerId,
        subscription_type: subscriptionType,
        status: status,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone.replace(/\D/g, ''),
        trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      })

      // Show success message before redirect
      toast.success('🎉 Trial started! Redirecting to your dashboard...')
      
      // Redirect to onboarding
      setTimeout(() => {
        window.location.href = `${successUrl}?${params.toString()}`
      }, 1500)

    } catch (error) {
      console.error('Trial signup error:', error)
      showError(error.message || 'An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="card mt-0 mb-8 lg:my-20 animate-fade-in">
      <div className="card-body space-y-4 sm:space-y-6">
        {/* Form header */}
        <div className="text-center lg:text-left">
          <h2 className="text-xl sm:text-2xl font-bold text-primary-900 mb-2">
            Start Your 30-Day Free Trial
          </h2>
          <p className="text-gray-600 text-sm">
            Course Creator 360 Premium • Then $147/month
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Step 1 of 2</span>
            <span>Card validation + trial setup</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: '50%' }}
            />
          </div>
        </div>

        {/* Form Error Display */}
        {formError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <ExclamationCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Payment Error</h3>
              <p className="text-sm text-red-700 mt-1">{formError}</p>
            </div>
            <button
              onClick={clearError}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <span className="sr-only">Dismiss</span>
              ×
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
          {/* Name fields */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2">
            <FormField
              label="First name"
              required
              error={errors.firstName?.message}
            >
              <Controller
                name="firstName"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    autoComplete="given-name"
                    placeholder="John"
                    className={cn(
                      'form-input text-base sm:text-sm',
                      errors.firstName && 'error',
                      !errors.firstName && field.value && 'success'
                    )}
                  />
                )}
              />
            </FormField>

            <FormField
              label="Last name"
              required
              error={errors.lastName?.message}
            >
              <Controller
                name="lastName"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    autoComplete="family-name"
                    placeholder="Doe"
                    className={cn(
                      'form-input text-base sm:text-sm',
                      errors.lastName && 'error',
                      !errors.lastName && field.value && 'success'
                    )}
                  />
                )}
              />
            </FormField>
          </div>

          {/* Email field */}
          <FormField
            label="Email address"
            required
            error={errors.email?.message}
          >
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={cn(
                    'form-input text-base sm:text-sm',
                    errors.email && 'error',
                    !errors.email && field.value && 'success'
                  )}
                />
              )}
            />
          </FormField>

          {/* Phone field */}
          <FormField
            label="Phone number"
            required
            error={errors.phone?.message}
          >
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="tel"
                  autoComplete="tel"
                  placeholder="(555) 123-4567"
                  onChange={(e) => handlePhoneChange(e.target.value, field.onChange)}
                  className={cn(
                    'form-input text-base sm:text-sm',
                    errors.phone && 'error',
                    !errors.phone && field.value && 'success'
                  )}
                />
              )}
            />
          </FormField>

          {/* ZIP Code field */}
          <FormField
            label="ZIP code"
            required
            error={errors.zipCode?.message}
          >
            <Controller
              name="zipCode"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  autoComplete="postal-code"
                  placeholder="12345"
                  onChange={(e) => handleZipCodeChange(e.target.value, field.onChange)}
                  className={cn(
                    'form-input text-base sm:text-sm',
                    errors.zipCode && 'error',
                    !errors.zipCode && field.value && 'success'
                  )}
                />
              )}
            />
          </FormField>

          {/* Password field */}
          <FormField
            label="Create password"
            required
            error={errors.password?.message}
          >
            <div className="relative">
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    className={cn(
                      'form-input pr-12 text-base sm:text-sm',
                      errors.password && 'error',
                      !errors.password && passwordStrength.isValid && 'success'
                    )}
                  />
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors touch-manipulation"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            
            {watchedPassword && (
              <PasswordStrength 
                password={watchedPassword}
                strength={passwordStrength}
              />
            )}
          </FormField>

          {/* Payment Element */}
          <FormField
            label="Card details"
            required
          >
            <div className="mt-2 p-3 sm:p-4 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 bg-white">
              <PaymentElement 
                onReady={() => setPaymentElementReady(true)}
                options={{
                  wallets: {
                    applePay: 'auto',
                    googlePay: 'auto'
                  }
                }}
              />
            </div>
            {!paymentElementReady && (
              <div className="mt-2 text-sm text-gray-500 flex items-center">
                <div className="spinner h-4 w-4 mr-2" />
                Loading payment form...
              </div>
            )}
            <div className="mt-2 text-xs text-gray-500">
              Your card will be validated but not charged during the 30-day trial
            </div>
          </FormField>

          {/* Terms checkbox */}
          <FormField error={errors.terms?.message}>
            <Controller
              name="terms"
              control={control}
              render={({ field }) => (
                <label className="flex items-start space-x-3 cursor-pointer touch-manipulation">
                  <input
                    {...field}
                    type="checkbox"
                    checked={field.value}
                    className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded focus-ring"
                  />
                  <span className="text-sm text-gray-600">
                    I agree to the{' '}
                    <a href="#" className="text-primary-600 hover:text-primary-800 underline">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="#" className="text-primary-600 hover:text-primary-800 underline">
                      Privacy Policy
                    </a>
                  </span>
                </label>
              )}
            />
          </FormField>

          {/* Submit button */}
          <button
            type="submit"
            disabled={!isFormReady || isSubmitting}
            className={cn(
              'w-full flex items-center justify-center rounded-lg px-4 py-3 sm:py-4 text-base sm:text-sm font-semibold shadow-sm transition-all duration-200 touch-manipulation',
              'focus:ring-2 focus:ring-primary-600 focus:ring-offset-2',
              isFormReady && !isSubmitting
                ? 'bg-primary-600 text-white hover:bg-primary-700 transform hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <>
                <div className="spinner h-5 w-5 mr-2" />
                Validating Card & Starting Trial...
              </>
            ) : (
              <>
                <CreditCardIcon className="h-5 w-5 mr-2" />
                Start 30-Day Free Trial
              </>
            )}
          </button>

          {/* Trial info */}
          <div className="text-center text-sm text-gray-600 bg-blue-50 rounded-lg p-4">
            <p className="font-medium text-blue-900 mb-1">30-Day Free Trial</p>
            <p>Your card will be validated but not charged. After 30 days, you'll be billed $147/month unless you cancel.</p>
          </div>
        </form>

        {/* Security notice */}
        <div className="text-center text-xs text-gray-500 px-4">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <CheckCircleIcon className="h-4 w-4 text-green-500" />
            <span>Your payment information is secure</span>
          </div>
          <p>Powered by Stripe • 256-bit SSL encryption</p>
        </div>
      </div>
    </div>
  )
} 