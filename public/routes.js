/**
 * Route configuration for Course Creator 360 Checkout
 * Handles different subscription paths and redirects
 */

const routes = {
  // Monthly subscription with 30-day free trial
  '/signup/premium_monthly': {
    title: 'Course Creator 360 · Start Your Free Trial',
    description: 'Start your free trial of Course Creator 360 - Everything you need to run your online course business',
    subscriptionType: 'monthly',
    hasTrial: true,
    trialDays: 30,
    priceId: 'price_1RmI9LBnnqL8bKFQyQA3C8n4',
    monthlyPrice: 147,
    annualPrice: 1470,
    buttonText: 'Start Free Trial',
    planTitle: '30 days free',
    planPrice: 'then $147/mo',
    trialText: '30-Day Free Trial'
  },

  // Annual subscription with no free trial
  '/signup/premium_annual': {
    title: 'Course Creator 360 · Annual Plan',
    description: 'Get Course Creator 360 annual plan - Everything you need to run your online course business',
    subscriptionType: 'annual',
    hasTrial: false,
    trialDays: 0,
    priceId: 'price_1RmI9LBnnqL8bKFQyQA3C8n4', // Using same price for now - update with your annual price ID
    monthlyPrice: 147,
    annualPrice: 1470,
    buttonText: 'Start Annual Plan',
    planTitle: '$1,470/year',
    planPrice: 'billed annually',
    trialText: 'Annual Plan'
  },

  // Default route (redirects to monthly)
  '/': {
    redirect: '/signup/premium_monthly'
  }
};

/**
 * Get route configuration for a given path
 */
function getRouteConfig(path) {
  return routes[path] || routes['/signup/premium_monthly'];
}

/**
 * Check if route should redirect
 */
function shouldRedirect(path) {
  const config = routes[path];
  return config && config.redirect;
}

/**
 * Get redirect path
 */
function getRedirectPath(path) {
  const config = routes[path];
  return config ? config.redirect : '/signup/premium_monthly';
}

/**
 * Update page metadata based on route
 */
function updatePageMetadata(config) {
  // Update title
  document.title = config.title;
  
  // Update meta description
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute('content', config.description);
  }

  // Update Open Graph tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    ogTitle.setAttribute('content', config.title);
  }

  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription) {
    ogDescription.setAttribute('content', config.description);
  }
}

/**
 * Handle route changes
 */
function handleRouteChange() {
  const path = window.location.pathname;
  
  // Check if we need to redirect
  if (shouldRedirect(path)) {
    const redirectPath = getRedirectPath(path);
    window.history.replaceState(null, '', redirectPath);
    return;
  }

  // Get route configuration
  const config = getRouteConfig(path);
  
  // Update page metadata
  updatePageMetadata(config);
  
  // Update checkout app if it exists
  if (window.checkoutApp) {
    window.checkoutApp.state.subscriptionType = config.subscriptionType;
    window.checkoutApp.updatePricingDisplay();
  }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    routes,
    getRouteConfig,
    shouldRedirect,
    getRedirectPath,
    updatePageMetadata,
    handleRouteChange
  };
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
  window.RouteConfig = {
    routes,
    getRouteConfig,
    shouldRedirect,
    getRedirectPath,
    updatePageMetadata,
    handleRouteChange
  };
} 