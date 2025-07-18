# Analytics and Performance Monitoring Setup

This guide explains how to set up and use the analytics and performance monitoring features added to your Course Creator 360 checkout application.

## What's Been Added

### 1. Vercel Analytics
- **Package**: `@vercel/analytics` (installed)
- **Script**: Added to `index.html` head section
- **Purpose**: Track page views, user interactions, and basic analytics

### 2. Performance Monitoring
- **File**: `performance-monitor.js` (created)
- **Purpose**: Track Core Web Vitals, page load times, and user interactions
- **Features**: Error monitoring, resource timing, memory usage

### 3. Vercel Configuration
- **File**: `vercel.json` (created)
- **Purpose**: Configure Vercel deployment with analytics and speed insights

## Setup Instructions

### Step 1: Deploy to Vercel

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Deploy your application**:
   ```bash
   vercel
   ```

3. **Follow the prompts** to connect your project to Vercel

### Step 2: Enable Analytics in Vercel Dashboard

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Analytics** tab
4. Click **Enable Analytics**
5. Choose your plan (Hobby plan includes basic analytics)

### Step 3: Configure Environment Variables (Optional)

If you want to send performance data to a custom endpoint, add this to your Vercel environment variables:

```bash
PERFORMANCE_ENDPOINT=https://your-api-endpoint.com/performance
```

Then update the `performance-monitor.js` file:

```javascript
const config = {
  debug: false,
  endpoint: process.env.PERFORMANCE_ENDPOINT || null,
  sampleRate: 1.0
};
```

## What Gets Tracked

### Vercel Analytics
- Page views
- User sessions
- Geographic data
- Device information
- Referrer sources

### Performance Monitoring
- **Core Web Vitals**:
  - Largest Contentful Paint (LCP)
  - First Input Delay (FID)
  - Cumulative Layout Shift (CLS)

- **Navigation Timing**:
  - DNS lookup time
  - TCP connection time
  - Server response time
  - DOM content loaded
  - Page load time
  - Time to first byte (TTFB)

- **Resource Timing**:
  - Load times for CSS, JS, images
  - Resource sizes
  - Network performance

- **User Interactions**:
  - Click events
  - Scroll events
  - Form submissions
  - Input interactions

- **Error Monitoring**:
  - JavaScript errors
  - Unhandled promise rejections
  - Stack traces

- **Memory Usage** (Chrome only):
  - JavaScript heap size
  - Memory limits

## Viewing Analytics Data

### Vercel Analytics Dashboard
1. Go to your Vercel project dashboard
2. Click on **Analytics** tab
3. View:
   - Page views over time
   - Top pages
   - Geographic distribution
   - Device types
   - Referrer sources

### Performance Data
Performance data is logged to the browser console when `debug: true` is set in the configuration. You can also:

1. **View in Browser Console**:
   - Open Developer Tools
   - Check Console tab for performance logs
   - Look for `[Performance Monitor]` messages

2. **Custom Endpoint**:
   - Set up your own API endpoint
   - Configure `PERFORMANCE_ENDPOINT` environment variable
   - Receive real-time performance data

## Configuration Options

### Performance Monitor Configuration

Edit `performance-monitor.js` to customize:

```javascript
const config = {
  // Enable console logging for debugging
  debug: false,
  
  // Custom endpoint for sending performance data
  endpoint: null,
  
  // Sample rate (0-1) for performance data collection
  // 1.0 = collect all data, 0.5 = collect 50% of data
  sampleRate: 1.0
};
```

### Vercel Analytics Configuration

The analytics script is automatically loaded from Vercel's CDN. No additional configuration is needed for basic analytics.

## Privacy and GDPR Compliance

### Data Collected
- Page views and navigation
- Performance metrics
- User interactions
- Error information
- Device and browser information

### Privacy Considerations
- No personally identifiable information is collected
- Session IDs are randomly generated
- Data is anonymized by default
- Users can opt-out by disabling JavaScript

### GDPR Compliance
- Analytics data is processed by Vercel in compliance with GDPR
- Users can request data deletion through Vercel support
- No cookies are set by the analytics script

## Troubleshooting

### Analytics Not Working
1. **Check Vercel Deployment**: Ensure your app is deployed to Vercel
2. **Verify Analytics Enabled**: Check Vercel dashboard for analytics status
3. **Check Console**: Look for any JavaScript errors
4. **Network Tab**: Verify the analytics script is loading

### Performance Data Not Appearing
1. **Enable Debug Mode**: Set `debug: true` in performance-monitor.js
2. **Check Console**: Look for performance monitor messages
3. **Verify Script Loading**: Ensure performance-monitor.js is loaded
4. **Check Network**: Verify no blocking of analytics requests

### Common Issues
- **CORS Errors**: Ensure your custom endpoint allows cross-origin requests
- **Script Loading**: Check that all scripts load in the correct order
- **Ad Blockers**: Some ad blockers may block analytics scripts

## Performance Impact

The analytics and monitoring scripts are designed to be lightweight:
- **Vercel Analytics**: ~2KB gzipped
- **Performance Monitor**: ~8KB gzipped
- **Total Impact**: Minimal impact on page load times
- **Async Loading**: Scripts load asynchronously to avoid blocking

## Support

For issues with:
- **Vercel Analytics**: Contact Vercel support
- **Performance Monitoring**: Check the browser console for error messages
- **Deployment**: Refer to Vercel documentation

## Next Steps

1. Deploy your application to Vercel
2. Enable analytics in the Vercel dashboard
3. Monitor your analytics data
4. Use performance data to optimize your application
5. Set up alerts for performance issues (if needed)