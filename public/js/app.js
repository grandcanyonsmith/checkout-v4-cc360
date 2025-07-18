/**
 * Course Creator 360 Checkout Application
 * Production-ready checkout flow with enhanced security and performance
 */

class CheckoutApp {
  constructor() {
    // Ensure configuration is loaded
    if (!window.AppConfig) {
      throw new Error('Configuration not loaded. Please ensure config.js is loaded before app.js');
    }
    
    // Use global configuration
    this.config = window.AppConfig;
    
    // Initialize logger
    this.logger = window.logger || {
      error: console.error.bind(console),
      warn: console.warn.bind(console),
      info: console.info.bind(console),
      debug: console.debug.bind(console)
    };

    // Initialize analytics
    this.analytics = window.AnalyticsManager || null;

    // State management
    this.state = {
      isLoading: true,
      isSubmitting: false,
      formData: {},
      errors: {},
      passwordStrength: 0,
      sessionId: null,
      checkout: null,
      subscriptionType: 'monthly', // default to monthly
      customerId: null
    };

    // DOM elements cache
    this.elements = {};

    // Initialize email validator
    this.emailValidator = window.EmailValidator || null;

    // Initialize the application
    this.init();
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      // Track initialization start
      if (this.analytics) {
        this.analytics.trackEvent('checkout_init_start');
      }
      
      await this.setupDOM();
      await this.setupEventListeners();
      await this.determineSubscriptionType();
      await this.updatePricingDisplay();
      await this.initializeStripe();
      await this.prefillForm();
      this.hideLoading();
      this.setupFormAutoSave();
      
      // Track successful initialization
      if (this.analytics) {
        this.analytics.trackEvent('checkout_init_complete');
      }
    } catch (error) {
      console.error('Initialization error:', error);
      this.showError('Failed to initialize the checkout. Please refresh the page.');
      
      // Track initialization error
      if (this.analytics) {
        this.analytics.trackError(error, { context: 'checkout_init' });
      }
    }
  }

  /**
   * Setup DOM element references
   */
  async setupDOM() {
    const elementIds = [
      'loading-overlay', 'payment-form', 'submit', 'spinner', 'button-text',
      'firstName', 'lastName', 'email', 'phone', 'password', 'togglePassword',
      'eye', 'eyeOff', 'pw-req', 'payment-element', 'terms',
      'error-modal', 'error-message', 'close-error',
      'success-notification', 'success-message',
      // Pricing elements
      'plan-title', 'plan-price', 'trial-period', 'after-trial', 'savings-badge',
      'savings-text', 'subtotal', 'total-after-trial', 'total-due', 'trial-row',
      'trial-text'
    ];

    elementIds.forEach(id => {
      this.elements[id] = document.getElementById(id);
      if (!this.elements[id]) {
        console.warn(`Element with id '${id}' not found`);
      }
    });

    // Password requirement elements
    this.elements.reqs = {
      len: document.getElementById('req-len'),
      low: document.getElementById('req-low'),
      up: document.getElementById('req-up'),
      num: document.getElementById('req-num'),
      sym: document.getElementById('req-sym')
    };
  }

  /**
   * Determine subscription type from URL path
   */
  determineSubscriptionType() {
    const path = window.location.pathname;
    
    // Simple path-based detection
    if (path.includes('/annual') || path.includes('/yearly')) {
      this.state.subscriptionType = 'annual';
    } else {
      this.state.subscriptionType = 'monthly';
    }
  }

  /**
   * Update pricing display based on subscription type
   */
  updatePricingDisplay() {
    const isAnnual = this.state.subscriptionType === 'annual';
    const isMonthly = this.state.subscriptionType === 'monthly';

    // Default pricing configuration
    if (isMonthly) {
      this.elements['plan-title'].textContent = '30 days free';
      this.elements['plan-price'].textContent = 'then $147/mo';
      this.elements['trial-period'].textContent = '30 days free';
      this.elements['after-trial'].textContent = '$147/mo after';
      this.elements['trial-text'].textContent = '30-Day Free Trial';
      this.elements['button-text'].textContent = 'Start Free Trial';
    } else {
      this.elements['plan-title'].textContent = '$1,470/year';
      this.elements['plan-price'].textContent = 'billed annually';
      this.elements['trial-period'].textContent = 'No trial';
      this.elements['after-trial'].textContent = '$1,470/year';
      this.elements['trial-text'].textContent = 'Annual Plan';
      this.elements['button-text'].textContent = 'Start Annual Plan';
    }

    // Update pricing details
    const monthlyAmount = isAnnual ? 14700 / 12 : 14700; // $147.00 in cents
    const annualAmount = isAnnual ? 14700 : 14700; // $147.00 in cents
    
    this.elements['subtotal'].textContent = this.formatCurrency(monthlyAmount);
    this.elements['total-after-trial'].textContent = this.formatCurrency(monthlyAmount);
    
    // Show/hide trial row
    if (isMonthly) {
      this.elements['trial-row'].style.display = 'flex';
      this.elements['total-due'].textContent = '$0.00';
    } else {
      this.elements['trial-row'].style.display = 'none';
      this.elements['total-due'].textContent = this.formatCurrency(annualAmount);
    }

    // Update savings badge
    if (isAnnual) {
      const monthlySavings = (147 * 12) - (annualAmount / 100);
      this.elements['savings-text'].textContent = `Save $${monthlySavings} with annual billing`;
      this.elements['savings-badge'].style.display = 'flex';
    } else {
      this.elements['savings-badge'].style.display = 'flex';
    }
  }

  /**
   * Format currency for display
   */
  formatCurrency(amountInCents) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amountInCents / 100);
  }

  /**
   * Setup event listeners
   */
  async setupEventListeners() {
    // Form submission
    if (this.elements['payment-form']) {
      this.elements['payment-form'].addEventListener('submit', (e) => this.handleSubmit(e));
    }

    // Password toggle
    if (this.elements['togglePassword']) {
      this.elements['togglePassword'].addEventListener('click', () => this.togglePassword());
    }

    // Real-time validation
    const fields = ['firstName', 'lastName', 'email', 'phone', 'password'];
    fields.forEach(field => {
      const element = this.elements[field];
      if (element) {
        element.addEventListener('blur', () => this.validateField(field));
        element.addEventListener('input', () => this.clearFieldError(field));
      }
    });

    // Password strength validation
    if (this.elements['password']) {
      this.elements['password'].addEventListener('input', () => this.validatePassword());
    }

    // Terms checkbox
    if (this.elements['terms']) {
      this.elements['terms'].addEventListener('change', () => this.checkFormReady());
    }

    // Error modal close
    if (this.elements['close-error']) {
      this.elements['close-error'].addEventListener('click', () => this.hideError());
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }

  /**
   * Initialize Stripe
   */
  async initializeStripe() {
    try {
      await this.loadStripe();
      
      if (!window.Stripe) {
        throw new Error('Stripe failed to load');
      }

      this.stripe = window.Stripe(this.config.stripe.publishableKey);
      
      // Create payment intent
      const clientSecret = await this.createPaymentIntent();
      
      // Create payment element
      await this.createPaymentElement(clientSecret);
      
      this.logger.info('Stripe initialized successfully');
    } catch (error) {
      this.logger.error('Stripe initialization failed', error);
      throw error;
    }
  }

  /**
   * Load Stripe script
   */
  loadStripe() {
    return new Promise((resolve, reject) => {
      if (window.Stripe) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Stripe'));
      document.head.appendChild(script);
    });
  }

  /**
   * Create payment intent
   */
  async createPaymentIntent() {
    const response = await fetch(this.config.api.createPaymentIntent, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscriptionType: this.state.subscriptionType
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create payment intent');
    }

    const data = await response.json();
    return data.clientSecret;
  }

  /**
   * Create payment element
   */
  async createPaymentElement(clientSecret) {
    const options = {
      clientSecret,
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#1e40af',
        },
      },
    };

    this.elements.paymentElement = this.stripe.elements(options);
    this.elements.paymentElement.mount('#payment-element');
  }

  /**
   * Prefill form with saved data
   */
  prefillForm() {
    const savedData = this.loadAutoSavedData();
    if (savedData) {
      Object.keys(savedData).forEach(field => {
        if (this.elements[field] && savedData[field]) {
          this.elements[field].value = savedData[field];
          this.state.formData[field] = savedData[field];
        }
      });
    }
  }

  /**
   * Handle form submission
   */
  async handleSubmit(event) {
    event.preventDefault();
    
    if (this.state.isSubmitting) return;

    try {
      this.setSubmitting(true);
      
      // Validate all fields
      const isValid = await this.validateAllFields();
      if (!isValid) {
        this.setSubmitting(false);
        return;
      }

      // Track form submission
      if (this.analytics) {
        this.analytics.trackFormEvent('submit_start', this.state.formData);
      }

      // Confirm payment
      const result = await this.confirmPayment();
      
      if (result.error) {
        this.showFieldError('payment', result.error.message);
      } else {
        // Success - redirect to success page
        window.location.href = this.config.urls.successRedirect;
      }
    } catch (error) {
      this.logger.error('Form submission error', error);
      this.showError('An unexpected error occurred. Please try again.');
      
      if (this.analytics) {
        this.analytics.trackError(error, { context: 'form_submission' });
      }
    } finally {
      this.setSubmitting(false);
    }
  }

  /**
   * Validate all form fields
   */
  async validateAllFields() {
    const fields = ['firstName', 'lastName', 'email', 'phone', 'password'];
    const results = await Promise.all(
      fields.map(field => this.validateField(field))
    );
    
    return results.every(result => result);
  }

  /**
   * Validate individual field
   */
  async validateField(fieldName) {
    const element = this.elements[fieldName];
    if (!element) return true;

    const value = element.value.trim();
    this.state.formData[fieldName] = value;

    // Required field validation
    if (!value) {
      this.showFieldError(fieldName, `${this.getFieldLabel(fieldName)} is required`);
      return false;
    }

    // Field-specific validation
    switch (fieldName) {
      case 'email':
        if (this.emailValidator) {
          const result = await this.emailValidator.validateWithAPI(value);
          const formatted = this.emailValidator.formatResult(result);
          
          if (formatted.type === 'error') {
            this.showFieldError(fieldName, formatted.message);
            return false;
          }
        } else {
          // Basic email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            this.showFieldError(fieldName, 'Please enter a valid email address');
            return false;
          }
        }
        break;

      case 'phone':
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(value.replace(/\D/g, ''))) {
          this.showFieldError(fieldName, 'Please enter a valid phone number');
          return false;
        }
        break;

      case 'password':
        if (!this.isValidPassword()) {
          this.showFieldError(fieldName, 'Password must meet at least 3 of the 4 requirements');
          return false;
        }
        break;
    }

    this.markFieldSuccess(fieldName);
    return true;
  }

  /**
   * Validate password with requirements
   */
  validatePassword() {
    const password = this.elements['password'].value;
    
    // Show/hide requirements box
    if (password.length > 0) {
      this.elements['pw-req'].classList.remove('hidden');
    } else {
      this.elements['pw-req'].classList.add('hidden');
    }

    // Check requirements
    const checks = {
      len: password.length >= 8,
      low: /[a-z]/.test(password),
      up: /[A-Z]/.test(password),
      num: /\d/.test(password),
      sym: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    // Update requirement indicators
    Object.keys(checks).forEach(key => {
      this.setRequirementIcon(this.elements.reqs[key], checks[key]);
    });

    // Validate password meets minimum requirements
    const validCount = Object.values(checks).filter(Boolean).length;
    this.state.passwordStrength = validCount;
    
    return validCount >= 3;
  }

  /**
   * Set requirement icon state
   */
  setRequirementIcon(element, isValid) {
    if (!element) return;
    
    const xIcon = element.querySelector('.x-icon');
    const vIcon = element.querySelector('.v-icon');
    
    if (isValid) {
      element.classList.remove('text-red-600');
      element.classList.add('text-green-600');
      if (xIcon) xIcon.classList.add('hidden');
      if (vIcon) vIcon.classList.remove('hidden');
    } else {
      element.classList.remove('text-green-600');
      element.classList.add('text-red-600');
      if (xIcon) xIcon.classList.remove('hidden');
      if (vIcon) vIcon.classList.add('hidden');
    }
  }

  /**
   * Confirm payment with Stripe
   */
  async confirmPayment() {
    const { error } = await this.stripe.confirmPayment({
      elements: this.elements.paymentElement,
      confirmParams: {
        return_url: this.config.urls.successRedirect,
      },
    });

    return { error };
  }

  /**
   * Toggle password visibility
   */
  togglePassword() {
    const passwordField = this.elements['password'];
    const eyeIcon = this.elements['eye'];
    const eyeOffIcon = this.elements['eyeOff'];

    if (passwordField.type === 'password') {
      passwordField.type = 'text';
      eyeIcon.classList.add('hidden');
      eyeOffIcon.classList.remove('hidden');
    } else {
      passwordField.type = 'password';
      eyeIcon.classList.remove('hidden');
      eyeOffIcon.classList.add('hidden');
    }
  }

  /**
   * Check if form is ready for submission
   */
  checkFormReady() {
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'password'];
    const hasAllFields = requiredFields.every(field => 
      this.elements[field] && this.elements[field].value.trim()
    );
    const hasValidPassword = this.isValidPassword();
    const hasAcceptedTerms = this.elements['terms'] && this.elements['terms'].checked;

    const isReady = hasAllFields && hasValidPassword && hasAcceptedTerms;
    
    if (this.elements['submit']) {
      this.elements['submit'].disabled = !isReady;
    }
  }

  /**
   * Check if password is valid
   */
  isValidPassword() {
    return this.state.passwordStrength >= 3;
  }

  /**
   * Set submitting state
   */
  setSubmitting(submitting) {
    this.state.isSubmitting = submitting;
    
    if (this.elements['submit']) {
      this.elements['submit'].disabled = submitting;
    }
    
    if (this.elements['spinner']) {
      this.elements['spinner'].classList.toggle('hidden', !submitting);
    }
    
    if (this.elements['button-text']) {
      this.elements['button-text'].textContent = submitting ? 'Processing...' : 'Start Free Trial';
    }
  }

  /**
   * Show field error
   */
  showFieldError(fieldName, message, type = 'error') {
    const element = this.elements[fieldName];
    const errorElement = document.getElementById(`${fieldName}-error`);
    
    if (element) {
      element.classList.add('border-red-500');
      element.classList.remove('border-green-500');
    }
    
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.className = `error-message ${type}`;
      errorElement.style.display = 'block';
    }
    
    this.state.errors[fieldName] = message;
  }

  /**
   * Clear field error
   */
  clearFieldError(fieldName) {
    const element = this.elements[fieldName];
    const errorElement = document.getElementById(`${fieldName}-error`);
    
    if (element) {
      element.classList.remove('border-red-500', 'border-green-500');
    }
    
    if (errorElement) {
      errorElement.style.display = 'none';
    }
    
    delete this.state.errors[fieldName];
  }

  /**
   * Mark field as successful
   */
  markFieldSuccess(fieldName) {
    const element = this.elements[fieldName];
    if (element) {
      element.classList.remove('border-red-500');
      element.classList.add('border-green-500');
    }
  }

  /**
   * Show error modal
   */
  showError(message) {
    if (this.elements['error-message']) {
      this.elements['error-message'].textContent = message;
    }
    if (this.elements['error-modal']) {
      this.elements['error-modal'].classList.remove('hidden');
    }
  }

  /**
   * Hide error modal
   */
  hideError() {
    if (this.elements['error-modal']) {
      this.elements['error-modal'].classList.add('hidden');
    }
  }

  /**
   * Show success notification
   */
  showSuccess(message) {
    if (this.elements['success-message']) {
      this.elements['success-message'].textContent = message;
    }
    if (this.elements['success-notification']) {
      this.elements['success-notification'].classList.remove('hidden');
      setTimeout(() => {
        this.elements['success-notification'].classList.add('hidden');
      }, 5000);
    }
  }

  /**
   * Hide loading overlay
   */
  hideLoading() {
    if (this.elements['loading-overlay']) {
      this.elements['loading-overlay'].style.opacity = '0';
      setTimeout(() => {
        this.elements['loading-overlay'].style.display = 'none';
      }, 300);
    }
    this.state.isLoading = false;
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyboard(event) {
    // Ctrl/Cmd + Enter to submit
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      if (this.elements['submit'] && !this.elements['submit'].disabled) {
        this.elements['submit'].click();
      }
    }
  }

  /**
   * Setup form auto-save
   */
  setupFormAutoSave() {
    const fields = ['firstName', 'lastName', 'email', 'phone'];
    fields.forEach(field => {
      const element = this.elements[field];
      if (element) {
        element.addEventListener('input', this.debounce(() => this.autoSaveForm(), 1000));
      }
    });
  }

  /**
   * Auto-save form data
   */
  autoSaveForm() {
    const data = {};
    ['firstName', 'lastName', 'email', 'phone'].forEach(field => {
      if (this.elements[field]) {
        data[field] = this.elements[field].value;
      }
    });
    
    localStorage.setItem('checkout_form_data', JSON.stringify(data));
  }

  /**
   * Load auto-saved data
   */
  loadAutoSavedData() {
    try {
      const data = localStorage.getItem('checkout_form_data');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('Failed to load auto-saved data:', error);
      return null;
    }
  }

  /**
   * Clear auto-saved data
   */
  clearAutoSavedData() {
    localStorage.removeItem('checkout_form_data');
  }

  /**
   * Get field label
   */
  getFieldLabel(fieldName) {
    const labels = {
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email address',
      phone: 'Phone number',
      password: 'Password'
    };
    return labels[fieldName] || fieldName;
  }

  /**
   * Debounce function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Initialize the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new CheckoutApp();
  });
} else {
  new CheckoutApp();
}