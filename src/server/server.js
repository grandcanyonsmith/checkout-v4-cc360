const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const config = require('../shared/config');
const { logger } = require('../shared/logger');
const stripe = require('stripe')(config.stripe.secretKey);

const app = express();
const PORT = config.server.port;
const serverLogger = logger.child('Server');
const middleware = require('./middleware');

// Validate environment variables
if (!config.validateEnvironment()) {
  process.exit(1);
}

// Trust proxy for accurate IP addresses
app.set('trust proxy', true);

// Middleware
app.use(middleware.requestLogger);
app.use(middleware.securityHeaders);
app.use(middleware.rateLimiter);
app.use(cors({
  origin: config.security.corsOrigin,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(middleware.sanitizeInput);

// Serve static files from public directory (excluding index.html)
app.use(express.static(path.join(__dirname, '../../public'), {
  maxAge: config.isProduction ? '1d' : 0,
  etag: true,
  index: false // Don't serve index.html automatically
}));

// Serve client JavaScript files from src/client
app.use('/js', express.static(path.join(__dirname, '../client'), {
  maxAge: config.isProduction ? '1d' : 0,
  etag: true
}));

// Serve shared JavaScript files
app.use('/js', express.static(path.join(__dirname, '../shared'), {
  maxAge: config.isProduction ? '1d' : 0,
  etag: true
}));

// API routes
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency, subscription_type, price_id, customer_id, subscription_id } = req.body;

    // For trial subscriptions (amount = 0), use Setup Intent instead of Payment Intent
    if (amount === 0) {
      const setupIntent = await stripe.setupIntents.create({
        customer: customer_id, // Associate with the customer
        automatic_payment_methods: { enabled: true },
        metadata: {
          subscription_type,
          price_id,
          subscription_id
        }
      });

      res.json({
        success: true,
        client_secret: setupIntent.client_secret
      });
    } else {
      const paymentIntent = await stripe.paymentIntents.create({
        customer: customer_id, // Associate with the customer
        amount,
        currency,
        automatic_payment_methods: { enabled: true },
        metadata: {
          subscription_type,
          price_id,
          subscription_id
        }
      });

      res.json({
        success: true,
        client_secret: paymentIntent.client_secret
      });
    }

  } catch (error) {
    serverLogger.error('Payment intent creation error', error);
    res.status(500).json({
      success: false,
      error: config.server.isProduction ? 'Payment processing error' : error.message
    });
  }
});

// Handle subscription creation
app.post('/api/create-subscription', async (req, res) => {
  try {
    const { email, name, phone, subscriptionType, priceId } = req.body;

    // Create customer
    const customer = await stripe.customers.create({
      email,
      name,
      phone,
      metadata: {
        source: 'checkout_page',
        subscription_type: subscriptionType
      }
    });

    // Create subscription
    const subscriptionParams = {
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent']
    };

    // Add trial period for monthly subscriptions
    if (subscriptionType === 'monthly') {
      subscriptionParams.trial_period_days = 30;
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);

    // For trial subscriptions, there's no payment intent yet
    const response = {
      success: true,
      customerId: customer.id,
      subscriptionId: subscription.id
    };

    // Only add clientSecret if there's a payment intent (non-trial subscriptions)
    if (subscription.latest_invoice.payment_intent) {
      response.clientSecret = subscription.latest_invoice.payment_intent.client_secret;
    }

    res.json(response);

  } catch (error) {
    serverLogger.error('Subscription creation error', error);
    res.status(500).json({
      success: false,
      error: config.server.isProduction ? 'Subscription creation failed' : error.message
    });
  }
});

// Handle webhook events
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = config.stripe.webhookSecret;

  if (!endpointSecret && config.server.isProduction) {
    serverLogger.error('Webhook endpoint secret not configured');
    return res.status(500).send('Webhook configuration error');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    serverLogger.warn('Webhook signature verification failed', { error: err.message });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const webhookLogger = serverLogger.child('Webhook');

  // Handle the event
  try {
    switch (event.type) {
      case 'customer.subscription.created':
        const subscription = event.data.object;
        webhookLogger.info('Subscription created', { subscriptionId: subscription.id });
        // TODO: Handle subscription creation
        break;
      
      case 'customer.subscription.updated':
        const updatedSubscription = event.data.object;
        webhookLogger.info('Subscription updated', { subscriptionId: updatedSubscription.id });
        // TODO: Handle subscription updates
        break;
      
      case 'invoice.payment_succeeded':
        const invoice = event.data.object;
        webhookLogger.info('Payment succeeded', { invoiceId: invoice.id });
        // TODO: Handle successful payment
        break;
      
      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        webhookLogger.warn('Payment failed', { invoiceId: failedInvoice.id });
        // TODO: Handle failed payment
        break;
      
      default:
        webhookLogger.debug('Unhandled event type', { type: event.type });
    }

    res.json({ received: true });
  } catch (error) {
    webhookLogger.error('Error processing webhook', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Handle email validation with Mailgun
app.post('/api/validate-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Mailgun configuration - Use environment variable in production
    const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
    const MAILGUN_BASE_URL = 'https://api.mailgun.net/v4';
    
    if (!MAILGUN_API_KEY) {
      // Return basic validation if no API key
      return res.json({
        success: true,
        isValid: true,
        validationMethod: 'basic_fallback',
        risk: 'unknown',
        note: 'Email validation API not configured'
      });
    }
    
    try {
      // Make request to Mailgun validation API
      const params = new URLSearchParams({
        address: email
      });
      
      const response = await fetch(`${MAILGUN_BASE_URL}/address/validate?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64')}`
        }
      });

      if (!response.ok) {
        // If Mailgun fails, return basic validation
        serverLogger.debug('Mailgun API error', { status: response.status });
        return res.json({
          success: true,
          isValid: true, // Assume valid if API fails
          validationMethod: 'basic_fallback',
          risk: 'unknown'
        });
      }

      const data = await response.json();
      
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
      };

      res.json(result);

    } catch (mailgunError) {
      serverLogger.debug('Mailgun request error', { error: mailgunError.message });
      // Return basic validation on error
      res.json({
        success: true,
        isValid: true,
        validationMethod: 'basic_fallback',
        risk: 'unknown'
      });
    }

  } catch (error) {
    serverLogger.error('Email validation error', error);
    res.status(500).json({
      success: false,
      error: config.server.isProduction ? 'Validation service error' : error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Legacy static file routes removed - now handled by express.static middleware

// Handle Vercel Analytics script
app.get('/_vercel/insights/script.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  // Return empty script if file doesn't exist
  res.send('// Vercel Analytics placeholder');
});

// Serve index.html with configuration injection for all routes
app.get('*', (req, res) => {
  const htmlPath = path.join(__dirname, '../../public/index.html');
  
  fs.readFile(htmlPath, 'utf8', (err, html) => {
    if (err) {
      serverLogger.error('Failed to read index.html', err);
      return res.status(500).send('Internal Server Error');
    }
    
    // Prepare configuration for client
    const clientConfig = {
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      successRedirectUrl: process.env.SUCCESS_REDIRECT_URL || 'https://link.coursecreator360.com/widget/bookings/cc360/onboarding',
      pricingConfig: {
        monthly: {
          priceId: process.env.MONTHLY_PRICE_ID || '',
          amount: parseInt(process.env.MONTHLY_AMOUNT || '14700'),
          currency: 'usd',
          interval: 'month',
          hasTrial: true,
          trialDays: 30
        },
        annual: {
          priceId: process.env.ANNUAL_PRICE_ID || '',
          amount: parseInt(process.env.ANNUAL_AMOUNT || '147000'),
          currency: 'usd',
          interval: 'year',
          hasTrial: false,
          trialDays: 0
        }
      }
    };
    
    // Replace template variables
    html = html
      .replace('<%- stripePublishableKey %>', clientConfig.stripePublishableKey)
      .replace('<%- successRedirectUrl %>', clientConfig.successRedirectUrl)
      .replace('<%- JSON.stringify(pricingConfig) %>', JSON.stringify(clientConfig.pricingConfig));
    
    res.send(html);
  });
});

// Add error handling middleware (must be last)
app.use(middleware.notFoundHandler);
app.use(middleware.errorHandler);

// Export the Express app for Vercel/serverless environments
module.exports = app;

// Only start the server if this file is run directly
if (require.main === module) {
  // Start server
  const server = app.listen(PORT, config.server.host, () => {
    serverLogger.info('Server started', {
      port: PORT,
      host: config.server.host,
      environment: config.server.env,
      nodeVersion: process.version
    });
    
    if (!config.server.isProduction) {
      console.log(`
🚀 Course Creator 360 Checkout Server

📍 Local: http://localhost:${PORT}
🌐 Network: http://${config.server.host}:${PORT}

📁 Serving files from: ${__dirname}
⏰ Started at: ${new Date().toLocaleString()}

Press Ctrl+C to stop the server
      `);
    }
  });

  // Graceful shutdown
  const gracefulShutdown = () => {
    serverLogger.info('Shutdown signal received');
    
    server.close(() => {
      serverLogger.info('HTTP server closed');
      process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
      serverLogger.error('Force shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  // Error handling
  process.on('unhandledRejection', (reason, promise) => {
    serverLogger.error('Unhandled Rejection', { reason, promise });
  });

  process.on('uncaughtException', (error) => {
    serverLogger.error('Uncaught Exception', error);
    process.exit(1);
  });
} 