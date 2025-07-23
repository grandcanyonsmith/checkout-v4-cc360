import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import Stripe from 'stripe'

// Load environment variables
config()

const app = express()
const PORT = process.env.PORT || 3001

// Enhanced CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:3001', 
    'http://localhost:3002', 
    'http://localhost:5173',
    'https://checkout-v4-cc360.vercel.app',
    'https://checkout-v4-cc360-fmef75bkf-grandcanyonsmiths-projects.vercel.app',
    'https://checkout-v4-cc360-14ub5kcpm-grandcanyonsmiths-projects.vercel.app',
    'https://checkout-v4-cc360-9kuqj45qr-grandcanyonsmiths-projects.vercel.app',
    'https://checkout-v4-cc360-oft8y1u3u-grandcanyonsmiths-projects.vercel.app',
    'https://checkout-v4-cc360-bpfas6wba-grandcanyonsmiths-projects.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json({ limit: '10mb' }))

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Helper function for consistent error handling
const handleStripeError = (error, res) => {
  console.error('Stripe error:', error)
  
  let message = 'An error occurred processing your request'
  let statusCode = 500
  
  if (error.type === 'StripeCardError') {
    message = error.message
    statusCode = 400
  } else if (error.type === 'StripeInvalidRequestError') {
    message = 'Invalid request parameters'
    statusCode = 400
  } else if (error.type === 'StripeAPIError') {
    message = 'Payment service temporarily unavailable'
    statusCode = 503
  } else if (error.type === 'StripeConnectionError') {
    message = 'Network error, please try again'
    statusCode = 503
  } else if (error.type === 'StripeAuthenticationError') {
    message = 'Payment system configuration error'
    statusCode = 500
  }
  
  res.status(statusCode).json({
    error: message,
    type: error.type || 'unknown_error'
  })
}

// Email validation endpoint using Mailgun API
app.post('/api/validate-email', async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      })
    }

    // Mailgun configuration
    const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY
    const MAILGUN_BASE_URL = 'https://api.mailgun.net/v4'
    
    if (!MAILGUN_API_KEY) {
      console.warn('MAILGUN_API_KEY not configured, using basic validation')
      return res.status(200).json({
        success: true,
        isValid: true,
        validationMethod: 'basic_fallback',
        risk: 'unknown'
      })
    }
    
    try {
      // Make request to Mailgun validation API
      const params = new URLSearchParams({
        address: email,
        provider_lookup: 'true'
      })
      
      const response = await fetch(`${MAILGUN_BASE_URL}/address/validate?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64')}`
        }
      })

      if (!response.ok) {
        console.warn('Mailgun API error:', response.status)
        return res.status(200).json({
          success: true,
          isValid: true,
          validationMethod: 'basic_fallback',
          risk: 'unknown',
          apiError: `Mailgun API returned ${response.status}`
        })
      }

      const data = await response.json()
      
      // Transform Mailgun response to our format
      const result = {
        success: true,
        isValid: data.result === 'deliverable',
        result: data.result,
        risk: data.risk || 'unknown',
        isDisposable: data.is_disposable_address || false,
        isRoleAddress: data.is_role_address || false,
        reason: data.reason || null,
        didYouMean: data.did_you_mean || null,
        validationMethod: 'mailgun_api'
      }

      res.status(200).json(result)

    } catch (mailgunError) {
      console.error('Mailgun request error:', mailgunError)
      return res.status(200).json({
        success: true,
        isValid: true,
        validationMethod: 'basic_fallback',
        risk: 'unknown',
        apiError: mailgunError.message
      })
    }

  } catch (error) {
    console.error('Email validation error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Course Creator 360 Billing Endpoints

// Create customer for trial signup
app.post('/api/billing/create-customer', async (req, res) => {
  try {
    const { email, name, phone, zipCode, metadata } = req.body

    // Validate required fields
    if (!email || !name) {
      return res.status(400).json({ error: 'Missing required customer information' })
    }

    // Check if customer already exists
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1
    })

    let customer
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0]
      
      // Update customer info if needed
      const updateData = {
        name,
        phone,
        metadata: {
          ...customer.metadata,
          ...metadata,
          updated_at: new Date().toISOString()
        }
      }

      // Add address if provided
      if (zipCode) {
        updateData.address = {
          postal_code: zipCode,
          country: 'US'
        }
      }

      customer = await stripe.customers.update(customer.id, updateData)
    } else {
      // Create new customer
      const createData = {
        email,
        name,
        phone,
        metadata: {
          ...metadata,
          created_at: new Date().toISOString()
        }
      }

      // Add address if provided
      if (zipCode) {
        createData.address = {
          postal_code: zipCode,
          country: 'US'
        }
      }

      customer = await stripe.customers.create(createData)
    }

    res.json({
      customerId: customer.id,
      email: customer.email
    })
  } catch (error) {
    handleStripeError(error, res)
  }
})

// Create SetupIntent for card validation (Course Creator 360 flow)
app.post('/api/billing/create-setup-intent', async (req, res) => {
  try {
    const { customerId } = req.body

    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required' })
    }

    // Create SetupIntent for validating and saving the payment method
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'], // Match frontend configuration
      usage: 'off_session', // Required for future automatic billing
      metadata: {
        type: 'trial_signup',
        created_at: new Date().toISOString()
      }
    })

    res.json({
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id
    })
  } catch (error) {
    handleStripeError(error, res)
  }
})

// Start 30-day trial subscription (Course Creator 360 flow)
app.post('/api/billing/start-trial', async (req, res) => {
  try {
    const { customerId, paymentMethodId, priceId, userInfo } = req.body

    if (!customerId || !paymentMethodId || !priceId) {
      return res.status(400).json({ error: 'Missing required parameters for trial creation' })
    }

    // Verify the payment method belongs to the customer
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)
    if (paymentMethod.customer !== customerId) {
      return res.status(400).json({ error: 'Payment method does not belong to customer' })
    }

    // Set as default payment method for the customer
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    })

    // Create subscription with 30-day trial
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ 
        price: priceId // This should be the $147/month price ID
      }],
      trial_period_days: 30,
      default_payment_method: paymentMethodId,
      collection_method: 'charge_automatically',
      expand: ['latest_invoice'],
      metadata: {
        signup_source: 'course_creator_360_trial',
        user_info: JSON.stringify(userInfo),
        trial_started: new Date().toISOString()
      }
    })

    res.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      trialEnd: new Date(subscription.trial_end * 1000).toISOString(),
      nextBillingDate: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      amount: subscription.items.data[0].price.unit_amount,
      currency: subscription.items.data[0].price.currency
    })
  } catch (error) {
    handleStripeError(error, res)
  }
})

// Webhook handler for Stripe events
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    switch (event.type) {
      case 'customer.subscription.trial_will_end':
        // Handle trial ending soon (send reminder emails, etc.)
        console.log('Trial ending soon for subscription:', event.data.object.id)
        break

      case 'customer.subscription.updated':
        // Handle subscription changes
        console.log('Subscription updated:', event.data.object.id)
        break

      case 'invoice.payment_failed':
        // Handle failed payments
        console.log('Payment failed for subscription:', event.data.object.subscription)
        break

      case 'invoice.payment_succeeded':
        // Handle successful payments
        console.log('Payment succeeded for subscription:', event.data.object.subscription)
        break

      case 'customer.subscription.deleted':
        // Handle subscription cancellations
        console.log('Subscription cancelled:', event.data.object.id)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    res.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Course Creator 360 Billing API',
    stripe_connected: !!process.env.STRIPE_SECRET_KEY
  })
})

// Legacy endpoints for backward compatibility (if needed)
app.post('/api/create-customer', async (req, res) => {
  // Redirect to new billing endpoint
  req.url = '/api/billing/create-customer'
  return app._router.handle(req, res)
})

// Default route for API health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Course Creator 360 API Server',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/health',
      '/api/validate-email',
      '/api/billing/create-customer',
      '/api/billing/create-setup-intent',
      '/api/billing/start-trial'
    ]
  })
})

// Enhanced error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error)
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Course Creator 360 server running on port ${PORT}`)
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`)
  console.log(`💳 Billing API: http://localhost:${PORT}/api/billing/*`)
  console.log(`📧 Email validation: http://localhost:${PORT}/api/validate-email`)
  console.log(`🔐 Stripe connected: ${!!process.env.STRIPE_SECRET_KEY}`)
  console.log(`🔐 Mailgun connected: ${!!process.env.MAILGUN_API_KEY}`)
})

// Export for Vercel serverless functions
export default app 