/**
 * Input Sanitization Utility
 * Prevents XSS attacks and ensures data integrity
 */

class Sanitizer {
  /**
   * Escape HTML entities to prevent XSS
   */
  static escapeHtml(str) {
    if (typeof str !== 'string') return str;
    
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    
    return str.replace(/[&<>"'/]/g, char => map[char]);
  }

  /**
   * Sanitize user input by trimming and escaping
   */
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    // Trim whitespace
    let sanitized = input.trim();
    
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    
    // Remove control characters (except newlines and tabs)
    sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
    
    return sanitized;
  }

  /**
   * Sanitize email address
   */
  static sanitizeEmail(email) {
    if (typeof email !== 'string') return '';
    
    // Convert to lowercase and trim
    email = email.toLowerCase().trim();
    
    // Remove any characters that aren't valid in email addresses
    email = email.replace(/[^a-z0-9.!#$%&'*+\/=?^_`{|}~@-]/g, '');
    
    // Ensure only one @ symbol
    const atCount = (email.match(/@/g) || []).length;
    if (atCount !== 1) return '';
    
    return email;
  }



  /**
   * Sanitize name (first/last)
   */
  static sanitizeName(name) {
    if (typeof name !== 'string') return '';
    
    // Trim and remove excess whitespace
    name = name.trim().replace(/\s+/g, ' ');
    
    // Allow only letters, spaces, hyphens, and apostrophes
    name = name.replace(/[^a-zA-Z\s\-']/g, '');
    
    // Prevent multiple consecutive special characters
    name = name.replace(/[-']{2,}/g, '-');
    
    // Capitalize first letter of each word
    name = name.replace(/\b\w/g, char => char.toUpperCase());
    
    return name;
  }

  /**
   * Sanitize password (just trim, don't modify)
   */
  static sanitizePassword(password) {
    if (typeof password !== 'string') return '';
    
    // Only trim whitespace, preserve the actual password
    return password.trim();
  }

  /**
   * Sanitize URL
   */
  static sanitizeUrl(url) {
    if (typeof url !== 'string') return '';
    
    try {
      const parsed = new URL(url);
      
      // Only allow http/https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return '';
      }
      
      return parsed.toString();
    } catch {
      return '';
    }
  }

  /**
   * Sanitize object recursively
   */
  static sanitizeObject(obj, rules = {}) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized = Array.isArray(obj) ? [] : {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (rules[key]) {
        // Apply specific sanitization rule
        sanitized[key] = rules[key](value);
      } else if (typeof value === 'string') {
        // Default string sanitization
        sanitized[key] = this.sanitizeInput(value);
      } else if (typeof value === 'object' && value !== null) {
        // Recursive sanitization
        sanitized[key] = this.sanitizeObject(value, rules);
      } else {
        // Keep as is
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Validate and sanitize checkout form data
   */
  static sanitizeCheckoutData(data) {
    return this.sanitizeObject(data, {
      email: this.sanitizeEmail,
      firstName: this.sanitizeName,
      lastName: this.sanitizeName,
      password: this.sanitizePassword
    });
  }

  /**
   * Create safe HTML from template
   */
  static createSafeHtml(template, data) {
    let html = template;
    
    for (const [key, value] of Object.entries(data)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(placeholder, this.escapeHtml(value));
    }
    
    return html;
  }
}

// Export for use in both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Sanitizer;
} 