/**
 * Client-side Logger
 * Production-ready logging for browser environments
 */

class ClientLogger {
  constructor(context = 'App') {
    this.context = context;
    this.buffer = [];
    this.maxBufferSize = 50;
    
    // Only log errors in production
    this.isProduction = window.location.hostname !== 'localhost';
    this.enableConsole = !this.isProduction || (localStorage.getItem('debug') === 'true');
    
    // Setup error tracking
    this.setupGlobalErrorHandling();
  }

  log(level, message, data = {}) {
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

  error(message, error = null) {
    const data = {};
    if (error) {
      data.errorMessage = error.message;
      data.errorStack = error.stack;
      data.errorName = error.name;
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
    if (!this.isProduction) {
      this.log('debug', message, data);
    }
  }

  // Send errors to server for monitoring
  async sendToServer(logEntry) {
    try {
      // In production, you might want to batch these
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

  // Setup global error handling
  setupGlobalErrorHandling() {
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

  // Get recent logs (useful for debugging)
  getRecentLogs() {
    return [...this.buffer];
  }

  // Clear log buffer
  clearLogs() {
    this.buffer = [];
  }
}

// Create global logger instance
const AppLogger = new ClientLogger();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ClientLogger, AppLogger };
} 