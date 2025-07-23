/**
 * Production Middleware
 * Security headers, rate limiting, error handling, etc.
 */

const config = require('../shared/config');
const { logger } = require('../shared/logger');

// Rate limiting to prevent abuse
const rateLimiter = (() => {
  const requests = new Map();
  
  return (req, res, next) => {
    if (!config.server.isProduction) {
      return next(); // Skip in development
    }
    
    const key = req.ip;
    const now = Date.now();
    const windowStart = now - config.security.rateLimitWindow;
    
    // Clean old entries
    const userRequests = requests.get(key) || [];
    const recentRequests = userRequests.filter(time => time > windowStart);
    
    if (recentRequests.length >= config.security.rateLimitMax) {
      logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path });
      return res.status(429).json({
        error: 'Too many requests. Please try again later.'
      });
    }
    
    recentRequests.push(now);
    requests.set(key, recentRequests);
    next();
  };
})();

// Security headers
const securityHeaders = (req, res, next) => {
  // HSTS
  if (config.server.isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent MIME sniffing (skip for JS files to avoid conflicts)
  if (!req.path.endsWith('.js')) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://cdn.tailwindcss.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.stripe.com https://api.mailgun.net",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'"
  ].join('; '));
  
  next();
};

// Request logging
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    };
    
    if (res.statusCode >= 400) {
      logger.warn('Request failed', logData);
    } else if (config.logging.level === 'debug') {
      logger.debug('Request completed', logData);
    }
  });
  
  next();
};

// Error handler
const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error', err);
  
  // Don't leak error details in production
  const isDev = !config.server.isProduction;
  
  res.status(err.status || 500).json({
    error: isDev ? err.message : 'An error occurred',
    ...(isDev && { stack: err.stack })
  });
};

// Not found handler
const notFoundHandler = (req, res) => {
  logger.warn('Route not found', { path: req.path, method: req.method });
  res.status(404).json({ error: 'Not found' });
};

// Input sanitization
const sanitizeInput = (req, res, next) => {
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].trim();
      }
    });
  }
  
  // Sanitize body
  if (req.body) {
    const sanitize = (obj) => {
      Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'string') {
          obj[key] = obj[key].trim();
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitize(obj[key]);
        }
      });
    };
    sanitize(req.body);
  }
  
  next();
};

module.exports = {
  rateLimiter,
  securityHeaders,
  requestLogger,
  errorHandler,
  notFoundHandler,
  sanitizeInput
}; 