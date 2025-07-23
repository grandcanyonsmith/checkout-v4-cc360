/**
 * Email validation utility for Course Creator 360 Checkout
 * Provides real-time email validation with Mailgun API support
 */

class EmailValidator {
  constructor() {
    this.cache = new Map()
    this.pendingRequests = new Map()
    this.debounceTimers = new Map()
    this.DEBOUNCE_DELAY = 800 // Delay before making API call (ms)
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
      }
    }

    // Comprehensive email regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    
    const isSyntaxValid = emailRegex.test(email.toLowerCase())
    
    if (!isSyntaxValid) {
      return {
        isValid: false,
        isSyntaxValid: false,
        error: 'Invalid email format'
      }
    }

    // Extract parts
    const [localPart, domain] = email.toLowerCase().split('@')
    
    // Basic checks
    const hasMxSuffix = domain.includes('.')
    const hasValidLength = email.length <= 254 && localPart.length <= 64
    
    return {
      isValid: isSyntaxValid && hasMxSuffix && hasValidLength,
      isSyntaxValid,
      isDomainValid: hasMxSuffix,
      validationMethod: 'basic',
      email: email.toLowerCase()
    }
  }

  /**
   * Get typo suggestions for common domains
   */
  getTypoSuggestion(email) {
    if (!email.includes('@')) return null
    
    const [localPart, domain] = email.split('@')
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
    }
    
    const suggestion = commonDomains[domain.toLowerCase()]
    return suggestion ? `${localPart}@${suggestion}` : null
  }

  /**
   * Validate email with Mailgun API (debounced)
   */
  async validateWithAPI(email, options = {}) {
    // Clear any existing debounce timer
    if (this.debounceTimers.has(email)) {
      clearTimeout(this.debounceTimers.get(email))
    }

    // Return cached result if available and fresh
    const cached = this.cache.get(email)
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 min cache
      return cached.result
    }

    // If there's already a pending request for this email, return it
    if (this.pendingRequests.has(email)) {
      return this.pendingRequests.get(email)
    }

    // Create debounced promise
    const promise = new Promise((resolve) => {
      const timer = setTimeout(async () => {
        try {
          // First do basic validation
          const basicResult = this.validateBasic(email)
          
          // If basic validation fails, don't bother with API
          if (!basicResult.isSyntaxValid) {
            resolve(basicResult)
            return
          }

          // Make API request
          const API_BASE_URL = process.env.NODE_ENV === 'production' 
            ? 'https://cc360-checkout-production.up.railway.app'
            : 'http://localhost:3001'

          const response = await fetch(`${API_BASE_URL}/api/validate-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email })
          })

          if (!response.ok) {
            // If API fails, return basic validation
            console.warn('Email validation API error:', response.status)
            resolve({
              ...basicResult,
              apiError: `API returned ${response.status}`
            })
            return
          }

          const apiResult = await response.json()
          console.log('apiResult', apiResult)
          // Merge results
          const finalResult = {
            ...basicResult,
            ...apiResult,
            validationMethod: 'mailgun_api'
          }

          // Cache the result
          this.cache.set(email, {
            result: finalResult,
            timestamp: Date.now()
          })

          resolve(finalResult)
        } catch (error) {
          console.error('Email validation error:', error)
          
          // Fall back to basic validation
          resolve({
            ...this.validateBasic(email),
            apiError: error.message
          })
        } finally {
          // Clean up
          this.pendingRequests.delete(email)
          this.debounceTimers.delete(email)
        }
      }, options.immediate ? 0 : this.DEBOUNCE_DELAY)

      this.debounceTimers.set(email, timer)
    })

    this.pendingRequests.set(email, promise)
    return promise
  }

  /**
   * Format validation result for display
   */
  formatResult(result) {
    if (!result.success && result.error) {
      return {
        type: 'error',
        message: result.error
      }
    }

    if (!result.isValid) {
      if (result.isDisposable) {
        return {
          type: 'error',
          message: 'Disposable email addresses are not allowed'
        }
      }
      if (!result.isSyntaxValid) {
        return {
          type: 'error',
          message: 'Please enter a valid email address'
        }
      }
      if (result.result === 'undeliverable') {
        return {
          type: 'error',
          message: 'This email address cannot receive emails'
        }
      }
      if (result.result === 'do_not_send') {
        return {
          type: 'error',
          message: 'This email address is on a do-not-send list'
        }
      }
      return {
        type: 'error',
        message: 'Please enter a valid email address'
      }
    }

    // Valid email with warnings
    if (result.isRoleAddress) {
      return {
        type: 'warning',
        message: 'Role-based emails may not receive important updates'
      }
    }
    if (result.risk === 'high') {
      return {
        type: 'warning',
        message: 'This email may have delivery issues'
      }
    }

    // Check for typo suggestions
    const suggestion = this.getTypoSuggestion(result.email)
    if (suggestion && suggestion !== result.email) {
      return {
        type: 'info',
        message: `Did you mean ${suggestion}?`,
        suggestion
      }
    }

    return {
      type: 'success',
      message: 'Email address is valid'
    }
  }

  /**
   * Clear cache for specific email
   */
  clearCache(email) {
    this.cache.delete(email)
    this.pendingRequests.delete(email)
    if (this.debounceTimers.has(email)) {
      clearTimeout(this.debounceTimers.get(email))
      this.debounceTimers.delete(email)
    }
  }

  /**
   * Clear all cache
   */
  clearAllCache() {
    this.cache.clear()
    this.pendingRequests.clear()
    this.debounceTimers.forEach(timer => clearTimeout(timer))
    this.debounceTimers.clear()
  }
}

// Create and export singleton instance
export const emailValidator = new EmailValidator()
export default emailValidator 