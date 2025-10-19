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
import phoneValidator from '../utils/phoneValidation'
import FormField from './FormField'
import PasswordStrength from './PasswordStrength'
import PhoneInput from './PhoneInput'
// FIX: Import function to read ID from the utility file
import { getAffiliateId } from '../utils/affiliateTracking' 

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
  const [phoneValidation, setPhoneValidation] = useState({ status: 'idle', result: null, message: '' })
  const [isValidatingPhone, setIsValidatingPhone] = useState(false)
  
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



  // Validate email with Mailgun API (assuming utility exists)
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

  // Validate phone with Twilio API (assuming utility exists)
  const validatePhone = async (phone) => {
    if (!phone) {
      setPhoneValidation({ status: 'idle', result: null, message: '' })
      return false
    }

    setIsValidatingPhone(true)
    setPhoneValidation({ status: 'validating', result: null, message: 'Validating phone number...' })

    try {
      const result = await phoneValidator.validateWithAPI(phone, { immediate: true })
      const formatted = phoneValidator.formatResult(result)
      
      setPhoneValidation({
        status: result.isValid ? (result.isMobile !== false ? 'valid' : 'invalid') : 'invalid',
        result,
        message: formatted.message
      })
      
      setIsValidatingPhone(false)
      return result.isValid && result.isMobile !== false
    } catch (error) {
      console.error('Phone validation error:', error)
      setPhoneValidation({
        status: 'error',
        result: null,
        message: 'Unable to validate phone number. Please try again.'
      })
      setIsValidatingPhone(false)
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

    // Validate phone before proceeding
    const isPhoneValid = await validatePhone(data.phone)
    
    if (!isPhoneValid) {
      showError('Please enter a valid mobile phone number to continue')
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

    // --- LOGIC FOR AFFILIATE ID AND PHONE FORMAT ---
    // 1. Format phone number to E.164 (retains '+' and digits, removes other characters)
    const formattedPhone = combinedData.phone.replace(/[^\d+]/g, '') 
    
    // 2. Retrieve affiliate ID from Local Storage (using the imported function)
    const affiliateId = getAffiliateId()
    // --------------------------------------------------------------------

    try {
      setIsSubmitting(true)
      clearError()
      
      // Step 1: Create customer first
      const API_BASE_URL = process.env.NODE_ENV === 'production' 
        ? 'https://cc360-checkout-v2-production.up.railway.app'
        : 'http://localhost:3001'
      
      const customerResponse = await fetch(`${API_BASE_URL}/api/billing/create-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: combinedData.email,
          name: `${combinedData.firstName} ${combinedData.lastName}`,
          phone: formattedPhone, // Use formatted phone
          metadata: {
            subscription_type: subscriptionType,
            trial_signup: new Date().toISOString()
          },
          // AFFILIATE FIX: Send affiliate ID using the consistent 'am_id' key
          am_id: affiliateId 
        })
      })

      if (!customerResponse.ok) {
        const errorData = await customerResponse.json()
        throw new Error(errorData.error || 'Failed to create customer account. Please try again.')
      }

      const { customerId } = await customerResponse.json()

      // Step 2: Create SetupIntent for card validation
      // NOTE: This intent is specific to the customer and is DIFFERENT from the one fetched on load.
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
              phone: formattedPhone // Use formatted phone
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
            phone: formattedPhone // Use formatted phone
          },
          // AFFILIATE FIX: Send affiliate ID using the consistent 'am_id' key
          am_id: affiliateId, 
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
        phone: formattedPhone, // Ensure E.164 phone is passed to URL
        trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })

      // Show success message before redirect
      toast.success('Trial started! Redirecting to your dashboard...')
      
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
            Hey {step1Data?.firstName ? `${step1Data.firstName}` : 'there'} 
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
                        emailValidation.status === 'valid' && 'success'
                      )}
                    />
                    {isValidatingEmail && <div className="spinner-sm absolute right-3 top-1/2 -translate-y-1/2"></div>}
                    {emailValidation.status === 'valid' && !isValidatingEmail && <CheckCircleIcon className="h-5 w-5 text-green-500 absolute right-3 top-1/2 -translate-y-1/2" />}
                    {emailValidation.status === 'invalid' && !isValidatingEmail && <ExclamationCircleIcon className="h-5 w-5 text-red-500 absolute right-3 top-1/2 -translate-y-1/2" />}
                  </div>
                )}
              />
              {(emailValidation.status === 'invalid' || emailValidation.status === 'error') && (
                <p className="mt-1 text-sm text-red-600">{emailValidation.message}</p>
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
                    {...field}
                    onBlur={(e) => {
                      field.onBlur(e)
                      if (e.target.value && !step1Form.formState.errors.phone) {
                        validatePhone(e.target.value)
                      }
                    }}
                    className={cn(
                      'form-input text-base',
                      step1Form.formState.errors.phone && 'error',
                      phoneValidation.status === 'invalid' && 'error',
                      phoneValidation.status === 'valid' && 'success'
                    )}
                  />
                )}
              />
              {(phoneValidation.status === 'invalid' || phoneValidation.status === 'error') && (
                <p className="mt-1 text-sm text-red-600">{phoneValidation.message}</p>
              )}
            </FormField>

            {/* Password */}
            <FormField
              label="Password"
              required
              error={step1Form.formState.errors.password?.message}
              description="Must contain 8+ characters, including at least 3 of these: uppercase, lowercase, number, or symbol."
            >
              <Controller
                name="password"
                control={step1Form.control}
                render={({ field }) => (
                  <div className="relative">
                    <input
                      {...field}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Enter a secure password"
                      className={cn(
                        'form-input text-base pr-10',
                        step1Form.formState.errors.password && 'error',
                        !step1Form.formState.errors.password && field.value && passwordStrength.isValid && 'success'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                )}
              />
              <PasswordStrength strength={passwordStrength} />
            </FormField>

            {/* Step 1 Next Button */}
            <button
              type="submit"
              disabled={!step1Form.formState.isValid || isValidatingEmail || isValidatingPhone || !passwordStrength.isValid}
              className={cn(
                'w-full bg-blue-600 flex items-center justify-center rounded-lg px-4 py-4 text-base font-semibold text-white shadow-sm transition-all duration-200',
                'focus:ring-2 focus:ring-offset-2 focus:ring-blue-600',
                (!step1Form.formState.isValid || isValidatingEmail || isValidatingPhone || !passwordStrength.isValid)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'hover:bg-blue-700 hover:transform hover:scale-[1.02] active:scale-[0.98]'
              )}
            >
              Next: Payment Details
              <ArrowLeftIcon className="h-5 w-5 ml-2 transform rotate-180" />
            </button>
          </form>
        )}

        {/* Step 2: Payment Details */}
        {currentStep === 2 && (
          <form onSubmit={step2Form.handleSubmit(onFinalSubmit)} className="space-y-6">
            <button
              type="button"
              onClick={goBackToStep1}
              className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors mb-4"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Go back to edit info
            </button>

            {/* Payment Element */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-3 text-gray-800 flex items-center">
                <CreditCardIcon className="h-6 w-6 mr-2 text-blue-600" />
                Payment Information
              </h3>
              <PaymentElement 
                id="payment-element" 
                onReady={() => setPaymentElementReady(true)}
              />
            </div>
            
            {/* Terms and Conditions */}
            <FormField
              label=""
              error={step2Form.formState.errors.terms?.message}
            >
              <Controller
                name="terms"
                control={step2Form.control}
                render={({ field }) => (
                  <label className="flex items-start cursor-pointer space-x-3">
                    <input
                      {...field}
                      type="checkbox"
                      checked={field.value}
                      className="form-checkbox h-5 w-5 text-blue-600 border-gray-300 rounded mt-0.5"
                    />
                    <span className="text-sm text-gray-700">
                      I agree to the <a href="/terms" target="_blank" className="text-blue-600 hover:underline font-medium">Terms of Service</a> and acknowledge the 30-day free trial will automatically convert to the ${pricing.amount / 100}/{pricing.displayInterval} subscription unless cancelled.
                    </span>
                  </label>
                )}
              />
            </FormField>

            {/* Final Submit Button */}
            <button
              type="submit"
              disabled={!step2Form.formState.isValid || !paymentElementReady || isSubmitting}
              className={cn(
                'w-full flex items-center justify-center rounded-lg px-4 py-4 text-base font-semibold shadow-sm transition-all duration-200',
                'focus:ring-2 focus:ring-offset-2 focus:ring-blue-600',
                (step2Form.formState.isValid && paymentElementReady && !isSubmitting)
                  ? 'bg-blue-600 text-white hover:transform hover:scale-[1.02] active:scale-[0.98]'
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
          </form>
        )}

        {/* Security notice */}
        <div className="text-center text-xs text-gray-500">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <CheckCircleIcon className="h-4 w-4 text-green-500" />
            <span>Secure connection & Stripe payment processing.</span>
          </div>
          <p>
            Your payment is securely processed by Stripe. We do not store any card information.
          </p>
        </div>
      </div>
    </div>
  )
}