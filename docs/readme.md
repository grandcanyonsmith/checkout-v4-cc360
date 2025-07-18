# Course Creator 360 Checkout

A production-ready checkout system for Course Creator 360 with Stripe integration, real-time email validation, and enhanced security features.

## Features

- **Secure Payment Processing**: Stripe integration with PaymentIntents and SetupIntents
- **Real-time Email Validation**: Mailgun API integration with typo suggestions
- **Enhanced Security**: Rate limiting, input sanitization, security headers
- **Production Ready**: Comprehensive logging, error handling, and monitoring
- **Responsive Design**: Modern UI with Tailwind CSS
- **Form Auto-save**: Automatic form data persistence
- **Analytics Integration**: Facebook Pixel and Google Analytics ready

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

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open your browser**
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

## Production Deployment

See [PRODUCTION_GUIDE.md](./PRODUCTION_GUIDE.md) for detailed deployment instructions.

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
├── api/                   # API endpoints
│   └── validate-email.js  # Email validation API
└── styles.css             # Custom styles
```

### Available Scripts
- `npm start`: Start development server
- `npm run serve`: Start production server
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