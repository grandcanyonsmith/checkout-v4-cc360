import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js'
import toast from 'react-hot-toast'
import { 
  CreditCardIcon,
  ExclamationCircleIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline'
import { z } from 'zod'

import { cn } from '../utils/cn'
import { validatePasswordStrength } from '../utils/validation'
import { validatePhoneNumber, countries } from '../utils/countries'
import emailValidator from '../utils/emailValidation'
import FormField from './FormField'
import PasswordStrength from './PasswordStrength'
import PhoneInput from './PhoneInput'

// Step 1 validation schema (personal info)
const step1Schema = z.object({
  firstName: z.string().min(1, 'First name is required').min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(1, 'Last name is required').min(2, 'Last name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  phone: z.string()
    .min(1, 'Phone number is required')
    .refine((phone) => {
      // Parse country code and phone number
      const match = phone.match(/^(\+\d+)\s*(.*)$/)
      if (!match) return false
      
      const dialCode = match[1]
      const phoneNumber = match[2]
      
      // Find country by dial code
      const country = countries.find(c => c.dialCode === dialCode)
      if (!country) return false
      
      return validatePhoneNumber(phoneNumber, country.code)
    }, 'Please enter a valid phone number'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .refine((password) => {
      const checks = [
        /[a-z]/.test(password), // lowercase
        /[A-Z]/.test(password), // uppercase
        /\d/.test(password),    // numbers
        /[!@#$%^&*(),.?":{}|<>]/.test(password) // symbols
      ]
      return checks.filter(Boolean).length >= 3
    }, 'Password must meet at least 3 of the 4 requirements')
})

// Step 2 validation schema (terms)
const step2Schema = z.object({
  terms: z.boolean().refine(val => val === true, 'You must agree to the terms and conditions')
})

// Combined schema for final submission
const fullSchema = step1Schema.merge(step2Schema)

export default function CheckoutForm({ pricing, subscriptionType, isSubmitting, setIsSubmitting }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [paymentElementReady, setPaymentElementReady] = useState(false)
  const [formError, setFormError] = useState('')
  const [step1Data, setStep1Data] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({ checks: [], passedCount: 0, isValid: false })
  const [emailValidation, setEmailValidation] = useState({ status: 'idle', result: null, message: '' })
  const [isValidatingEmail, setIsValidatingEmail] = useState(false)
  
  const stripe = useStripe()
  const elements = useElements()

  // Step 1 form
  const step1Form = useForm({
    resolver: zodResolver(step1Schema),
    mode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: ''
    }
  })

  // Step 2 form
  const step2Form = useForm({
    resolver: zodResolver(step2Schema),
    mode: 'onChange',
    defaultValues: {
      terms: false
    }
  })

  const watchedPassword = step1Form.watch('password')

  // Update password strength when password changes
  useEffect(() => {
    if (watchedPassword) {
      setPasswordStrength(validatePasswordStrength(watchedPassword))
    } else {
      setPasswordStrength({ checks: [], passedCount: 0, isValid: false })
    }
  }, [watchedPassword])

  const showError = (message) => {
    setFormError(message)
    toast.error(message)
  }

  const clearError = () => {
    setFormError('')
  }



  // Validate email with Mailgun API
  const validateEmail = async (email) => {
    if (!email) {
      setEmailValidation({ status: 'idle', result: null, message: '' })
      return false
    }

    setIsValidatingEmail(true)
    setEmailValidation({ status: 'validating', result: null, message: 'Validating email...' })

    try {
      const result = await emailValidator.validateWithAPI(email, { immediate: true })
      const formatted = emailValidator.formatResult(result)
      
      setEmailValidation({
        status: result.isValid ? 'valid' : 'invalid',
        result,
        message: formatted.message,
        suggestion: formatted.suggestion
      })
      
      setIsValidatingEmail(false)
      return result.isValid
    } catch (error) {
      console.error('Email validation error:', error)
      setEmailValidation({
        status: 'error',
        result: null,
        message: 'Unable to validate email. Please try again.'
      })
      setIsValidatingEmail(false)
      return false
    }
  }

  // Handle step 1 submission (Next button)
  const handleStep1Submit = async (data) => {
    clearError()
    
    // Validate email before proceeding
    const isEmailValid = await validateEmail(data.email)
    
    if (!isEmailValid) {
      showError('Please enter a valid email address to continue')
      return
    }
    
    // Check for high-risk emails
    if (emailValidation.result?.isDisposable) {
      showError('Disposable email addresses are not allowed')
      return
    }
    
    if (emailValidation.result?.result === 'undeliverable') {
      showError('This email address cannot receive emails. Please use a different email.')
      return
    }
    
    if (emailValidation.result?.result === 'do_not_send') {
      showError('This email address is on a do-not-send list. Please use a different email.')
      return
    }
    
    setStep1Data(data)
    setCurrentStep(2)
  }

  // Handle going back to step 1
  const goBackToStep1 = () => {
    setCurrentStep(1)
    clearError()
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

  // Handle final form submission (Step 2)
  const onFinalSubmit = async (step2Data) => {
    if (!stripe || !elements || !step1Data) {
      showError('Payment system not loaded. Please refresh the page.')
      return
    }

    if (isSubmitting) return

    const combinedData = { ...step1Data, ...step2Data }

    try {
      setIsSubmitting(true)
      clearError()
      
      // Step 1: Create customer first
      const API_BASE_URL = process.env.NODE_ENV === 'production' 
        ? 'https://cc360-checkout-v2-production.up.railway.app'
        : 'http://localhost:3001';
      
      const customerResponse = await fetch(`${API_BASE_URL}/api/billing/create-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: combinedData.email,
          name: `${combinedData.firstName} ${combinedData.lastName}`,
          phone: combinedData.phone.replace(/\D/g, ''),
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

      // Step 2: Create SetupIntent for card validation
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
              name: `${combinedData.firstName} ${combinedData.lastName}`,
              email: combinedData.email,
              phone: combinedData.phone.replace(/\D/g, '')
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

      // Step 6: Start 30-day trial subscription
      const trialResponse = await fetch(`${API_BASE_URL}/api/billing/start-trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerId,
          paymentMethodId: setupIntent.payment_method,
          priceId: pricing.priceId,
          userInfo: {
            firstName: combinedData.firstName,
            lastName: combinedData.lastName,
            email: combinedData.email,
            phone: combinedData.phone.replace(/\D/g, '')
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
        email: combinedData.email,
        firstName: combinedData.firstName,
        lastName: combinedData.lastName,
        phone: combinedData.phone.replace(/\D/g, ''),
        trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
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
      <div className="card-body space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#111D2C' }}>
            Hey {step1Data?.firstName ? `${step1Data.firstName}` : 'there'} 👋
          </h2>
          <p className="text-gray-600">
            Let's get your Course Creator 360 trial started!
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Step {currentStep} of 2</span>
            <span>{currentStep === 1 ? 'Personal info' : 'Payment details'}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 rounded-full transition-all duration-300" 
              style={{ 
                width: currentStep === 1 ? '50%' : '100%',
                backgroundColor: '#0475FF'
              }}
            />
          </div>
        </div>

        {/* Form Error Display */}
        {formError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <ExclamationCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{formError}</p>
            </div>
            <button
              onClick={clearError}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-6">
            {/* First and Last Name on same row */}
            <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2">
              <FormField
                label="First Name"
                required
                error={step1Form.formState.errors.firstName?.message}
              >
                <Controller
                  name="firstName"
                  control={step1Form.control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      autoComplete="given-name"
                      placeholder="John"
                      className={cn(
                        'form-input text-base',
                        step1Form.formState.errors.firstName && 'error',
                        !step1Form.formState.errors.firstName && field.value && 'success'
                      )}
                    />
                  )}
                />
              </FormField>

              <FormField
                label="Last Name"
                required
                error={step1Form.formState.errors.lastName?.message}
              >
                <Controller
                  name="lastName"
                  control={step1Form.control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      autoComplete="family-name"
                      placeholder="Doe"
                      className={cn(
                        'form-input text-base',
                        step1Form.formState.errors.lastName && 'error',
                        !step1Form.formState.errors.lastName && field.value && 'success'
                      )}
                    />
                  )}
                />
              </FormField>
            </div>

            {/* Email */}
            <FormField
              label="Email"
              required
              error={step1Form.formState.errors.email?.message}
            >
              <Controller
                name="email"
                control={step1Form.control}
                render={({ field }) => (
                  <div className="relative">
                    <input
                      {...field}
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      onBlur={(e) => {
                        field.onBlur(e)
                        if (e.target.value && !step1Form.formState.errors.email) {
                          validateEmail(e.target.value)
                        }
                      }}
                      className={cn(
                        'form-input text-base pr-10',
                        step1Form.formState.errors.email && 'error',
                        emailValidation.status === 'invalid' && 'error',
                        emailValidation.status === 'valid' && !step1Form.formState.errors.email && 'success'
                      )}
                    />
                    {/* Email validation indicator */}
                    {isValidatingEmail && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                      </div>
                    )}
                    {emailValidation.status === 'valid' && !isValidatingEmail && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      </div>
                    )}
                    {emailValidation.status === 'invalid' && !isValidatingEmail && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                      </div>
                    )}
                  </div>
                )}
              />
              
              {/* Email validation message */}
              {emailValidation.message && emailValidation.status !== 'idle' && (
                <div className={cn(
                  'mt-2 text-sm flex items-start space-x-2',
                  emailValidation.status === 'valid' && 'text-green-600',
                  emailValidation.status === 'invalid' && 'text-red-600',
                  emailValidation.status === 'validating' && 'text-blue-600',
                  emailValidation.status === 'error' && 'text-red-600'
                )}>
                  {emailValidation.status === 'validating' && (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mt-0.5 flex-shrink-0"></div>
                  )}
                  {emailValidation.status === 'valid' && (
                    <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  )}
                  {(emailValidation.status === 'invalid' || emailValidation.status === 'error') && (
                    <ExclamationCircleIcon className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  )}
                  <span>{emailValidation.message}</span>
                </div>
              )}
              
              {/* Email suggestion */}
              {emailValidation.suggestion && (
                <button
                  type="button"
                  onClick={() => {
                    step1Form.setValue('email', emailValidation.suggestion)
                    validateEmail(emailValidation.suggestion)
                  }}
                  className="mt-1 text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Use {emailValidation.suggestion} instead?
                </button>
              )}
            </FormField>

            {/* Phone */}
            <FormField
              label="Phone Number"
              required
              error={step1Form.formState.errors.phone?.message}
            >
              <Controller
                name="phone"
                control={step1Form.control}
                render={({ field }) => (
                  <PhoneInput
                    value={field.value}
                    onChange={field.onChange}
                    error={step1Form.formState.errors.phone}
                    className={cn(
                      step1Form.formState.errors.phone && 'error',
                      !step1Form.formState.errors.phone && field.value && 'success'
                    )}
                  />
                )}
              />
            </FormField>

            {/* Password */}
            <FormField
              label="Create Password"
              required
              error={step1Form.formState.errors.password?.message}
            >
              <div className="relative">
                <Controller
                  name="password"
                  control={step1Form.control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Create a strong password"
                      className={cn(
                        'form-input pr-12 text-base',
                        step1Form.formState.errors.password && 'error',
                        !step1Form.formState.errors.password && passwordStrength.isValid && 'success'
                      )}
                    />
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
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

            {/* Next Button */}
            <button
              type="submit"
              disabled={
                !step1Form.formState.isValid || 
                !passwordStrength.isValid || 
                isValidatingEmail ||
                (emailValidation.status === 'invalid') ||
                (emailValidation.status === 'error')
              }
              className={cn(
                'w-full flex items-center justify-center rounded-lg px-4 py-4 text-base font-semibold shadow-sm transition-all duration-200',
                'focus:ring-2 focus:ring-offset-2',
                (step1Form.formState.isValid && passwordStrength.isValid && !isValidatingEmail && emailValidation.status !== 'invalid' && emailValidation.status !== 'error')
                  ? 'text-white hover:transform hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              )}
              style={{
                backgroundColor: (step1Form.formState.isValid && passwordStrength.isValid && !isValidatingEmail && emailValidation.status !== 'invalid' && emailValidation.status !== 'error') ? '#0475FF' : undefined,
                focusRingColor: '#0475FF'
              }}
            >
              {isValidatingEmail ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-white rounded-full animate-spin mr-2"></div>
                  Validating Email...
                </>
              ) : (
                'Next'
              )}
            </button>

            {/* Terms preview */}
            <p className="text-center text-sm text-gray-500">
              By continuing, you agree to our{' '}
              <a href="#" className="underline hover:no-underline" style={{ color: '#0475FF' }}>
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="underline hover:no-underline" style={{ color: '#0475FF' }}>
                Privacy Policy
              </a>
            </p>
          </form>
        )}

        {/* Step 2: Payment Method */}
        {currentStep === 2 && (
          <form onSubmit={step2Form.handleSubmit(onFinalSubmit)} className="space-y-6">
            {/* Back button */}
            <button
              type="button"
              onClick={goBackToStep1}
              className="flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Back
            </button>

            {/* Payment Method Header */}
            <div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#111D2C' }}>Payment Method</h3>
              <p className="text-sm text-gray-600">
                Your card will be validated but not charged during the 30-day trial
              </p>
            </div>

            {/* Payment Element */}
            <FormField label="Card details" required>
              <div className="mt-2 p-4 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:border-transparent bg-white"
                style={{
                  '--focus-ring-color': '#0475FF',
                  '--focus-border-color': '#0475FF'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#0475FF';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(4, 117, 255, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <PaymentElement 
                  onReady={() => setPaymentElementReady(true)}
                />
              </div>
              {!paymentElementReady && (
                <div className="mt-2 text-sm text-gray-500 flex items-center">
                  <div className="spinner h-4 w-4 mr-2" />
                  Loading payment form...
                </div>
              )}
            </FormField>

            {/* Terms checkbox */}
            <FormField error={step2Form.formState.errors.terms?.message}>
              <Controller
                name="terms"
                control={step2Form.control}
                render={({ field }) => (
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      {...field}
                      type="checkbox"
                      checked={field.value}
                      className="mt-1 h-4 w-4 border-gray-300 rounded focus:ring-2 focus:ring-offset-2"
                      style={{
                        accentColor: '#0475FF'
                      }}
                    />
                    <span className="text-sm text-gray-600">
                      I have read and understand the{' '}
                      <a href="#" className="underline hover:no-underline" style={{ color: '#0475FF' }}>
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a href="#" className="underline hover:no-underline" style={{ color: '#0475FF' }}>
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
              disabled={!step2Form.formState.isValid || !paymentElementReady || isSubmitting}
              className={cn(
                'w-full flex items-center justify-center rounded-lg px-4 py-4 text-base font-semibold shadow-sm transition-all duration-200',
                'focus:ring-2 focus:ring-offset-2',
                (step2Form.formState.isValid && paymentElementReady && !isSubmitting)
                  ? 'text-white hover:transform hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              )}
              style={{
                backgroundColor: (step2Form.formState.isValid && paymentElementReady && !isSubmitting) ? '#0475FF' : undefined,
                focusRingColor: '#0475FF'
              }}
            >
              {isSubmitting ? (
                <>
                  <div className="spinner h-5 w-5 mr-2" />
                  Validating Card & Starting Trial...
                </>
              ) : (
                <>
                  <CreditCardIcon className="h-5 w-5 mr-2" />
                  Start Trial
                </>
              )}
            </button>
          </form>
        )}

        {/* Security notice */}
        <div className="text-center text-xs text-gray-500">
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