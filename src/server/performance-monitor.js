// Performance Monitoring Script
// This script tracks various performance metrics and sends them to your analytics

(function() {
  'use strict';

  // Performance monitoring configuration
  const config = {
    // Set to true to enable console logging for debugging
    debug: false,
    // Custom endpoint for sending performance data (optional)
    endpoint: null,
    // Sample rate (0-1) for performance data collection
    sampleRate: 1.0
  };

  // Helper function for logging
  function log(message, data = null) {
    if (config.debug) {
      console.log(`[Performance Monitor] ${message}`, data);
    }
  }

  // Helper function to get current timestamp
  function getTimestamp() {
    return new Date().toISOString();
  }

  // Helper function to generate a unique session ID
  function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Get or create session ID
  let sessionId = sessionStorage.getItem('perf_session_id');
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem('perf_session_id', sessionId);
  }

  // Collect basic page information
  function getPageInfo() {
    return {
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      timestamp: getTimestamp(),
      sessionId: sessionId
    };
  }

  // Collect navigation timing data
  function getNavigationTiming() {
    if (!window.performance || !window.performance.timing) {
      return null;
    }

    const timing = window.performance.timing;
    const navigationStart = timing.navigationStart;

    return {
      // DNS resolution time
      dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
      // TCP connection time
      tcpConnect: timing.connectEnd - timing.connectStart,
      // Server response time
      serverResponse: timing.responseEnd - timing.requestStart,
      // DOM content loaded
      domContentLoaded: timing.domContentLoadedEventEnd - navigationStart,
      // Page load complete
      pageLoad: timing.loadEventEnd - navigationStart,
      // Time to first byte
      ttfb: timing.responseStart - timing.requestStart
    };
  }

  // Collect Core Web Vitals (if available)
  function getCoreWebVitals() {
    const vitals = {};

    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          vitals.lcp = lastEntry.startTime;
          log('LCP recorded:', vitals.lcp);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        log('LCP observer error:', e);
      }
    }

    // First Input Delay (FID)
    if ('PerformanceObserver' in window) {
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            vitals.fid = entry.processingStart - entry.startTime;
            log('FID recorded:', vitals.fid);
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        log('FID observer error:', e);
      }
    }

    // Cumulative Layout Shift (CLS)
    if ('PerformanceObserver' in window) {
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          vitals.cls = clsValue;
          log('CLS recorded:', vitals.cls);
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        log('CLS observer error:', e);
      }
    }

    return vitals;
  }

  // Collect resource timing data
  function getResourceTiming() {
    if (!window.performance || !window.performance.getEntriesByType) {
      return [];
    }

    const resources = window.performance.getEntriesByType('resource');
    return resources.map(resource => ({
      name: resource.name,
      type: resource.initiatorType,
      duration: resource.duration,
      size: resource.transferSize || 0,
      startTime: resource.startTime
    }));
  }

  // Send performance data
  function sendPerformanceData(data) {
    // Apply sample rate
    if (Math.random() > config.sampleRate) {
      log('Performance data skipped due to sample rate');
      return;
    }

    // If custom endpoint is configured, send data there
    if (config.endpoint) {
      fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      }).catch(error => {
        log('Error sending performance data:', error);
      });
    }

    // Also log to console for debugging
    log('Performance data collected:', data);

    // Send to Vercel Analytics if available
    if (window.va) {
      window.va('track', 'performance_metrics', data);
    }
  }

  // Main performance monitoring function
  function monitorPerformance() {
    log('Performance monitoring started');

    // Collect initial data
    const pageInfo = getPageInfo();
    const navigationTiming = getNavigationTiming();
    const coreWebVitals = getCoreWebVitals();

    // Wait for page to fully load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(collectAndSendData, 1000);
      });
    } else {
      setTimeout(collectAndSendData, 1000);
    }

    function collectAndSendData() {
      const performanceData = {
        pageInfo,
        navigationTiming,
        coreWebVitals,
        resourceTiming: getResourceTiming(),
        memory: window.performance.memory ? {
          usedJSHeapSize: window.performance.memory.usedJSHeapSize,
          totalJSHeapSize: window.performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit
        } : null
      };

      sendPerformanceData(performanceData);
    }

    // Monitor for user interactions
    let interactionCount = 0;
    const interactionEvents = ['click', 'scroll', 'input', 'submit'];

    interactionEvents.forEach(eventType => {
      document.addEventListener(eventType, () => {
        interactionCount++;
        
        // Send interaction data periodically
        if (interactionCount % 10 === 0) {
          sendPerformanceData({
            type: 'user_interaction',
            eventType,
            interactionCount,
            timestamp: getTimestamp(),
            sessionId
          });
        }
      }, { passive: true });
    });
  }

  // Error monitoring
  function monitorErrors() {
    window.addEventListener('error', (event) => {
      const errorData = {
        type: 'javascript_error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error ? event.error.stack : null,
        timestamp: getTimestamp(),
        sessionId
      };

      sendPerformanceData(errorData);
    });

    window.addEventListener('unhandledrejection', (event) => {
      const errorData = {
        type: 'unhandled_promise_rejection',
        reason: event.reason,
        timestamp: getTimestamp(),
        sessionId
      };

      sendPerformanceData(errorData);
    });
  }

  // Initialize monitoring
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      monitorPerformance();
      monitorErrors();
    });
  } else {
    monitorPerformance();
    monitorErrors();
  }

  // Expose configuration for external use
  window.PerformanceMonitor = {
    config,
    log,
    sendPerformanceData
  };

})();