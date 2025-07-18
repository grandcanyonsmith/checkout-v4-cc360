/**
 * Course Creator 360 Checkout Application
 * Production-ready checkout flow with enhanced security and performance
 */

class CheckoutApp {
  constructor() {
    // Use global configuration
    this.config = window.AppConfig || {
      stripe: { publishableKey: '' },
      urls: { successRedirect: '' },
      ui: { debounceDelay: 300, passwordMinLength: 8 },
      validation: {
        emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        phoneRegex: /^[\+]?[1-9][\d]{0,15}$/
      },
      pricing: {
        monthly: {
          priceId: "price_1Rm28YBnnqL8bKFQEnVUozqo",
          amount: 14700, // $147.00 in cents
          currency: "usd",
          interval: "month",
          hasTrial: true,
          trialDays: 30
        },
        annual: {
          priceId: "price_1QPF6eBnnqL8bKFQNV3JFSVh",
          amount: 147000,
          currency: "usd",
          interval: "year",
          hasTrial: false,
          trialDays: 0
        }
      }
    };
    
    // Initialize logger
    this.logger = new (window.ClientLogger || class { 
      error() {} 
      warn() {} 
      info() {} 
      debug() {} 
    })('CheckoutApp');

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

    // Initialize validators
    this.emailValidator = new EmailValidator();
    this.phoneValidator = new PhoneValidator();
    
    // Identity verification state
    this.identityVerification = {
      isRequired: false,
      isVerified: false,
      phoneNumber: null
    };

    // Initialize the application
    this.init();
  }

  /**
   * Initialize the application
   */
  async init() {
    try {
      await this.setupDOM();
      await this.setupEventListeners();
      await this.determineSubscriptionType();
      await this.updatePricingDisplay();
      await this.initializeStripe();
      await this.prefillForm();
      this.hideLoading();
      this.setupFormAutoSave();
    } catch (error) {
      console.error('Initialization error:', error);
      this.showError('Failed to initialize the checkout. Please refresh the page.');
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
    const config = window.RouteConfig ? window.RouteConfig.getRouteConfig(path) : null;
    
    if (config) {
      this.state.subscriptionType = config.subscriptionType;
      this.state.routeConfig = config;
    } else {
      // Default to monthly if no specific path
      this.state.subscriptionType = 'monthly';
    }
  }

  /**
   * Update pricing display based on subscription type
   */
  updatePricingDisplay() {
    const pricing = this.config.pricing[this.state.subscriptionType];
    const config = this.state.routeConfig;
    const isAnnual = this.state.subscriptionType === 'annual';
    const isMonthly = this.state.subscriptionType === 'monthly';

    // Update plan title and pricing using route config
    if (config) {
      this.elements['plan-title'].textContent = config.planTitle;
      this.elements['plan-price'].textContent = config.planPrice;
      this.elements['trial-period'].textContent = config.hasTrial ? `${config.trialDays} days free` : 'No trial';
      this.elements['after-trial'].textContent = isAnnual ? `$${config.annualPrice}/year` : `$${config.monthlyPrice}/mo after`;
      this.elements['trial-text'].textContent = config.trialText;
      this.elements['button-text'].textContent = config.buttonText;
    } else {
      // Fallback to default values
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
    }

    // Update pricing details
    const monthlyAmount = isAnnual ? pricing.amount / 12 : pricing.amount;
    const annualAmount = isAnnual ? pricing.amount : pricing.amount * 12;
    
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
      currency: 'USD'
    }).format(amountInCents / 100);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Form submission
    this.elements['payment-form'].addEventListener('submit', this.handleSubmit.bind(this));

    // Password toggle
    this.elements['togglePassword'].addEventListener('click', this.togglePassword.bind(this));

    // Password validation with post-validation trigger
    this.elements['password'].addEventListener('input', this.debounce(this.validatePassword.bind(this), this.config.ui.debounceDelay));
    this.elements['password'].addEventListener('blur', () => {
      // After password validation, trigger email and phone validation
      if (this.isValidPassword()) {
        this.validateEmailAndPhoneAfterPassword();
      }
    });

    // Form field validation
    ['firstName', 'lastName', 'email', 'phone'].forEach(field => {
      this.elements[field].addEventListener('input', this.debounce(() => this.validateField(field), this.config.ui.debounceDelay));
      this.elements[field].addEventListener('blur', () => this.validateField(field));
    });

    // Terms checkbox
    this.elements['terms'].addEventListener('change', this.checkFormReady.bind(this));

    // Error modal
    this.elements['close-error'].addEventListener('click', this.hideError.bind(this));

    // Keyboard navigation
    document.addEventListener('keydown', this.handleKeyboard.bind(this));

    // Form auto-save
    this.setupFormAutoSave();
  }

  /**
   * Initialize Stripe
   */
  async initializeStripe() {
    try {
      const stripe = await this.loadStripe();
      this.stripe = stripe;
      
      // We'll create the payment element when the user starts entering payment details
      // For now, just show a placeholder
      const paymentElementDiv = document.getElementById('payment-element');
      if (paymentElementDiv) {
        paymentElementDiv.innerHTML = '<div class="text-sm text-gray-500">Payment details will be collected after entering your information</div>';
      }

    } catch (error) {
      console.error('Stripe initialization error:', error);
      this.showError('Payment system is temporarily unavailable. Please try again later.');
    }
  }

  /**
   * Load Stripe library
   */
  loadStripe() {
    return new Promise((resolve) => {
      if (window.Stripe) {
        resolve(Stripe(this.config.stripe.publishableKey));
      } else {
        window.addEventListener('load', () => resolve(Stripe(this.config.stripe.publishableKey)));
      }
    });
  }

  /**
   * Create payment intent
   */
  async createPaymentIntent() {
    const pricing = this.config.pricing[this.state.subscriptionType];
    
    // For monthly with trial, we don't charge anything initially
    // For annual, we charge the full amount
    const amount = pricing.hasTrial ? 0 : pricing.amount;

    const response = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount,
        currency: pricing.currency,
        subscription_type: this.state.subscriptionType,
        price_id: pricing.priceId,
        // Remove customer_id and subscription_id - these will be created after payment
        email: this.elements['email'].value.trim(),
        name: `${this.elements['firstName'].value.trim()} ${this.elements['lastName'].value.trim()}`,
        phone: this.elements['phone'].value.trim()
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      if (data.error === 'Customer already has an active subscription') {
        throw new Error('You already have an active subscription. Please contact support if you need to make changes to your account.');
      } else if (data.error === 'Customer has a pending subscription that needs to be completed first') {
        throw new Error('You have a pending subscription that needs to be completed. Please check your email for payment instructions or contact support.');
      } else {
        throw new Error(data.error || `Failed to create payment intent: ${response.status}`);
      }
    }
    
    // Store the customer_id from the response
    if (data.customer_id) {
      this.state.customerId = data.customer_id;
    }
    
    return data.client_secret;
  }

  /**
   * Create payment element with client secret
   */
  async createPaymentElement(clientSecret) {
    const paymentElementDiv = document.getElementById('payment-element');
    if (!paymentElementDiv) {
      throw new Error('Payment element container not found');
    }

    // Clear any previous content
    paymentElementDiv.innerHTML = '';

    // Create Stripe elements instance with the client secret (store in different variable to avoid conflict)
    this.stripeElements = this.stripe.elements({
      clientSecret: clientSecret,
      appearance: { 
        theme: 'stripe' 
      }
    });

    // Create and mount the payment element
    this.paymentElement = this.stripeElements.create('payment', {
      fields: {
        billingDetails: {
          address: 'never', // We collect address separately
        }
      },
      paymentMethodOrder: ['card'], // Only allow cards, no other payment methods
      terms: {
        card: 'never' // Don't show card terms
      }
    });

    this.paymentElement.mount('#payment-element');
  }

  /**
   * Prefill form with query parameters
   */
  prefillForm() {
    // Load auto-saved data first
    this.loadAutoSavedData();
    
    // Then override with URL parameters
    const qs = new URLSearchParams(location.search);
    const fields = ['firstName', 'lastName', 'email', 'phone'];

    fields.forEach(field => {
      const value = qs.get(field);
      if (value && this.elements[field]) {
        this.elements[field].value = value;
        this.state.formData[field] = value;
      }
    });

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

      // Ensure Stripe is initialized
      if (!this.stripe) {
        throw new Error('Stripe not initialized');
      }

      // Create payment intent first (without creating subscription)
      const clientSecret = await this.createPaymentIntent();
      
      // Create payment element with the client secret
      await this.createPaymentElement(clientSecret);

      // Confirm payment
      const paymentResult = await this.confirmPayment(clientSecret);

      // Only create customer and subscription AFTER successful payment
      if (paymentResult.success) {
        await this.createCustomerAndSubscription();
        
        // Redirect to success page
        window.location.href = this.buildReturnUrl();
      } else {
        throw new Error('Payment failed');
      }

    } catch (error) {
      console.error('Submission error:', error);
      this.showError('An error occurred while processing your request. Please try again.');
      this.setSubmitting(false);
    }
  }

  /**
   * Create customer and subscription
   */
  async createCustomerAndSubscription() {
    const pricing = this.config.pricing[this.state.subscriptionType];
    const config = this.state.routeConfig;
    
    const response = await fetch('/api/create-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: this.elements['email'].value.trim(),
        name: `${this.elements['firstName'].value.trim()} ${this.elements['lastName'].value.trim()}`,
        phone: this.elements['phone'].value.trim(),
        subscriptionType: this.state.subscriptionType,
        priceId: config ? config.priceId : pricing.priceId,
        customerId: this.state.customerId // Pass the customer ID from payment intent
      })
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.error === 'Customer already has an active subscription') {
        throw new Error('You already have an active subscription. Please contact support if you need to make changes to your account.');
      } else if (data.error === 'Customer has a pending subscription that needs to be completed first') {
        throw new Error('You have a pending subscription that needs to be completed. Please check your email for payment instructions or contact support.');
      } else {
        throw new Error(data.error || 'Failed to create subscription');
      }
    }

    this.state.customerId = data.customerId;
    this.state.sessionId = data.subscriptionId;
  }

  /**
   * Validate all form fields
   */
  async validateAllFields() {
    const fields = ['firstName', 'lastName', 'email', 'phone', 'password'];
    let isValid = true;

    for (const field of fields) {
      const fieldValid = await this.validateField(field);
      if (!fieldValid) isValid = false;
    }

    // Check terms
    if (!this.elements['terms'].checked) {
      this.showFieldError('terms', 'You must agree to the terms and conditions');
      isValid = false;
    } else {
      this.clearFieldError('terms');
    }

    return isValid;
  }

  /**
   * Validate individual field
   */
  async validateField(fieldName) {
    const field = this.elements[fieldName];
    const value = field.value.trim();
    
    this.state.formData[fieldName] = value;

    // Clear previous error
    this.clearFieldError(fieldName);

    // Required field validation
    if (!value) {
      this.showFieldError(fieldName, `${this.getFieldLabel(fieldName)} is required`);
      // Clear visual indicator for empty fields
      this.clearFieldIndicator(fieldName);
      return false;
    }

    // Field-specific validation
    switch (fieldName) {
      case 'email':
        // Use enhanced email validator
        const validationResult = await this.emailValidator.validateWithAPI(value);
        const formatted = this.emailValidator.formatResult(validationResult);
        
        if (formatted.type === 'error') {
          this.showFieldError(fieldName, formatted.message);
          this.showFieldIndicator(fieldName, false);
          return false;
        } else if (formatted.type === 'warning') {
          this.showFieldError(fieldName, formatted.message, 'warning');
          this.showFieldIndicator(fieldName, false);
        } else if (formatted.type === 'info' && formatted.suggestion) {
          this.showFieldError(fieldName, `${formatted.message} <button type="button" class="ml-1 text-blue-700 underline text-xs" onclick="document.getElementById('email').value = '${formatted.suggestion}'; document.getElementById('email').dispatchEvent(new Event('input'));">Use suggestion</button>`, 'info');
          this.showFieldIndicator(fieldName, false);
        } else {
          this.clearFieldError(fieldName);
          this.showFieldIndicator(fieldName, true);
        }
        break;

      case 'phone':
        // Use enhanced phone validator with Twilio API
        const firstName = this.elements['firstName']?.value?.trim() || '';
        const lastName = this.elements['lastName']?.value?.trim() || '';
        const phoneValidationResult = await this.phoneValidator.validateWithAPI(value, {
          firstName,
          lastName
        });
        const phoneFormatted = this.phoneValidator.formatResult(phoneValidationResult);
        
        // Store phone number for identity verification
        this.identityVerification.phoneNumber = value;
        
        if (phoneFormatted.type === 'error') {
          this.showFieldError(fieldName, phoneFormatted.message);
          this.showFieldIndicator(fieldName, false);
          
          // Check if identity verification is required
          if (phoneValidationResult.requiresVerification && !this.identityVerification.isVerified) {
            this.showIdentityVerificationModal();
          }
          return false;
        } else if (phoneFormatted.type === 'warning') {
          this.showFieldError(fieldName, phoneFormatted.message, 'warning');
          this.showFieldIndicator(fieldName, false);
        } else {
          this.clearFieldError(fieldName);
          this.showFieldIndicator(fieldName, true);
        }
        break;

      case 'firstName':
      case 'lastName':
        if (value.length < 2) {
          this.showFieldError(fieldName, `${this.getFieldLabel(fieldName)} must be at least 2 characters`);
          return false;
        }
        if (!/^[a-zA-Z\s'-]+$/.test(value)) {
          this.showFieldError(fieldName, `${this.getFieldLabel(fieldName)} can only contain letters, spaces, hyphens, and apostrophes`);
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
    const reqs = this.elements.reqs;

    // Show/hide requirements box
    this.elements['pw-req'].classList.toggle('hidden', password.length === 0);

    if (password.length === 0) {
      this.clearFieldError('password');
      return false;
    }

    const checks = {
      len: password.length >= this.config.ui.passwordMinLength,
      low: /[a-z]/.test(password),
      up: /[A-Z]/.test(password),
      num: /\d/.test(password),
      sym: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    // Update requirement indicators
    Object.keys(checks).forEach(key => {
      this.setRequirementIcon(reqs[key], checks[key]);
    });

    // Calculate password strength
    const score = Object.values(checks).filter(Boolean).length;
    this.state.passwordStrength = score;

    // Validate password meets minimum requirements
    if (password.length < this.config.ui.passwordMinLength) {
      this.showFieldError('password', 'Password must be at least 8 characters long');
      return false;
    }

    if (score < 3) {
      this.showFieldError('password', 'Password must meet at least 3 of the 4 requirements');
      return false;
    }

    this.clearFieldError('password');
    this.markFieldSuccess('password');
    return true;
  }

  /**
   * Validate email and phone after password completion
   */
  async validateEmailAndPhoneAfterPassword() {
    // Validate email with visual indicator
    const emailValid = await this.validateFieldWithIndicator('email');
    
    // Validate phone with visual indicator
    const phoneValid = await this.validateFieldWithIndicator('phone');
    
    return emailValid && phoneValid;
  }

  /**
   * Validate field with visual indicator
   */
  async validateFieldWithIndicator(fieldName) {
    const field = this.elements[fieldName];
    const value = field.value.trim();
    
    // Clear previous visual indicators
    this.clearFieldIndicator(fieldName);
    
    // If field is empty, don't show any indicator
    if (!value) {
      return false;
    }
    
    let isValid = false;
    
    // Field-specific validation
    switch (fieldName) {
      case 'email':
        // Use enhanced email validator with Mailgun API
        const emailValidationResult = await this.emailValidator.validateWithAPI(value);
        const emailFormatted = this.emailValidator.formatResult(emailValidationResult);
        isValid = emailFormatted.type !== 'error';
        break;
        
      case 'phone':
        // Use enhanced phone validator with Twilio API
        const firstName = this.elements['firstName']?.value?.trim() || '';
        const lastName = this.elements['lastName']?.value?.trim() || '';
        const phoneValidationResult = await this.phoneValidator.validateWithAPI(value, {
          firstName,
          lastName
        });
        const phoneFormatted = this.phoneValidator.formatResult(phoneValidationResult);
        isValid = phoneFormatted.type !== 'error';
        break;
    }
    
    // Show visual indicator
    this.showFieldIndicator(fieldName, isValid);
    
    return isValid;
  }

  /**
   * Show field validation indicator
   */
  showFieldIndicator(fieldName, isValid) {
    const checkIcon = document.getElementById(`${fieldName}-check`);
    const xIcon = document.getElementById(`${fieldName}-x`);
    
    if (checkIcon && xIcon) {
      if (isValid) {
        checkIcon.classList.remove('hidden');
        xIcon.classList.add('hidden');
      } else {
        checkIcon.classList.add('hidden');
        xIcon.classList.remove('hidden');
      }
    }
  }

    /**
   * Clear field validation indicator
   */
  clearFieldIndicator(fieldName) {
    const checkIcon = document.getElementById(`${fieldName}-check`);
    const xIcon = document.getElementById(`${fieldName}-x`);

    if (checkIcon && xIcon) {
      checkIcon.classList.add('hidden');
      xIcon.classList.add('hidden');
    }
  }

  /**
   * Show identity verification modal
   */
  showIdentityVerificationModal() {
    console.log('showIdentityVerificationModal called');
    const modal = document.getElementById('identity-verification-modal');
    if (modal) {
      console.log('Modal found, removing hidden class');
      modal.classList.remove('hidden');
      this.setupIdentityVerificationListeners();
    } else {
      console.error('Identity verification modal not found');
    }
  }

  /**
   * Hide identity verification modal
   */
  hideIdentityVerificationModal() {
    const modal = document.getElementById('identity-verification-modal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  /**
   * Setup identity verification event listeners
   */
  setupIdentityVerificationListeners() {
    const sendButton = document.getElementById('send-verification-code');
    const verifyButton = document.getElementById('verify-code');
    const closeButton = document.getElementById('close-verification-modal');
    const codeInput = document.getElementById('verification-code');

    if (sendButton) {
      sendButton.addEventListener('click', () => this.sendVerificationCode());
    }

    if (verifyButton) {
      verifyButton.addEventListener('click', () => this.verifyCode());
    }

    if (closeButton) {
      closeButton.addEventListener('click', () => this.hideIdentityVerificationModal());
    }

    if (codeInput) {
      codeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.verifyCode();
        }
      });
    }
  }

  /**
   * Send verification code via SMS
   */
  async sendVerificationCode() {
    if (!this.identityVerification.phoneNumber) {
      this.showVerificationStatus('Please enter a valid phone number first.', 'error');
      return;
    }

    try {
      const response = await fetch('/api/verify-identity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: this.identityVerification.phoneNumber,
          action: 'send'
        })
      });

      const data = await response.json();

      if (data.success) {
        this.showVerificationStatus('Verification code sent to your phone!', 'success');
        document.getElementById('send-verification-code').disabled = true;
        document.getElementById('send-verification-code').textContent = 'Code Sent';
      } else {
        this.showVerificationStatus(data.error || 'Failed to send verification code.', 'error');
      }
    } catch (error) {
      console.error('Error sending verification code:', error);
      this.showVerificationStatus('Failed to send verification code. Please try again.', 'error');
    }
  }

  /**
   * Verify the entered code
   */
  async verifyCode() {
    const codeInput = document.getElementById('verification-code');
    const code = codeInput?.value?.trim();

    if (!code) {
      this.showVerificationStatus('Please enter the verification code.', 'error');
      return;
    }

    if (!this.identityVerification.phoneNumber) {
      this.showVerificationStatus('Phone number not found.', 'error');
      return;
    }

    try {
      const response = await fetch('/api/verify-identity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: this.identityVerification.phoneNumber,
          action: 'check',
          code: code
        })
      });

      const data = await response.json();

      if (data.success && data.valid) {
        this.showVerificationStatus('Identity verified successfully!', 'success');
        this.identityVerification.isVerified = true;
        
        // Update phone field to show verified status
        this.showFieldIndicator('phone', true);
        this.clearFieldError('phone');
        
        // Close modal after a short delay
        setTimeout(() => {
          this.hideIdentityVerificationModal();
        }, 2000);
      } else {
        this.showVerificationStatus(data.message || 'Invalid verification code.', 'error');
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      this.showVerificationStatus('Failed to verify code. Please try again.', 'error');
    }
  }

  /**
   * Show verification status message
   */
  showVerificationStatus(message, type = 'info') {
    const statusDiv = document.getElementById('verification-status');
    const messageP = document.getElementById('verification-message');

    if (statusDiv && messageP) {
      statusDiv.classList.remove('hidden');
      statusDiv.className = `mb-4 p-3 rounded-md ${type === 'success' ? 'bg-green-100 text-green-700' : type === 'error' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`;
      messageP.textContent = message;
    }
  }

  /**
   * Set requirement icon state
   */
  setRequirementIcon(element, isValid) {
    const xIcon = element.querySelector('.x-icon');
    const vIcon = element.querySelector('.v-icon');

    xIcon.classList.toggle('hidden', isValid);
    vIcon.classList.toggle('hidden', !isValid);
    element.classList.toggle('text-green-600', isValid);
    element.classList.toggle('text-red-600', !isValid);
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
      phone: this.elements['phone'].value.trim()
    };

    let result;
    
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

    if (result.error) {
      throw new Error(result.error.message);
    }

    // Check if payment method is prepaid and reject it
    if (result.paymentIntent && result.paymentIntent.payment_method) {
      const paymentMethod = await this.stripe.paymentMethods.retrieve(result.paymentIntent.payment_method);
      
      if (paymentMethod.card && paymentMethod.card.funding === 'prepaid') {
        throw new Error('Prepaid cards are not accepted for subscriptions. Please use a credit or debit card.');
      }
    }

    // Check if setup intent payment method is prepaid
    if (result.setupIntent && result.setupIntent.payment_method) {
      const paymentMethod = await this.stripe.paymentMethods.retrieve(result.setupIntent.payment_method);
      
      if (paymentMethod.card && paymentMethod.card.funding === 'prepaid') {
        throw new Error('Prepaid cards are not accepted for subscriptions. Please use a credit or debit card.');
      }
    }
    
    // Return success result - don't redirect here, let the calling code handle it
    return {
      success: true,
      result: result
    };
  }

  /**
   * Build return URL with parameters
   */
  buildReturnUrl() {
    const params = new URLSearchParams({
      session_id: this.state.sessionId,
      customer_id: this.state.customerId,
      subscription_type: this.state.subscriptionType,
      phone: this.elements['phone'].value,
      email: this.elements['email'].value,
      firstName: this.elements['firstName'].value,
      lastName: this.elements['lastName'].value
    });

    return `${this.config.urls.successRedirect}?${params.toString()}`;
  }

  /**
   * Toggle password visibility
   */
  togglePassword() {
    const password = this.elements['password'];
    const eye = this.elements['eye'];
    const eyeOff = this.elements['eyeOff'];

    const isPassword = password.type === 'password';
    password.type = isPassword ? 'text' : 'password';
    eye.classList.toggle('hidden', !isPassword);
    eyeOff.classList.toggle('hidden', isPassword);
  }

  /**
   * Check if form is ready for submission
   */
  checkFormReady() {
    const isReady = (
      this.elements['firstName'].value.trim() &&
      this.elements['lastName'].value.trim() &&
      this.elements['email'].value.trim() &&
      this.elements['phone'].value.trim() &&
      this.isValidPassword() &&
      this.elements['terms'].checked
    );

    this.elements['submit'].disabled = !isReady;
  }

  /**
   * Check if password is valid
   */
  isValidPassword() {
    const password = this.elements['password'].value;
    if (password.length < this.config.ui.passwordMinLength) return false;
    
    const score = [
      /[a-z]/, /[A-Z]/, /\d/, /[!@#$%^&*(),.?":{}|<>]/
    ].filter(rx => rx.test(password)).length;
    
    return score >= 3;
  }

  /**
   * Set submitting state
   */
  setSubmitting(submitting) {
    this.state.isSubmitting = submitting;
    this.elements['submit'].disabled = submitting;
    this.elements['spinner'].classList.toggle('hidden', !submitting);
    this.elements['button-text'].classList.toggle('hidden', submitting);
  }

  /**
   * Show field error
   */
  showFieldError(fieldName, message, type = 'error') {
    const errorElement = document.getElementById(`${fieldName}-error`);
    if (errorElement) {
      // Allow HTML for suggestions
      errorElement.innerHTML = message;
      errorElement.classList.add('animate-slide-in-up');
      
      // Apply appropriate styling based on type
      errorElement.classList.remove('text-red-600', 'text-orange-600', 'text-blue-600');
      switch(type) {
        case 'warning':
          errorElement.classList.add('text-orange-600');
          break;
        case 'info':
          errorElement.classList.add('text-blue-600');
          break;
        default:
          errorElement.classList.add('text-red-600');
      }
    }

    const field = this.elements[fieldName];
    if (field && type === 'error') {
      field.classList.add('error');
      field.classList.remove('success');
      field.parentElement.classList.add('has-error');
      field.parentElement.classList.remove('has-success');
      this.state.errors[fieldName] = message;
    } else if (field && type !== 'error') {
      // For warnings/info, don't mark as error but remove success
      field.classList.remove('error', 'success');
      field.parentElement.classList.remove('has-error', 'has-success');
      // Don't store warnings/info as errors
      delete this.state.errors[fieldName];
    }
  }

  /**
   * Clear field error
   */
  clearFieldError(fieldName) {
    const errorElement = document.getElementById(`${fieldName}-error`);
    if (errorElement) {
      errorElement.textContent = '';
    }

    const field = this.elements[fieldName];
    if (field) {
      field.classList.remove('error');
      field.parentElement.classList.remove('has-error');
    }

    delete this.state.errors[fieldName];
    
    // Clear visual indicators for email and phone fields
    if (fieldName === 'email' || fieldName === 'phone') {
      this.clearFieldIndicator(fieldName);
    }
  }

  /**
   * Mark field as successful
   */
  markFieldSuccess(fieldName) {
    const field = this.elements[fieldName];
    if (field) {
      field.classList.add('success');
      field.classList.remove('error');
      field.parentElement.classList.add('has-success');
      field.parentElement.classList.remove('has-error');
    }
  }

  /**
   * Show error modal
   */
  showError(message) {
    this.elements['error-message'].textContent = message;
    this.elements['error-modal'].classList.remove('hidden');
    this.elements['error-modal'].classList.add('animate-fade-in');
  }

  /**
   * Hide error modal
   */
  hideError() {
    this.elements['error-modal'].classList.add('hidden');
  }

  /**
   * Show success notification
   */
  showSuccess(message) {
    this.elements['success-message'].textContent = message;
    this.elements['success-notification'].classList.remove('hidden');
    this.elements['success-notification'].classList.add('animate-slide-in-down');

    setTimeout(() => {
      this.elements['success-notification'].classList.add('hide');
      setTimeout(() => {
        this.elements['success-notification'].classList.add('hidden');
        this.elements['success-notification'].classList.remove('hide');
      }, 300);
    }, 3000);
  }

  /**
   * Hide loading overlay
   */
  hideLoading() {
    this.state.isLoading = false;
    this.elements['loading-overlay'].style.opacity = '0';
    setTimeout(() => {
      this.elements['loading-overlay'].style.display = 'none';
    }, 300);
  }

  /**
   * Handle keyboard navigation
   */
  handleKeyboard(event) {
    // Escape key to close modals
    if (event.key === 'Escape') {
      this.hideError();
    }

    // Enter key to submit form (if not in textarea)
    if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
      if (this.elements['submit'] && !this.elements['submit'].disabled) {
        this.elements['payment-form'].requestSubmit();
      }
    }
  }

  /**
   * Setup form auto-save
   */
  setupFormAutoSave() {
    const autoSaveFields = ['firstName', 'lastName', 'email', 'phone'];
    
    autoSaveFields.forEach(field => {
      this.elements[field].addEventListener('input', this.debounce(() => {
        this.autoSaveForm();
      }, 1000));
    });
  }

  /**
   * Auto-save form data
   */
  autoSaveForm() {
    try {
      const formData = {
        firstName: this.elements['firstName'].value,
        lastName: this.elements['lastName'].value,
        email: this.elements['email'].value,
        phone: this.elements['phone'].value
      };

      localStorage.setItem('cc360_checkout_data', JSON.stringify(formData));
    } catch (error) {
      console.warn('Auto-save failed:', error);
    }
  }

  /**
   * Load auto-saved form data
   */
  loadAutoSavedData() {
    try {
      const saved = localStorage.getItem('cc360_checkout_data');
      if (saved) {
        const data = JSON.parse(saved);
        Object.keys(data).forEach(key => {
          if (this.elements[key] && data[key]) {
            this.elements[key].value = data[key];
            this.state.formData[key] = data[key];
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load auto-saved data:', error);
    }
  }

  /**
   * Clear auto-saved data
   */
  clearAutoSavedData() {
    try {
      localStorage.removeItem('cc360_checkout_data');
    } catch (error) {
      console.warn('Failed to clear auto-saved data:', error);
    }
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

  /**
   * Sanitize input
   */
  sanitizeInput(input) {
    return input.replace(/[<>]/g, '');
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    return this.config.validation.emailRegex.test(email);
  }

  /**
   * Format phone number
   */
  formatPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
  }
}

// Analytics and tracking
class Analytics {
  static trackEvent(eventName, properties = {}) {
    try {
      // Facebook Pixel
      if (window.fbq) {
        fbq('track', eventName, properties);
      }

      // Google Analytics
      if (window.gtag) {
        gtag('event', eventName, properties);
      }

      // Custom tracking
      console.log('Analytics Event:', eventName, properties);
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }

  static trackFormStart() {
    this.trackEvent('InitiateCheckout', {
      content_name: 'Course Creator 360 Checkout',
      content_category: 'Subscription',
      value: 147.00,
      currency: 'USD'
    });
  }

  static trackFormComplete() {
    this.trackEvent('CompleteRegistration', {
      content_name: 'Course Creator 360 Checkout',
      content_category: 'Subscription',
      value: 147.00,
      currency: 'USD'
    });
  }
}

// Performance monitoring
class PerformanceMonitor {
  static mark(name) {
    if (window.performance && window.performance.mark) {
      window.performance.mark(name);
    }
  }

  static measure(name, startMark, endMark) {
    if (window.performance && window.performance.measure) {
      try {
        window.performance.measure(name, startMark, endMark);
        const measure = window.performance.getEntriesByName(name)[0];
        console.log(`${name}: ${measure.duration.toFixed(2)}ms`);
      } catch (error) {
        console.warn('Performance measurement failed:', error);
      }
    }
  }
}

// Error reporting
class ErrorReporter {
  static captureError(error, context = {}) {
    console.error('Application Error:', error, context);
    
    // Send to error reporting service (e.g., Sentry)
    // if (window.Sentry) {
    //   Sentry.captureException(error, { extra: context });
    // }
  }

  static captureMessage(message, level = 'info') {
    console.log(`[${level.toUpperCase()}] ${message}`);
    
    // Send to error reporting service
    // if (window.Sentry) {
    //   Sentry.captureMessage(message, level);
    // }
  }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  PerformanceMonitor.mark('app-init-start');
  
  try {
    // Handle route changes
    if (window.RouteConfig) {
      window.RouteConfig.handleRouteChange();
    }
    
    // Initialize analytics
    Analytics.trackFormStart();
    
    // Initialize the checkout app
    window.checkoutApp = new CheckoutApp();
    
    // Ensure identity verification modal is hidden on load
    const modal = document.getElementById('identity-verification-modal');
    if (modal) {
      console.log('Checking modal state on init:', {
        hasHiddenClass: modal.classList.contains('hidden'),
        computedDisplay: window.getComputedStyle(modal).display
      });
      if (!modal.classList.contains('hidden')) {
        console.log('Modal was visible on load, hiding it');
        modal.classList.add('hidden');
      }
    }
    
    PerformanceMonitor.mark('app-init-end');
    PerformanceMonitor.measure('app-initialization', 'app-init-start', 'app-init-end');
    
  } catch (error) {
    ErrorReporter.captureError(error, { context: 'app-initialization' });
    document.body.innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-gray-50">
        <div class="text-center">
          <h1 class="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
          <p class="text-gray-600 mb-4">We're having trouble loading the checkout page.</p>
          <button onclick="location.reload()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Try Again
          </button>
        </div>
      </div>
    `;
  }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Page became visible - refresh data if needed
    if (window.checkoutApp) {
      window.checkoutApp.loadAutoSavedData();
    }
  }
});

// Handle beforeunload to save form data
window.addEventListener('beforeunload', () => {
  if (window.checkoutApp) {
    window.checkoutApp.autoSaveForm();
  }
});

// Export for testing (only in Node.js environment)
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = { CheckoutApp, Analytics, PerformanceMonitor, ErrorReporter };
}