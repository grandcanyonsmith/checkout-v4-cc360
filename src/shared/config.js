/**
 * Unified Configuration Management
 * Shared configuration that works for both server and client
 */

// Detect environment
const isServer = typeof window === 'undefined';
const isDevelopment = isServer 
  ? process.env.NODE_ENV !== 'production'
  : window.location.hostname === 'localhost';

// Load environment variables on server
if (isServer && isDevelopment) {
  try {
    require('dotenv').config();
  } catch (err) {
    // dotenv is optional in development
  }
}

// Base configuration
const baseConfig = {
  // Environment
  isDevelopment,
  isProduction: !isDevelopment,
  
  // API endpoints
  api: {
    createSubscription: '/api/create-subscription',
    createPaymentIntent: '/api/create-payment-intent',
    validateEmail: '/api/validate-email',
    clientError: '/api/client-error'
  },
  
  // UI Configuration
  ui: {
    debounceDelay: 300,
    autoSaveInterval: 30000, // 30 seconds
    passwordMinLength: 8
  },
  
  // Feature flags
  features: {
    emailValidation: true,
    autoSave: true,
    analytics: true,
    performance: true
  },
  
  // Validation patterns
  validation: {
    emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phoneRegex: /^[\+]?[1-9][\d]{0,15}$/,
    nameRegex: /^[a-zA-Z\s\-']+$/
  }
};

// Server-specific configuration
const serverConfig = isServer ? {
  // Server settings
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development'
  },
  
  // Stripe configuration (server-side)
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    apiVersion: '2022-11-15'
  },
  
  // Mailgun configuration
  mailgun: {
    apiKey: process.env.MAILGUN_API_KEY,
    publicKey: process.env.MAILGUN_PUBLIC_KEY,
    domain: process.env.MAILGUN_DOMAIN,
    baseUrl: 'https://api.mailgun.net/v4',
    enabled: !!process.env.MAILGUN_API_KEY
  },
  
  // Security configuration
  security: {
    sessionSecret: process.env.SESSION_SECRET || 'dev-session-secret-change-in-production',
    rateLimitWindow: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100,
    corsOrigin: process.env.CORS_ORIGIN || '*'
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
    format: process.env.LOG_FORMAT || (isDevelopment ? 'pretty' : 'json')
  }
} : {};

// Client-specific configuration
const clientConfig = !isServer ? {
  // Stripe public configuration
  stripe: {
    publishableKey: window.STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY
  },
  
  // URLs
  urls: {
    successRedirect: window.SUCCESS_REDIRECT_URL || 'https://link.coursecreator360.com/widget/bookings/cc360/onboarding'
  },
  
  // Pricing configuration - should be loaded from server
  pricing: window.PRICING_CONFIG || {
    monthly: {
      priceId: '',
      amount: 0,
      currency: 'usd',
      interval: 'month',
      hasTrial: true,
      trialDays: 30
    },
    annual: {
      priceId: '',
      amount: 0,
      currency: 'usd',
      interval: 'year',
      hasTrial: false,
      trialDays: 0
    }
  }
} : {};

// Merge configurations
const config = {
  ...baseConfig,
  ...serverConfig,
  ...clientConfig
};

// Validation function for required environment variables
config.validateEnvironment = function() {
  if (!isServer) return true;
  
  const required = [
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('💡 Copy .env.example to .env and fill in the values');
    return false;
  }
  
  return true;
};

// Export configuration
if (isServer) {
  module.exports = config;
} else {
  window.AppConfig = config;
} 