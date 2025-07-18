/**
 * Client-side Configuration
 * This file is exposed to the browser, so don't include sensitive data
 */

// Check if AppConfig already exists to prevent duplicate declaration
if (typeof AppConfig === 'undefined') {
  window.AppConfig = {
  // API endpoints
  api: {
    createSubscription: '/api/create-subscription',
    createPaymentIntent: '/api/create-payment-intent',
    validateEmail: '/api/validate-email'
  },
  
  // Stripe public key (safe to expose)
  stripe: {
    publishableKey: 'pk_live_51LNznbBnnqL8bKFQDpqXsQJ00WefQSSLMf2CZWr0sarinvaalkyY0BE7q7swLzIt49RSiCgBAP5uPHjU8fBNDsf0008MSXCQFU'
  },
  
  // Redirect URLs
  urls: {
    successRedirect: 'https://link.coursecreator360.com/widget/bookings/cc360/onboarding'
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
  },
  
  // Pricing configuration
  pricing: {
    monthly: {
      priceId: 'price_1Rm28YBnnqL8bKFQEnVUozqo',
      amount: 14700,
      currency: 'usd',
      interval: 'month',
      hasTrial: true,
      trialDays: 30
    },
    annual: {
      priceId: 'price_1RjSoDBnnqL8bKFQUorl1OKI',
      amount: 147000,
      currency: 'usd',
      interval: 'year',
      hasTrial: false,
      trialDays: 0
    }
  },
  
  // Environment detection
  isDevelopment: window.location.hostname === 'localhost',
  isProduction: window.location.hostname !== 'localhost'
  };

  // Freeze configuration to prevent modifications
  Object.freeze(window.AppConfig);
  Object.freeze(window.AppConfig.api);
  Object.freeze(window.AppConfig.stripe);
  Object.freeze(window.AppConfig.urls);
  Object.freeze(window.AppConfig.ui);
  Object.freeze(window.AppConfig.features);
  Object.freeze(window.AppConfig.validation);
  Object.freeze(window.AppConfig.pricing);

  // Export for use in other scripts
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.AppConfig;
  }
} 