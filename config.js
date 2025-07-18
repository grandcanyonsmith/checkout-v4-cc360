/**
 * Centralized Configuration Management
 * All environment variables and settings should be defined here
 */

// Load environment variables in development
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config();
  } catch (err) {
    // dotenv is optional in development
  }
}

const config = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production'
  },

  // Stripe configuration
  stripe: {
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_51RMwm4B4vAF3NRPR7nDhjgYs9YLJlacA7pAtk2fBvI4AIMGXVtiIiV3BSv1lR6w5GdJ94sAiL0SagTJ8YVgP4EZQ00CMe6mQ7q',
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    apiVersion: '2022-11-15'
  },

  // Mailgun Configuration
  mailgun: {
    apiKey: process.env.MAILGUN_API_KEY,
    publicKey: process.env.MAILGUN_PUBLIC_KEY,
    domain: process.env.MAILGUN_DOMAIN,
    baseUrl: 'https://api.mailgun.net/v4',
    enabled: !!process.env.MAILGUN_API_KEY
  },

  // Application URLs
  urls: {
    redirectUrl: process.env.REDIRECT_URL || 'https://link.coursecreator360.com/widget/bookings/cc360/onboarding',
    baseUrl: process.env.BASE_URL || 'http://localhost:3000'
  },

  // Security configuration
  security: {
    sessionSecret: process.env.SESSION_SECRET,
    rateLimitWindow: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100, // requests per window
    corsOrigin: process.env.CORS_ORIGIN || '*'
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'error' : 'debug'),
    format: process.env.NODE_ENV === 'production' ? 'json' : 'pretty'
  },

  // Feature Flags
  features: {
    emailValidation: process.env.ENABLE_EMAIL_VALIDATION !== 'false',
    analytics: process.env.ENABLE_ANALYTICS !== 'false',
    autoSave: process.env.ENABLE_AUTOSAVE !== 'false'
  }
};

// Validation
function validateConfig() {
  const required = [];
  
  if (config.server.isProduction) {
    // Required in production
    if (!config.stripe.webhookSecret) required.push('STRIPE_WEBHOOK_SECRET');
    if (!config.security.sessionSecret) {
      required.push('SESSION_SECRET');
    }
  }

  if (required.length > 0) {
    throw new Error(`Missing required environment variables: ${required.join(', ')}`);
  }
}

// Validate on load
try {
  validateConfig();
} catch (error) {
  if (config.server.isProduction) {
    // Exit in production if config is invalid
    console.error('Configuration Error:', error.message);
    process.exit(1);
  } else {
    // Warn in development
    console.warn('Configuration Warning:', error.message);
  }
}

module.exports = config; 