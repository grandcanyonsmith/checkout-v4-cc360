/**
 * Vercel Analytics and Speed Insights Integration
 * For vanilla JavaScript applications using CDN imports
 */

class VercelAnalytics {
  constructor() {
    this.isProduction = window.location.hostname !== 'localhost';
    this.analyticsLoaded = false;
    this.speedInsightsLoaded = false;
    
    console.log('🔧 VercelAnalytics initializing...', {
      isProduction: this.isProduction,
      hostname: window.location.hostname
    });
    
    // Always initialize in both dev and production for testing
    this.init();
  }

  async init() {
    try {
      console.log('🚀 Starting analytics initialization...');
      
      // Load both analytics and speed insights
      await Promise.all([
        this.loadAnalytics(),
        this.loadSpeedInsights()
      ]);
      
      console.log('✅ Vercel Analytics and Speed Insights loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load Vercel analytics:', error);
    }
  }

  async loadAnalytics() {
    try {
      console.log('📊 Loading Vercel Analytics...');
      
      // Use CDN import for analytics
      const { inject } = await import('https://cdn.jsdelivr.net/npm/@vercel/analytics@1.1.1/dist/index.js');
      
      // Inject analytics
      inject();
      this.analyticsLoaded = true;
      
      console.log('✅ Vercel Analytics loaded successfully');
      
      // Track initial page view
      this.trackPageView();
    } catch (error) {
      console.error('❌ Failed to load Vercel Analytics:', error);
    }
  }

  async loadSpeedInsights() {
    try {
      console.log('⚡ Loading Vercel Speed Insights...');
      
      // Use CDN import for speed insights with proper error handling
      const speedInsightsModule = await import('https://cdn.jsdelivr.net/npm/@vercel/speed-insights@1.0.2/dist/index.js');
      
      if (speedInsightsModule && speedInsightsModule.injectSpeedInsights) {
        // Inject speed insights
        speedInsightsModule.injectSpeedInsights();
        this.speedInsightsLoaded = true;
        console.log('✅ Vercel Speed Insights loaded successfully');
      } else {
        throw new Error('Speed Insights module not found');
      }
    } catch (error) {
      console.error('❌ Failed to load Vercel Speed Insights:', error);
    }
  }

  trackPageView(path = window.location.pathname) {
    if (this.analyticsLoaded && window.va) {
      console.log('📊 Tracking page view:', path);
      window.va('pageview', { path });
    } else {
      console.log('⚠️ Analytics not ready for page view tracking');
    }
  }

  trackEvent(name, properties = {}) {
    if (this.analyticsLoaded && window.va) {
      console.log('📊 Tracking event:', name, properties);
      window.va('event', { name, data: properties });
    } else {
      console.log('⚠️ Analytics not ready for event tracking:', name);
    }
  }

  // Checkout-specific tracking methods
  trackCheckoutStart(subscriptionType) {
    this.trackEvent('checkout_started', {
      subscription_type: subscriptionType,
      page: 'checkout'
    });
  }

  trackFormFieldCompleted(fieldName) {
    this.trackEvent('form_field_completed', {
      field: fieldName,
      page: 'checkout'
    });
  }

  trackEmailValidation(isValid, method) {
    this.trackEvent('email_validation', {
      is_valid: isValid,
      method: method,
      page: 'checkout'
    });
  }

  trackPaymentAttempt(subscriptionType, amount) {
    this.trackEvent('payment_attempt', {
      subscription_type: subscriptionType,
      amount: amount,
      page: 'checkout'
    });
  }

  trackPaymentSuccess(subscriptionType, amount, customerId) {
    this.trackEvent('payment_success', {
      subscription_type: subscriptionType,
      amount: amount,
      customer_id: customerId,
      page: 'checkout'
    });
  }

  trackPaymentError(error, subscriptionType) {
    this.trackEvent('payment_error', {
      error: error,
      subscription_type: subscriptionType,
      page: 'checkout'
    });
  }

  trackFormValidationError(field, error) {
    this.trackEvent('form_validation_error', {
      field: field,
      error: error,
      page: 'checkout'
    });
  }

  // Debug method to check status
  getStatus() {
    return {
      analyticsLoaded: this.analyticsLoaded,
      speedInsightsLoaded: this.speedInsightsLoaded,
      isProduction: this.isProduction,
      vaAvailable: !!window.va
    };
  }
}

// Initialize analytics only if not already initialized
if (typeof window.VercelAnalytics === 'undefined') {
  const vercelAnalytics = new VercelAnalytics();
  
  // Export for use in other scripts
  if (typeof window !== 'undefined') {
    window.VercelAnalytics = vercelAnalytics;
    
    // Add debug method to window for easy testing
    window.debugAnalytics = () => {
      console.log('🔍 Analytics Status:', vercelAnalytics.getStatus());
      return vercelAnalytics.getStatus();
    };
  }
}

console.log('🎯 VercelAnalytics class ready');