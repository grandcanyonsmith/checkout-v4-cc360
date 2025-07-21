/**
 * Client-side Configuration Management
 * Browser-compatible configuration for the checkout application
 */

// Detect environment
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.includes('dev') ||
                     window.location.hostname.includes('staging');

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
    nameRegex: /^[a-zA-Z\s\-']+$/
  }
};

// Client-specific configuration
const clientConfig = {
  // Stripe public configuration
  stripe: {
    publishableKey: window.STRIPE_PUBLISHABLE_KEY || 'pk_live_51LNznbBnnqL8bKFQDpqXsQJ00WefQSSLMf2CZWr0sarinvaalkyY0BE7q7swLzIt49RSiCgBAP5uPHjU8fBNDsf0008MSXCQFU'
  },
  
  // URLs
  urls: {
    successRedirect: window.SUCCESS_REDIRECT_URL || 'https://link.coursecreator360.com/widget/bookings/cc360/onboarding'
  },
  
  // Pricing configuration - loaded from server
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
};

// Merge configurations
const config = {
  ...baseConfig,
  ...clientConfig
};

// Validation function for client-side configuration
config.validateClientConfig = function() {
  const required = [
    'stripe.publishableKey',
    'urls.successRedirect'
  ];
  
  const missing = required.filter(key => {
    const value = key.split('.').reduce((obj, k) => obj && obj[k], config);
    return !value;
  });
  
  if (missing.length > 0) {
    console.warn('⚠️ Missing client configuration:', missing.join(', '));
    return false;
  }
  
  return true;
};

// Make configuration available globally
window.AppConfig = config;

// Log configuration status
if (isDevelopment) {
  console.log('🔧 App Configuration:', config);
}
