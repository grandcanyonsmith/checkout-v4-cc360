/**
 * Universal Logger
 * Works in both Node.js and browser environments
 */

const isServer = typeof window === 'undefined';

class UniversalLogger {
  constructor(context = 'App') {
    this.context = context;
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    if (isServer) {
      const config = require('./config');
      this.currentLevel = this.levels[config.logging.level] || this.levels.info;
      this.format = config.logging.format;
      this.isProduction = config.isProduction;
    } else {
      // Client-side configuration
      this.buffer = [];
      this.maxBufferSize = 50;
      this.isProduction = window.location.hostname !== 'localhost';
      this.enableConsole = !this.isProduction || (localStorage.getItem('debug') === 'true');
      this.currentLevel = this.isProduction ? this.levels.error : this.levels.debug;
      
      // Setup error tracking on client
      this.setupGlobalErrorHandling();
    }
  }

  formatMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    
    if (isServer && this.format === 'json') {
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
    if (this.levels[level] > this.currentLevel) return;
    
    if (isServer) {
      // Server-side logging
      const formattedMessage = this.formatMessage(level, message, data);
      
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
      
      // In production, send to logging service
      if (this.isProduction) {
        this.sendToLoggingService(level, message, data);
      }
    } else {
      // Client-side logging
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        context: this.context,
        message,
        data,
        url: window.location.href,
        userAgent: navigator.userAgent
      };

      // Add to buffer
      this.buffer.push(logEntry);
      if (this.buffer.length > this.maxBufferSize) {
        this.buffer.shift();
      }

      // Console output (development only)
      if (this.enableConsole) {
        const consoleMethod = level === 'error' ? 'error' : 
                             level === 'warn' ? 'warn' : 'log';
        console[consoleMethod](`[${this.context}] ${message}`, data);
      }

      // Send critical errors to server
      if (level === 'error' && this.isProduction) {
        this.sendToServer(logEntry);
      }
    }
  }

  error(message, error = null) {
    const data = {};
    if (error) {
      data.error = {
        message: error.message,
        stack: error.stack,
        code: error.code,
        name: error.name
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

  // Send to external logging service (server-side)
  sendToLoggingService(level, message, data) {
    // Implement your logging service integration here
    // Examples: AWS CloudWatch, Datadog, Sentry, LogRocket, etc.
  }

  // Send errors to server (client-side)
  async sendToServer(logEntry) {
    try {
      await fetch('/api/client-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry)
      });
    } catch (err) {
      // Silently fail - don't create infinite error loops
    }
  }

  // Setup global error handling (client-side only)
  setupGlobalErrorHandling() {
    if (isServer) return;
    
    // Catch unhandled errors
    window.addEventListener('error', (event) => {
      this.error('Uncaught error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled promise rejection', {
        reason: event.reason,
        promise: event.promise
      });
    });
  }

  // Create a child logger with additional context
  child(additionalContext) {
    return new UniversalLogger(`${this.context}:${additionalContext}`);
  }

  // Get recent logs (client-side only)
  getRecentLogs() {
    return this.buffer ? [...this.buffer] : [];
  }

  // Clear log buffer (client-side only)
  clearLogs() {
    if (this.buffer) {
      this.buffer = [];
    }
  }
}

// Export singleton instance and class
const logger = new UniversalLogger();

if (isServer) {
  module.exports = { UniversalLogger, logger };
} else {
  window.Logger = UniversalLogger;
  window.logger = logger;
} 