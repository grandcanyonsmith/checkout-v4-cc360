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
      
      console.log('✅ Analytics initialization complete', {
        analyticsLoaded: this.analyticsLoaded,
        speedInsightsLoaded: this.speedInsightsLoaded
      });
    } catch (error) {
      console.error('❌ Analytics initialization error:', error);
    }
  }

  async loadAnalytics() {
    try {
      console.log('📊 Loading Vercel Analytics...');
      
      // Check if already loaded
      if (window.va) {
        console.log('✅ Vercel Analytics already loaded');
        this.analyticsLoaded = true;
        return;
      }
      
      // Dynamically load the analytics script
      const script = document.createElement('script');
      script.src = 'https://va.vercel-scripts.com/v1/script.js';
      script.defer = true;
      
      // Wait for script to load
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      
      // Verify analytics loaded
      if (window.va) {
        console.log('✅ Vercel Analytics loaded successfully');
        this.analyticsLoaded = true;
      } else {
        throw new Error('Analytics script loaded but window.va not found');
      }
    } catch (error) {
      console.error('❌ Failed to load Vercel Analytics:', error);
    }
  }

  async loadSpeedInsights() {
    try {
      console.log('⚡ Loading Vercel Speed Insights...');
      
      // Check if already loaded
      if (window.si) {
        console.log('✅ Vercel Speed Insights already loaded');
        this.speedInsightsLoaded = true;
        return;
      }
      
      // For browser environments, we need to load Speed Insights differently
      // Speed Insights is typically loaded via npm package, so we'll skip it for now
      console.log('ℹ️ Speed Insights requires npm package - skipping for CDN setup');
      
    } catch (error) {
      console.error('❌ Failed to load Vercel Speed Insights:', error);
    }
  }

  trackPageView(path = window.location.pathname) {
    if (this.analyticsLoaded && window.va) {
      console.log('📊 Tracking page view:', path);
      window.va('pageview', { path });
    }
  }

  trackEvent(eventName, properties = {}) {
    if (this.analyticsLoaded && window.va) {
      console.log('📊 Tracking event:', eventName, properties);
      window.va('event', eventName, properties);
    }
  }

  // Track form interactions
  trackFormInteraction(fieldName, action = 'focus') {
    this.trackEvent('form_interaction', {
      field: fieldName,
      action: action,
      page: window.location.pathname
    });
  }

  // Track checkout progress
  trackCheckoutStep(step, additionalData = {}) {
    this.trackEvent('checkout_step', {
      step: step,
      ...additionalData
    });
  }

  // Track errors
  trackError(errorType, errorMessage, additionalData = {}) {
    this.trackEvent('error', {
      type: errorType,
      message: errorMessage,
      page: window.location.pathname,
      ...additionalData
    });
  }

  // Track performance metrics
  trackPerformance() {
    if (!this.analyticsLoaded) return;

    // Use Performance API if available
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
      const domReadyTime = timing.domContentLoadedEventEnd - timing.navigationStart;
      
      this.trackEvent('performance', {
        pageLoadTime,
        domReadyTime,
        page: window.location.pathname
      });
    }
  }
}

// Initialize analytics
const analytics = new VercelAnalytics();

// Track page views on load
window.addEventListener('load', () => {
  analytics.trackPageView();
  analytics.trackPerformance();
});

// Track page views on route changes (for SPAs)
let lastPath = window.location.pathname;
setInterval(() => {
  const currentPath = window.location.pathname;
  if (currentPath !== lastPath) {
    lastPath = currentPath;
    analytics.trackPageView(currentPath);
  }
}, 1000);

// Export for use in other scripts
window.VercelAnalytics = analytics;