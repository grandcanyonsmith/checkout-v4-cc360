/**
 * Production-grade Logger Utility
 * Centralized logging with proper levels and formatting
 */

const config = require('./config');

class Logger {
  constructor(context = 'App') {
    this.context = context;
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    this.currentLevel = this.levels[config.logging.level] || this.levels.info;
  }

  formatMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    
    if (config.logging.format === 'json') {
      return JSON.stringify({
        timestamp,
        level,
        context: this.context,
        message,
        ...data
      });
    }
    
    // Pretty format for development
    const emoji = {
      error: '❌',
      warn: '⚠️ ',
      info: 'ℹ️ ',
      debug: '🐛'
    };
    
    let output = `${timestamp} ${emoji[level]} [${this.context}] ${message}`;
    if (data && Object.keys(data).length > 0) {
      output += ` ${JSON.stringify(data, null, 2)}`;
    }
    
    return output;
  }

  log(level, message, data = {}) {
    if (this.levels[level] <= this.currentLevel) {
      const formattedMessage = this.formatMessage(level, message, data);
      
      // In production, you might want to send to a logging service
      if (config.server.isProduction) {
        // Send to logging service (e.g., CloudWatch, Datadog, etc.)
        this.sendToLoggingService(level, message, data);
      }
      
      // Output to console
      switch (level) {
        case 'error':
          console.error(formattedMessage);
          break;
        case 'warn':
          console.warn(formattedMessage);
          break;
        default:
          console.log(formattedMessage);
      }
    }
  }

  error(message, error = null) {
    const data = {};
    if (error) {
      data.error = {
        message: error.message,
        stack: error.stack,
        code: error.code
      };
    }
    this.log('error', message, data);
  }

  warn(message, data = {}) {
    this.log('warn', message, data);
  }

  info(message, data = {}) {
    this.log('info', message, data);
  }

  debug(message, data = {}) {
    this.log('debug', message, data);
  }

  // Placeholder for sending to external logging service
  sendToLoggingService(level, message, data) {
    // Implement your logging service integration here
    // Examples: AWS CloudWatch, Datadog, Sentry, LogRocket, etc.
  }

  // Create a child logger with additional context
  child(additionalContext) {
    return new Logger(`${this.context}:${additionalContext}`);
  }
}

// Export a singleton instance for the main app
const logger = new Logger();

// Also export the class for creating specific loggers
module.exports = { Logger, logger }; 