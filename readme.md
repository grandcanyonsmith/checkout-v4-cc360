# Course Creator 360 Checkout

A production-ready checkout system for Course Creator 360 with Stripe integration, real-time email validation, and enhanced security features.

## Features

- **Secure Payment Processing**: Stripe integration with PaymentIntents and SetupIntents
- **Real-time Email Validation**: Mailgun API integration with typo suggestions
- **Enhanced Security**: Rate limiting, input sanitization, security headers
- **Production Ready**: Comprehensive logging, error handling, and monitoring
- **Responsive Design**: Modern UI with Tailwind CSS
- **Form Auto-save**: Automatic form data persistence
- **Analytics Integration**: Vercel Analytics and Speed Insights with comprehensive tracking

## Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Stripe account
- Mailgun account (optional, for email validation)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd checkout-v4-cc360
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your actual API keys:
   ```env
   # Stripe Configuration
   STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
   STRIPE_SECRET_KEY=sk_test_your_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   
   # Mailgun Configuration (optional)
   MAILGUN_API_KEY=your_mailgun_api_key
   
   # Security Configuration
   SESSION_SECRET=your_session_secret_here
   
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

4. **Build the application**
   ```bash
   npm run build
   ```

5. **Start the development server**
   ```bash
   npm start
   ```

6. **Open your browser**
   ```
   http://localhost:3000
   ```

## Environment Variables

### Required
- `STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `SESSION_SECRET`: A secure random string for session encryption

### Optional
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook endpoint secret (required for production)
- `MAILGUN_API_KEY`: Mailgun API key for email validation
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `CORS_ORIGIN`: CORS origin (default: *)

## Security Features

- **Rate Limiting**: Prevents abuse with configurable limits
- **Input Sanitization**: All user inputs are sanitized
- **Security Headers**: HSTS, CSP, XSS protection
- **Environment Variables**: No hardcoded secrets
- **Error Handling**: Secure error responses
- **CORS Protection**: Configurable cross-origin requests

## API Endpoints

- `POST /api/create-subscription`: Create Stripe customer and subscription
- `POST /api/create-payment-intent`: Create Stripe payment intent
- `POST /api/validate-email`: Validate email with Mailgun API
- `POST /webhook/stripe`: Stripe webhook handler

## Analytics & Performance Monitoring

This application includes comprehensive analytics and performance monitoring using Vercel Analytics and Speed Insights.

### Vercel Analytics
- **Automatic Page Views**: Tracks all page visits automatically
- **Custom Events**: Tracks checkout-specific events (form completion, payments, errors)
- **User Journey**: Monitors user flow through the checkout process
- **Conversion Tracking**: Tracks successful subscriptions and payment completions

### Vercel Speed Insights
- **Performance Monitoring**: Real-time performance metrics
- **Core Web Vitals**: Tracks LCP, FID, and CLS scores
- **User Experience**: Monitors actual user performance data
- **Performance Alerts**: Automatic alerts for performance regressions

### Implementation Details

The analytics are implemented using CDN imports for maximum compatibility with vanilla JavaScript applications:

```javascript
// Analytics are loaded via CDN in vercel-analytics.js
const { inject } = await import('https://cdn.jsdelivr.net/npm/@vercel/analytics@1.1.1/dist/index.js');
const { injectSpeedInsights } = await import('https://cdn.jsdelivr.net/npm/@vercel/speed-insights@1.0.2/dist/index.js');
```

### Custom Event Tracking

The application tracks the following custom events:

- `checkout_started`: When user begins checkout process
- `form_field_completed`: When user completes form fields
- `email_validation`: Email validation results
- `payment_attempt`: Payment submission attempts
- `payment_success`: Successful payments
- `payment_error`: Payment errors
- `form_validation_error`: Form validation errors

### Testing Analytics

To test the analytics implementation:

1. **Open the test page**:
   ```
   http://localhost:3000/test-analytics.html
   ```

2. **Check browser console** for analytics loading status

3. **Use the test buttons** to verify event tracking

4. **Check Network tab** for requests to `va.vercel-scripts.com`

5. **Deploy to Vercel** and check the analytics dashboard

### Dependencies

The following packages are required:
```json
{
  "@vercel/analytics": "^1.5.0",
  "@vercel/speed-insights": "^1.0.2"
}
```

### Configuration

Analytics are automatically enabled in both development and production environments for testing purposes.

### Troubleshooting

If analytics aren't working:

1. **Check the test page**: Visit `/test-analytics.html` to verify analytics are loading
2. **Check browser console**: Look for analytics-related log messages
3. **Check Network tab**: Look for requests to `va.vercel-scripts.com`
4. **Verify deployment**: Analytics only send data when deployed to Vercel
5. **Check content blockers**: Disable ad blockers that might block analytics
6. **Wait for data**: Analytics data may take 30 seconds to appear in dashboard

Common issues:
- **"Analytics not ready"**: Analytics are still loading, wait a few seconds
- **"Failed to load"**: Check internet connection and CDN availability
- **No data in dashboard**: Ensure you're on the production Vercel deployment

## Production Deployment

### Vercel (Recommended)
This application is optimized for Vercel deployment:

```bash
# Deploy to Vercel
npm run deploy
```

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed Vercel deployment instructions.

### Traditional Server
See [PRODUCTION_GUIDE.md](./PRODUCTION_GUIDE.md) for traditional server deployment instructions.

## Development

### Project Structure
```
├── app.js                 # Main client-side application
├── server.js              # Express server
├── config.js              # Server configuration
├── app-config.js          # Client configuration
├── middleware.js          # Security middleware
├── logger.js              # Server logging
├── app-logger.js          # Client logging
├── email-validator.js     # Email validation
├── sanitizer.js           # Input sanitization
├── routes.js              # Route configuration
├── vercel-analytics.js    # Vercel Analytics and Speed Insights
├── api/                   # API endpoints
│   └── validate-email.js  # Email validation API
└── styles.css             # Custom styles
```

### Available Scripts
- `npm start`: Start development server (Express)
- `npm run dev`: Start Vercel development server
- `npm run serve`: Start production server (Express)
- `npm run deploy`: Deploy to Vercel
- `npm test`: Run tests (if configured)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary software. All rights reserved.

## Support

For support, please contact the development team or refer to the documentation.