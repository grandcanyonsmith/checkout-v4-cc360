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
        element.addEventListener('blur', async () => {
          await this.validateField(field);
          this.checkFormReady();
        });
        element.addEventListener('input', () => {
          this.clearFieldError(field);
          this.checkFormReady();
        });
      }
    });

    // Phone number formatting
    if (this.elements['phone']) {
      this.elements['phone'].addEventListener('input', (e) => {
        this.formatPhoneNumber(e);
        this.clearFieldError('phone');
        this.checkFormReady();
      });
    }

    // Password strength validation
    if (this.elements['password']) {
      this.elements['password'].addEventListener('input', () => {
        this.validatePassword();
        this.checkFormReady();
      });
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
      
      // Create payment element immediately for better UX
      await this.createPaymentElementForDisplay();
      
      this.logger.info('Stripe initialized successfully');
    } catch (error) {
      this.logger.error('Stripe initialization failed', error);
      this.showError('Payment system is temporarily unavailable. Please try again later.');
    }
  }

  /**
   * Create payment element for display (before form submission)
   */
  async createPaymentElementForDisplay() {
    const paymentElementDiv = document.getElementById('payment-element');
    if (!paymentElementDiv) {
      return;
    }

    try {
      // Create Stripe elements instance for display
      this.stripeElements = this.stripe.elements({
        mode: 'setup',
        currency: 'usd',
        appearance: { 
          theme: 'stripe',
          variables: {
            colorPrimary: '#1e40af',
          }
        }
      });

      // Create and mount the payment element
      this.paymentElement = this.stripeElements.create('payment', {
        fields: {
          billingDetails: {
            address: 'never', // We collect address separately
          }
        }
      });

      this.paymentElement.mount('#payment-element');
    } catch (error) {
      console.error('Failed to create payment element for display:', error);
      paymentElementDiv.innerHTML = '<div class="text-sm text-gray-500">Payment form will load after entering your information</div>';
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
    // Ensure we have a valid subscription type
    if (!this.state.subscriptionType) {
      throw new Error('Subscription type not determined');
    }
    
    // Ensure we have pricing configuration
    if (!this.config.pricing || !this.config.pricing[this.state.subscriptionType]) {
      throw new Error(`Pricing configuration not found for subscription type: ${this.state.subscriptionType}`);
    }
    
    const pricing = this.config.pricing[this.state.subscriptionType];
    
    // For monthly with trial, we don't charge anything initially
    // For annual, we charge the full amount
    const amount = pricing.hasTrial ? 0 : (pricing.amount || 0);
    
    // Ensure amount is a valid number
    const finalAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    
    const requestBody = {
      amount: finalAmount,
      currency: pricing.currency || 'usd',
      subscription_type: this.state.subscriptionType,
      price_id: pricing.priceId || '',
      customer_id: this.state.customerId,
      subscription_id: this.state.sessionId
    };
    
    // Validate that all required fields are present
    if (typeof requestBody.amount !== 'number' || isNaN(requestBody.amount)) {
      throw new Error(`Invalid amount: ${requestBody.amount}`);
    }
    
    if (!requestBody.customer_id) {
      throw new Error('Customer ID is required');
    }
    
    if (!requestBody.subscription_id) {
      throw new Error('Subscription ID is required');
    }

    const response = await fetch(this.config.api.createPaymentIntent, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Payment intent creation failed:', errorText);
      throw new Error(`Failed to create payment intent: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.client_secret;
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
    
    // Validate password if it has a value
    if (this.elements['password'] && this.elements['password'].value) {
      this.validatePassword();
    }
    
    // Check form readiness after prefilling
    this.checkFormReady();
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

      // Create customer and subscription first
      await this.createCustomerAndSubscription();

      // Create payment intent and get client secret
      const clientSecret = await this.createPaymentIntent();
      
      // Update the existing payment element with the client secret
      await this.updatePaymentElementWithSecret(clientSecret);

      // Confirm payment
      const result = await this.confirmPayment(clientSecret);
      
      if (result.error) {
        // Payment failed - error already handled in confirmPayment method
        // Don't redirect, let user try again
        this.setSubmitting(false);
        return;
      } else {
        // Success - redirect to success page
        window.location.href = this.buildReturnUrl();
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
   * Create customer and subscription
   */
  async createCustomerAndSubscription() {
    const pricing = this.config.pricing[this.state.subscriptionType];
    
    const response = await fetch('/api/create-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: this.elements['email'].value.trim(),
        name: `${this.elements['firstName'].value.trim()} ${this.elements['lastName'].value.trim()}`,
        phone: this.state.formData['phone'] || this.elements['phone'].value.replace(/\D/g, ''),
        subscriptionType: this.state.subscriptionType,
        priceId: pricing.priceId
      })
    });

    if (!response.ok) {
      throw new Error('Failed to create subscription');
    }

    const data = await response.json();
    this.state.customerId = data.customerId;
    this.state.sessionId = data.subscriptionId;
  }

  /**
   * Build return URL with parameters
   */
  buildReturnUrl() {
    const params = new URLSearchParams({
      session_id: this.state.sessionId,
      customer_id: this.state.customerId,
      subscription_type: this.state.subscriptionType,
      email: this.elements['email'].value,
      firstName: this.elements['firstName'].value,
      lastName: this.elements['lastName'].value,
      phone: this.state.formData['phone'] || this.elements['phone'].value.replace(/\D/g, '')
    });

    return `${this.config.urls.successRedirect}?${params.toString()}`;
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
        const phoneValidation = this.validatePhoneNumber(value);
        if (!phoneValidation.isValid) {
          this.showFieldError(fieldName, phoneValidation.message);
          return false;
        }
        this.state.formData[fieldName] = phoneValidation.cleanPhone;
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
   * Get field label for error messages
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
    
    // Clear/show password error based on validation
    if (password.length > 0) {
      if (validCount >= 3) {
        this.clearFieldError('password');
        this.markFieldSuccess('password');
      } else {
        this.showFieldError('password', 'Password must meet at least 3 of the 4 requirements');
      }
    } else {
      this.clearFieldError('password');
    }
    
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
   * Update payment element with client secret for processing
   */
  async updatePaymentElementWithSecret(clientSecret) {
    const paymentElementDiv = document.getElementById('payment-element');
    if (!paymentElementDiv) {
      throw new Error('Payment element container not found');
    }

    try {
      // Unmount existing payment element
      if (this.paymentElement) {
        this.paymentElement.unmount();
      }

      // Create new Stripe elements instance with the client secret
      this.stripeElements = this.stripe.elements({
        clientSecret: clientSecret,
        appearance: { 
          theme: 'stripe',
          variables: {
            colorPrimary: '#1e40af',
          }
        }
      });

      // Create and mount the payment element with client secret
      this.paymentElement = this.stripeElements.create('payment', {
        fields: {
          billingDetails: {
            address: 'never', // We collect address separately
          }
        }
      });

      this.paymentElement.mount('#payment-element');
    } catch (error) {
      console.error('Failed to update payment element with secret:', error);
      throw new Error('Failed to prepare payment form');
    }
  }

  /**
   * Confirm payment with Stripe
   */
  async confirmPayment(clientSecret) {
    // Determine if this is a SetupIntent or PaymentIntent based on the prefix
    const isSetupIntent = clientSecret.startsWith('seti_');
    
    // Prepare billing details
    const billingDetails = {
      name: `${this.elements['firstName'].value.trim()} ${this.elements['lastName'].value.trim()}`,
      email: this.elements['email'].value.trim(),
      phone: this.state.formData['phone'] || this.elements['phone'].value.replace(/\D/g, '')
    };

    let result;
    
    try {
      if (isSetupIntent) {
        // For trial subscriptions (SetupIntent)
        result = await this.stripe.confirmSetup({
          elements: this.stripeElements,
          confirmParams: {
            return_url: this.buildReturnUrl(),
            payment_method_data: {
              billing_details: billingDetails
            }
          },
          redirect: 'if_required'
        });
      } else {
        // For paid subscriptions (PaymentIntent)
        result = await this.stripe.confirmPayment({
          elements: this.stripeElements,
          confirmParams: {
            return_url: this.buildReturnUrl(),
            payment_method_data: {
              billing_details: billingDetails
            }
          },
          redirect: 'if_required'
        });
      }

      // Handle payment errors with specific messages
      if (result.error) {
        this.handlePaymentError(result.error);
        return { error: result.error };
      }

      // Success - redirect if not already redirecting
      if (!result.error && result.setupIntent?.status === 'succeeded' || result.paymentIntent?.status === 'succeeded') {
        window.location.href = this.buildReturnUrl();
      }

      return result;
    } catch (error) {
      console.error('Payment confirmation error:', error);
      this.showError('An unexpected error occurred during payment processing. Please try again.');
      return { error: { message: error.message } };
    }
  }

  /**
   * Handle specific payment errors with user-friendly messages
   */
  handlePaymentError(error) {
    let userMessage = '';
    
    switch (error.code) {
      case 'card_declined':
        if (error.decline_code === 'insufficient_funds') {
          userMessage = 'Your card was declined due to insufficient funds. Please try a different payment method.';
        } else if (error.decline_code === 'lost_card' || error.decline_code === 'stolen_card') {
          userMessage = 'Your card was declined. Please contact your bank or try a different payment method.';
        } else if (error.decline_code === 'expired_card') {
          userMessage = 'Your card has expired. Please use a different payment method.';
        } else if (error.decline_code === 'incorrect_cvc') {
          userMessage = 'The security code (CVC) you entered is incorrect. Please check and try again.';
        } else if (error.decline_code === 'incorrect_number') {
          userMessage = 'The card number you entered is incorrect. Please check and try again.';
        } else {
          userMessage = 'Your card was declined. Please try a different payment method or contact your bank.';
        }
        break;
        
      case 'incorrect_number':
        userMessage = 'The card number you entered is incorrect. Please check the number and try again.';
        break;
        
      case 'invalid_number':
        userMessage = 'The card number you entered is not valid. Please check the number and try again.';
        break;
        
      case 'invalid_expiry_month':
      case 'invalid_expiry_year':
        userMessage = 'The expiration date you entered is invalid. Please check and try again.';
        break;
        
      case 'invalid_cvc':
        userMessage = 'The security code (CVC) you entered is invalid. Please check and try again.';
        break;
        
      case 'expired_card':
        userMessage = 'Your card has expired. Please use a different payment method.';
        break;
        
      case 'incorrect_cvc':
        userMessage = 'The security code (CVC) you entered is incorrect. Please check and try again.';
        break;
        
      case 'processing_error':
        userMessage = 'An error occurred while processing your payment. Please try again.';
        break;
        
      case 'rate_limit':
        userMessage = 'Too many payment attempts. Please wait a moment and try again.';
        break;
        
      case 'authentication_required':
        userMessage = 'Your bank requires additional authentication. Please complete the verification and try again.';
        break;
        
      case 'payment_intent_authentication_failure':
        userMessage = 'Payment authentication failed. Please try again or use a different payment method.';
        break;
        
      default:
        // Use the original error message from Stripe as fallback
        userMessage = error.message || 'An error occurred while processing your payment. Please try again.';
        break;
    }
    
    // Show the error to the user in the payment area
    this.showFieldError('payment', userMessage);
    
    // Also show a general error message for visibility
    this.showError(userMessage);
    
    // Track the specific error for analytics
    if (this.analytics) {
      this.analytics.trackError(error, { 
        context: 'payment_confirmation',
        error_code: error.code,
        decline_code: error.decline_code 
      });
    }
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
   * Format phone number as user types
   */
  formatPhoneNumber(event) {
    const input = event.target;
    const value = input.value.replace(/\D/g, ''); // Remove all non-digits
    
    let formattedValue = '';
    
    if (value.length >= 6) {
      formattedValue = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
    } else if (value.length >= 3) {
      formattedValue = `(${value.slice(0, 3)}) ${value.slice(3)}`;
    } else if (value.length > 0) {
      formattedValue = `(${value}`;
    }
    
    input.value = formattedValue;
  }

  /**
   * Validate phone number
   */
  validatePhoneNumber(phone) {
    // Remove all non-digits
    const cleanPhone = phone.replace(/\D/g, '');
    
    // US phone number should be exactly 10 digits
    if (cleanPhone.length !== 10) {
      return {
        isValid: false,
        message: 'Please enter a valid 10-digit US phone number'
      };
    }
    
    // Check if it starts with 1 (country code) and remove it
    const phoneToValidate = cleanPhone.startsWith('1') && cleanPhone.length === 11 
      ? cleanPhone.slice(1) 
      : cleanPhone;
    
    if (phoneToValidate.length !== 10) {
      return {
        isValid: false,
        message: 'Please enter a valid 10-digit US phone number'
      };
    }
    
    // Check for invalid patterns
    const areaCode = phoneToValidate.slice(0, 3);
    const exchange = phoneToValidate.slice(3, 6);
    
    // Area code cannot start with 0 or 1
    if (areaCode.startsWith('0') || areaCode.startsWith('1')) {
      return {
        isValid: false,
        message: 'Please enter a valid US phone number'
      };
    }
    
    // Exchange cannot start with 0 or 1
    if (exchange.startsWith('0') || exchange.startsWith('1')) {
      return {
        isValid: false,
        message: 'Please enter a valid US phone number'
      };
    }
    
    return {
      isValid: true,
      cleanPhone: phoneToValidate
    };
  }

  /**
   * Check if form is ready for submission
   */
  checkFormReady() {
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'password'];
    const fieldValues = {};
    const hasAllFields = requiredFields.every(field => {
      const hasValue = this.elements[field] && this.elements[field].value.trim();
      fieldValues[field] = hasValue ? this.elements[field].value.trim() : 'MISSING';
      return hasValue;
    });
    const hasValidPassword = this.isValidPassword();
    const hasAcceptedTerms = this.elements['terms'] && this.elements['terms'].checked;

    const isReady = hasAllFields && hasValidPassword && hasAcceptedTerms;
    
    // Debug logging
    console.log('CheckFormReady Debug:', {
      hasAllFields,
      fieldValues,
      hasValidPassword,
      passwordStrength: this.state.passwordStrength,
      hasAcceptedTerms,
      isReady,
      submitButton: this.elements['submit'] ? 'exists' : 'missing'
    });
    
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
    const fields = ['firstName', 'lastName', 'email'];
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
    ['firstName', 'lastName', 'email'].forEach(field => {
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