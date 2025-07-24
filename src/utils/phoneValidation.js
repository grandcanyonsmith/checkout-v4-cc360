class PhoneValidator {
  constructor() {
    this.cache = new Map();
    this.debounceTimers = new Map();
  }

  // Basic client-side phone number validation
  validateBasic(phoneNumber) {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return { 
        isValid: false, 
        error: 'Phone number is required',
        type: 'error'
      };
    }

    // Remove all non-digit characters except +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Check if it's a valid international format
    const internationalRegex = /^\+[1-9]\d{1,14}$/;
    if (!internationalRegex.test(cleaned)) {
      return { 
        isValid: false, 
        error: 'Please enter a valid international phone number (e.g., +1234567890)',
        type: 'error'
      };
    }

    // Check minimum length (at least 10 digits after country code)
    if (cleaned.length < 11) {
      return { 
        isValid: false, 
        error: 'Phone number is too short',
        type: 'error'
      };
    }

    return { 
      isValid: true, 
      cleanedNumber: cleaned,
      type: 'success'
    };
  }

  // Validate phone number using Twilio API with debouncing and caching
  async validateWithAPI(phoneNumber, options = {}) {
    const { skipCache = false, debounceMs = 500 } = options;

    // First do basic validation
    const basicValidation = this.validateBasic(phoneNumber);
    if (!basicValidation.isValid) {
      return this.formatResult(basicValidation);
    }

    const cleanedNumber = basicValidation.cleanedNumber;

    // Check cache first
    if (!skipCache && this.cache.has(cleanedNumber)) {
      const cached = this.cache.get(cleanedNumber);
      console.log('📱 Using cached phone validation result for:', cleanedNumber);
      return this.formatResult(cached);
    }

    // Debounce API calls
    const debounceKey = cleanedNumber;
    if (this.debounceTimers.has(debounceKey)) {
      clearTimeout(this.debounceTimers.get(debounceKey));
    }

    return new Promise((resolve) => {
      const timer = setTimeout(async () => {
        this.debounceTimers.delete(debounceKey);
        
        try {
          // Make API request
          const API_BASE_URL = process.env.NODE_ENV === 'production' 
            ? 'https://cc360-checkout-v2-production.up.railway.app'
            : 'http://localhost:3001';

          console.log('📱 Validating phone number via API:', cleanedNumber);
          
          const response = await fetch(`${API_BASE_URL}/api/validate-phone`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phoneNumber: cleanedNumber }),
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const result = await response.json();
          
          // Cache the result
          this.cache.set(cleanedNumber, result);
          
          // Auto-expire cache after 5 minutes
          setTimeout(() => {
            this.cache.delete(cleanedNumber);
          }, 5 * 60 * 1000);

          resolve(this.formatResult(result));
        } catch (error) {
          console.error('📱 Phone validation API error:', error);
          
          // Fallback to basic validation
          const fallbackResult = {
            success: true,
            isValid: true,
            isMobile: null,
            validationMethod: 'basic_fallback',
            warning: 'Could not verify if this is a mobile number'
          };
          
          resolve(this.formatResult(fallbackResult));
        }
      }, debounceMs);

      this.debounceTimers.set(debounceKey, timer);
    });
  }

  // Format validation result into user-friendly message
  formatResult(result) {
    if (!result.success) {
      return {
        ...result,
        message: result.error || 'Phone validation failed',
        type: result.type || 'error'
      };
    }

    if (!result.isValid) {
      return {
        ...result,
        message: result.reason || 'Invalid phone number',
        type: 'error'
      };
    }

    // Check if it's mobile
    if (result.isMobile === false) {
      return {
        ...result,
        message: 'Please provide a mobile phone number (landlines are not supported)',
        type: 'error'
      };
    }

    // Check spam risk
    if (result.spamRisk === 'high') {
      return {
        ...result,
        message: 'This phone number appears to have a high spam risk',
        type: 'error'
      };
    }

    if (result.spamRisk === 'medium') {
      return {
        ...result,
        message: 'This phone number may have some spam risk',
        type: 'warning'
      };
    }

    // Success cases
    if (result.validationMethod === 'basic_fallback') {
      return {
        ...result,
        message: result.warning || 'Phone number format is valid',
        type: 'info'
      };
    }

    if (result.isMobile === true) {
      return {
        ...result,
        message: `Valid mobile number (${result.carrier || 'carrier unknown'})`,
        type: 'success'
      };
    }

    return {
      ...result,
      message: 'Phone number is valid',
      type: 'success'
    };
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
export const phoneValidator = new PhoneValidator();
export default phoneValidator; 