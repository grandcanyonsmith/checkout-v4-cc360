/**
 * Email Validator for Course Creator 360 Checkout
 * Provides real-time email validation with Mailgun API support
 */

// Only declare EmailValidator if it doesn't exist
if (typeof window !== 'undefined' && !window.EmailValidator) {
  window.EmailValidator = class EmailValidator {
  constructor() {
    // Configuration
    this.config = {
      API_ENDPOINT: '/api/validate-email', // Server endpoint for Mailgun validation
      DEBOUNCE_DELAY: 500, // Delay before making API call (ms)
      
      // Common free email providers
      FREE_PROVIDERS: [
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
        'aol.com', 'mail.com', 'protonmail.com', 'icloud.com',
        'live.com', 'ymail.com', 'rocketmail.com', 'yahoo.co.uk'
      ],
      
      // Common disposable email domains
      DISPOSABLE_DOMAINS: [
        'tempmail.com', '10minutemail.com', 'guerrillamail.com',
        'mailinator.com', 'throwaway.email', 'yopmail.com',
        'temp-mail.org', 'disposablemail.com', 'getnada.com',
        'burnermail.io', 'maildrop.cc', 'mintemail.com'
      ],
      
      // Role-based email prefixes
      ROLE_PREFIXES: [
        'admin', 'info', 'support', 'sales', 'contact',
        'help', 'noreply', 'no-reply', 'postmaster',
        'webmaster', 'hostmaster', 'billing', 'abuse',
        'marketing', 'team', 'hello', 'hi', 'office'
      ]
    };
    
    // Cache for API results to avoid repeated calls
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.debounceTimers = new Map();
  }

  /**
   * Basic email validation using regex
   */
  validateBasic(email) {
    if (!email || typeof email !== 'string') {
      return {
        isValid: false,
        isSyntaxValid: false,
        error: 'Email is required'
      };
    }

    // More comprehensive email regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    const isSyntaxValid = emailRegex.test(email.toLowerCase());
    
    if (!isSyntaxValid) {
      return {
        isValid: false,
        isSyntaxValid: false,
        error: 'Invalid email format'
      };
    }

    // Extract parts
    const [localPart, domain] = email.toLowerCase().split('@');
    
    // Check for role-based email
    const isRole = this.config.ROLE_PREFIXES.some(prefix => 
      localPart.startsWith(prefix)
    );
    
    // Check if free email provider
    const isFree = this.config.FREE_PROVIDERS.includes(domain);
    
    // Check if disposable
    const isDisposable = this.config.DISPOSABLE_DOMAINS.includes(domain);
    
    // Additional checks
    const hasMxSuffix = domain.includes('.');
    const hasValidLength = email.length <= 254 && localPart.length <= 64;
    
    return {
      isValid: isSyntaxValid && hasMxSuffix && hasValidLength && !isDisposable,
      isSyntaxValid,
      isDomainValid: hasMxSuffix,
      isRoleAddress: isRole,
      isFree,
      isDisposable,
      risk: isDisposable ? 'high' : (isRole || isFree) ? 'medium' : 'low',
      validationMethod: 'basic',
      email: email.toLowerCase()
    };
  }

  /**
   * Get typo suggestions for common domains
   */
  getTypoSuggestion(email) {
    if (!email.includes('@')) return null;
    
    const [localPart, domain] = email.split('@');
    const commonDomains = {
      'gmial.com': 'gmail.com',
      'gmai.com': 'gmail.com',
      'gmail.co': 'gmail.com',
      'gmail.cm': 'gmail.com',
      'gmil.com': 'gmail.com',
      'yahooo.com': 'yahoo.com',
      'yaho.com': 'yahoo.com',
      'yahoo.co': 'yahoo.com',
      'hotmial.com': 'hotmail.com',
      'hotmai.com': 'hotmail.com',
      'hotmil.com': 'hotmail.com',
      'outlok.com': 'outlook.com',
      'outlook.co': 'outlook.com'
    };
    
    const suggestion = commonDomains[domain.toLowerCase()];
    return suggestion ? `${localPart}@${suggestion}` : null;
  }

  /**
   * Validate email with Mailgun API (debounced)
   */
  async validateWithAPI(email, options = {}) {
    // Clear any existing debounce timer
    if (this.debounceTimers.has(email)) {
      clearTimeout(this.debounceTimers.get(email));
    }

    // Return cached result if available and fresh
    const cached = this.cache.get(email);
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 min cache
      return cached.result;
    }

    // If there's already a pending request for this email, return it
    if (this.pendingRequests.has(email)) {
      return this.pendingRequests.get(email);
    }

    // Create debounced promise
    const promise = new Promise((resolve) => {
      const timer = setTimeout(async () => {
        try {
          // First do basic validation
          const basicResult = this.validateBasic(email);
          
          // If basic validation fails, don't bother with API
          if (!basicResult.isSyntaxValid) {
            resolve(basicResult);
            return;
          }

          // Make API request
          const response = await fetch(this.config.API_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
          });

          if (!response.ok) {
            // If API fails, return basic validation
            console.warn('Email validation API error:', response.status);
            resolve({
              ...basicResult,
              apiError: `API returned ${response.status}`
            });
            return;
          }

          const apiResult = await response.json();
          
          // Merge results
          const finalResult = {
            ...basicResult,
            ...apiResult,
            validationMethod: 'mailgun_api'
          };

          // Cache the result
          this.cache.set(email, {
            result: finalResult,
            timestamp: Date.now()
          });

          resolve(finalResult);
        } catch (error) {
          console.error('Email validation error:', error);
          // Fall back to basic validation
          resolve({
            ...this.validateBasic(email),
            apiError: error.message
          });
        } finally {
          // Clean up
          this.pendingRequests.delete(email);
          this.debounceTimers.delete(email);
        }
      }, options.immediate ? 0 : this.config.DEBOUNCE_DELAY);

      this.debounceTimers.set(email, timer);
    });

    this.pendingRequests.set(email, promise);
    return promise;
  }

  /**
   * Format validation result for display
   */
  formatResult(result) {
    if (!result.isValid) {
      if (result.isDisposable) {
        return {
          type: 'error',
          message: 'Disposable email addresses are not allowed'
        };
      }
      if (!result.isSyntaxValid) {
        return {
          type: 'error',
          message: result.error || 'Please enter a valid email address'
        };
      }
      if (!result.isDomainValid) {
        return {
          type: 'error',
          message: 'Email domain appears to be invalid'
        };
      }
      if (result.reason) {
        return {
          type: 'error',
          message: result.reason
        };
      }
      return {
        type: 'error',
        message: 'This email address appears to be invalid'
      };
    }

    // Valid but with warnings
    if (result.risk === 'high') {
      return {
        type: 'warning',
        message: 'This email address may have deliverability issues'
      };
    }
    
    if (result.isRoleAddress) {
      return {
        type: 'warning',
        message: 'Role-based email detected. Please use a personal email.'
      };
    }

    // Check for typo suggestion
    const suggestion = this.getTypoSuggestion(result.email);
    if (suggestion) {
      return {
        type: 'info',
        message: `Did you mean ${suggestion}?`,
        suggestion
      };
    }

    return {
      type: 'success',
      message: 'Valid email address'
    };
  }

  /**
   * Clear cache for an email
   */
  clearCache(email) {
    this.cache.delete(email);
  }

  /**
   * Clear all caches
   */
  clearAllCache() {
    this.cache.clear();
  }
}
  
  // Export for use in other files
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.EmailValidator;
  }
} 