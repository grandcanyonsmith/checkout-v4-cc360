/**
 * Vercel Analytics and Speed Insights Integration
 * Client-side analytics for vanilla JavaScript
 */

class AnalyticsManager {
  constructor() {
    this.isInitialized = false;
    this.analytics = null;
    this.speedInsights = null;
  }

  /**
   * Initialize Vercel Analytics and Speed Insights
   */
  async init() {
    if (this.isInitialized) return;

    try {
      // Check if Vercel Analytics is available
      if (typeof window !== 'undefined' && window.va) {
        this.analytics = window.va;
        console.log('✅ Vercel Analytics initialized');
      }

      // Check if Speed Insights is available
      if (typeof window !== 'undefined' && window.si) {
        this.speedInsights = window.si;
        console.log('✅ Vercel Speed Insights initialized');
      }

      this.isInitialized = true;
      
      // Track page view
      this.trackPageView();
      
    } catch (error) {
      console.error('❌ Failed to initialize analytics:', error);
    }
  }

  /**
   * Track page view
   */
  trackPageView() {
    if (!this.isInitialized) return;
    
    const pageData = {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      timestamp: new Date().toISOString()
    };
    
    console.log('📊 Page View:', pageData);
    
    // Track with Vercel Analytics if available
    if (this.analytics && this.analytics.track) {
      this.analytics.track('page_view', pageData);
    }
  }

  /**
   * Track custom events
   */
  trackEvent(eventName, properties = {}) {
    if (!this.isInitialized) return;
    
    const eventData = {
      event: eventName,
      properties,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };
    
    console.log('📊 Event:', eventData);
    
    // Track with Vercel Analytics if available
    if (this.analytics && this.analytics.track) {
      this.analytics.track(eventName, properties);
    }
  }

  /**
   * Track form interactions
   */
  trackFormEvent(action, formData = {}) {
    this.trackEvent('form_interaction', {
      action,
      form_type: 'checkout',
      ...formData
    });
  }

  /**
   * Track payment events
   */
  trackPaymentEvent(action, paymentData = {}) {
    this.trackEvent('payment_event', {
      action,
      ...paymentData
    });
  }

  /**
   * Track email validation events
   */
  trackEmailValidation(action, emailData = {}) {
    this.trackEvent('email_validation', {
      action,
      ...emailData
    });
  }

  /**
   * Track Mailgun API interactions
   */
  trackMailgunEvent(action, mailgunData = {}) {
    const eventData = {
      action,
      service: 'mailgun',
      ...mailgunData
    };
    
    console.log('📧 Mailgun Event:', eventData);
    this.trackEvent('mailgun_interaction', eventData);
  }

  /**
   * Track Twilio API interactions (if you add Twilio later)
   */
  trackTwilioEvent(action, twilioData = {}) {
    const eventData = {
      action,
      service: 'twilio',
      ...twilioData
    };
    
    console.log('📱 Twilio Event:', eventData);
    this.trackEvent('twilio_interaction', eventData);
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metricName, value, additionalData = {}) {
    const metricData = {
      metric: metricName,
      value,
      ...additionalData
    };
    
    console.log('⚡ Performance Metric:', metricData);
    this.trackEvent('performance_metric', metricData);
  }

  /**
   * Track errors
   */
  trackError(error, context = {}) {
    const errorData = {
      error_message: error.message,
      error_stack: error.stack,
      error_name: error.name,
      context,
      timestamp: new Date().toISOString()
    };
    
    console.error('❌ Error Tracked:', errorData);
    this.trackEvent('error', errorData);
  }
}

// Create global instance
const analyticsManager = new AnalyticsManager();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    analyticsManager.init();
  });
} else {
  analyticsManager.init();
}

// Make available globally
window.AnalyticsManager = analyticsManager;