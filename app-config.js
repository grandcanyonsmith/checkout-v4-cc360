/**
 * Client-side Configuration
 * This file is exposed to the browser, so don't include sensitive data
 */

const AppConfig = {
  // API endpoints
  api: {
    createSubscription: '/api/create-subscription',
    createPaymentIntent: '/api/create-payment-intent',
    validateEmail: '/api/validate-email'
  },
  
  // Stripe public key (safe to expose)
  stripe: {
    publishableKey: 'pk_test_51RMwm4B4vAF3NRPR7nDhjgYs9YLJlacA7pAtk2fBvI4AIMGXVtiIiV3BSv1lR6w5GdJ94sAiL0SagTJ8YVgP4EZQ00CMe6mQ7q'
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
      priceId: 'price_1QPF6eBnnqL8bKFQGvC5BUlm',
      amount: 14700,
      currency: 'usd',
      interval: 'month',
      hasTrial: true,
      trialDays: 30
    },
    annual: {
      priceId: 'price_1QPF6eBnnqL8bKFQNV3JFSVh',
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
Object.freeze(AppConfig);
Object.freeze(AppConfig.api);
Object.freeze(AppConfig.stripe);
Object.freeze(AppConfig.urls);
Object.freeze(AppConfig.ui);
Object.freeze(AppConfig.features);
Object.freeze(AppConfig.validation);
Object.freeze(AppConfig.pricing);

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AppConfig;
} 