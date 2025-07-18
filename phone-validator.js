/**
 * Phone Validator for Course Creator 360 Checkout
 * Provides real-time phone validation with Twilio Lookup API support
 */

// Only declare PhoneValidator if it doesn't exist
if (typeof window !== 'undefined' && !window.PhoneValidator) {
  window.PhoneValidator = class PhoneValidator {
    constructor() {
      // Configuration
      this.config = {
        API_ENDPOINT: '/api/verify-phone', // Server endpoint for phone validation
        LAMBDA_ENDPOINT: 'https://6md7xnb5zegjqwkos5lpihtkoy0xpnki.lambda-url.us-west-2.on.aws/', // Direct Lambda endpoint
        DEBOUNCE_DELAY: 500, // Delay before making API call (ms)
        
        // Common phone patterns
        PHONE_PATTERNS: {
          US: /^(\+?1)?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/,
          INTERNATIONAL: /^\+[1-9]\d{1,14}$/
        },
        
        // High-risk patterns
        HIGH_RISK_PATTERNS: [
          /^1-900/, // Premium rate numbers
          /^1-800/, // Toll-free (sometimes abused)
          /^555/,   // Fake numbers in movies
          /^000/,   // Emergency numbers
          /^911/,   // Emergency numbers
          /^411/,   // Directory assistance
        ]
      };
      
      // Cache for API results to avoid repeated calls
      this.cache = new Map();
      this.pendingRequests = new Map();
      this.debounceTimers = new Map();
    }

    /**
     * Basic phone validation using regex
     */
    validateBasic(phone) {
      if (!phone || typeof phone !== 'string') {
        return {
          isValid: false,
          isSyntaxValid: false,
          error: 'Phone number is required'
        };
      }

      // Clean phone number (remove all non-digits)
      const cleanPhone = phone.replace(/\D/g, '');
      
      // Check for high-risk patterns
      const isHighRisk = this.config.HIGH_RISK_PATTERNS.some(pattern => 
        pattern.test(phone)
      );
      
      // Basic length validation
      if (cleanPhone.length < 10) {
        return {
          isValid: false,
          isSyntaxValid: false,
          error: 'Phone number too short'
        };
      }
      
      if (cleanPhone.length > 15) {
        return {
          isValid: false,
          isSyntaxValid: false,
          error: 'Phone number too long'
        };
      }

      // Check US pattern
      const usMatch = phone.match(this.config.PHONE_PATTERNS.US);
      const isUSFormat = !!usMatch;
      
      // Check international pattern
      const isInternational = this.config.PHONE_PATTERNS.INTERNATIONAL.test(phone);
      
      const isSyntaxValid = isUSFormat || isInternational;
      
      if (!isSyntaxValid) {
        return {
          isValid: false,
          isSyntaxValid: false,
          error: 'Invalid phone number format'
        };
      }

      return {
        isValid: isSyntaxValid && !isHighRisk,
        isSyntaxValid,
        isHighRisk,
        cleanNumber: cleanPhone,
        countryCode: cleanPhone.startsWith('1') ? 'US' : 'unknown',
        risk: isHighRisk ? 'high' : 'low',
        validationMethod: 'basic',
        phone: phone
      };
    }

    /**
     * Format phone number for display
     */
    formatPhoneNumber(phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      
      if (cleanPhone.length === 10) {
        return `(${cleanPhone.slice(0, 3)}) ${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`;
      } else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
        return `+1 (${cleanPhone.slice(1, 4)}) ${cleanPhone.slice(4, 7)}-${cleanPhone.slice(7)}`;
      }
      
      return phone;
    }

    /**
     * Validate phone with Twilio API (debounced)
     */
    async validateWithAPI(phone, options = {}) {
      const { firstName, lastName } = options;
      
      // Clear any existing debounce timer
      if (this.debounceTimers.has(phone)) {
        clearTimeout(this.debounceTimers.get(phone));
      }

      // Return cached result if available and fresh
      const cached = this.cache.get(phone);
      if (cached && Date.now() - cached.timestamp < 300000) { // 5 min cache
        return cached.result;
      }

      // If there's already a pending request for this phone, return it
      if (this.pendingRequests.has(phone)) {
        return this.pendingRequests.get(phone);
      }

      // Create debounced promise
      const promise = new Promise((resolve) => {
        const timer = setTimeout(async () => {
          try {
            // First do basic validation
            const basicResult = this.validateBasic(phone);
            
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
              body: JSON.stringify({ 
                phone,
                firstName,
                lastName
              })
            });

            if (!response.ok) {
              // If API fails, return basic validation
              console.warn('Phone validation API error:', response.status);
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
              validationMethod: 'twilio_lookup_api'
            };

            // Cache the result
            this.cache.set(phone, {
              result: finalResult,
              timestamp: Date.now()
            });

            resolve(finalResult);
          } catch (error) {
            console.error('Phone validation error:', error);
            // Fall back to basic validation
            resolve({
              ...this.validateBasic(phone),
              apiError: error.message
            });
          } finally {
            // Remove from pending requests
            this.pendingRequests.delete(phone);
          }
        }, this.config.DEBOUNCE_DELAY);

        this.debounceTimers.set(phone, timer);
      });

      // Store pending request
      this.pendingRequests.set(phone, promise);
      
      return promise;
    }

    /**
     * Format validation result for display
     */
    formatResult(result) {
      if (!result.success) {
        return {
          type: 'error',
          message: result.error || 'Phone validation failed'
        };
      }

      if (!result.isValid) {
        return {
          type: 'error',
          message: result.reason || 'Invalid phone number'
        };
      }

      // Check for identity match results
      if (result.identityMatch && result.identityMatch.summary_score !== undefined) {
        const summaryScore = result.identityMatch.summary_score;
        
        if (summaryScore < 20) {
          return {
            type: 'error',
            message: 'Name does not match phone number'
          };
        } else if (summaryScore < 40) {
          return {
            type: 'warning',
            message: 'Weak identity match'
          };
        } else if (summaryScore < 80) {
          return {
            type: 'info',
            message: 'Partial identity match'
          };
        } else {
          return {
            type: 'success',
            message: 'Strong identity match'
          };
        }
      }

      // Check risk level for non-identity match results
      if (result.risk === 'high') {
        return {
          type: 'warning',
          message: result.reason || 'High-risk phone number detected'
        };
      }

      if (result.risk === 'medium') {
        return {
          type: 'info',
          message: result.reason || 'Phone number verified'
        };
      }

      // Success case
      return {
        type: 'success',
        message: 'Phone number verified successfully'
      };
    }

    /**
     * Clear cache for specific phone number
     */
    clearCache(phone) {
      this.cache.delete(phone);
      this.pendingRequests.delete(phone);
      
      if (this.debounceTimers.has(phone)) {
        clearTimeout(this.debounceTimers.get(phone));
        this.debounceTimers.delete(phone);
      }
    }

    /**
     * Clear all cache
     */
    clearAllCache() {
      this.cache.clear();
      this.pendingRequests.clear();
      
      // Clear all debounce timers
      this.debounceTimers.forEach(timer => clearTimeout(timer));
      this.debounceTimers.clear();
    }
  };
} 