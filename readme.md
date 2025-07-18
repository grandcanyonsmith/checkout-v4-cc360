# Course Creator 360 Checkout System

A modern, secure, and maintainable checkout system for Course Creator 360 with Stripe integration.

## 🚀 Quick Start

### Prerequisites
- Node.js 14.0.0 or higher
- Stripe account with API keys
- (Optional) Mailgun account for email validation

### Installation

1. Clone the repository:
```bash
git clone https://github.com/course-creator-360/checkout-v4-cc360.git
cd checkout-v4-cc360
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your actual API keys
```

4. Start the development server:
```bash
npm run dev  # Simple static server on port 8000
# OR
npm start    # Full Express server with API endpoints
```

## 📁 Project Structure

```
checkout-v4-cc360-1/
├── src/                    # Source code
│   ├── server/            # Server-side code
│   │   ├── server.js      # Main Express server
│   │   ├── middleware.js  # Express middleware
│   │   ├── routes.js      # API routes
│   │   ├── sanitizer.js   # Input sanitization
│   │   ├── performance-monitor.js
│   │   ├── serve.js       # Development static server
│   │   └── api/           # API endpoints
│   │       └── validate-email.js
│   ├── client/            # Client-side JavaScript
│   │   ├── app.js         # Main application
│   │   └── email-validator.js
│   └── shared/            # Shared utilities
│       ├── config.js      # Universal configuration
│       └── logger.js      # Universal logger
├── public/                # Static files
│   ├── index.html         # Main checkout page
│   └── styles.css         # Custom styles
├── docs/                  # Documentation
│   ├── SECURITY_SUMMARY.md
│   ├── PRODUCTION_GUIDE.md
│   └── ...
├── tests/                 # Test files
├── package.json
├── .env.example           # Environment template
└── README.md              # This file
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

#### Required Variables
- `STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret

#### Optional Variables
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `MAILGUN_API_KEY` - For email validation
- `SESSION_SECRET` - Session encryption key
- See `.env.example` for complete list

### Unified Configuration System

The project uses a unified configuration system (`src/shared/config.js`) that:
- Works in both Node.js and browser environments
- Automatically loads environment variables on the server
- Injects configuration into the client safely
- Validates required environment variables on startup

### Universal Logger

The universal logger (`src/shared/logger.js`) provides:
- Consistent logging across server and client
- Environment-aware log levels
- Structured JSON logging in production
- Client error reporting to server
- Automatic error tracking

## 🏗️ Architecture

### Server-Side
- Express.js server with security middleware
- Stripe integration for payment processing
- Environment-based configuration injection
- Rate limiting and security headers
- Comprehensive error handling

### Client-Side
- Vanilla JavaScript for maximum compatibility
- Real-time form validation
- Stripe Elements integration
- Progressive enhancement
- Automatic error reporting

### Security Features
- No hardcoded API keys or secrets
- Environment variable validation
- Input sanitization on all endpoints
- CSRF protection
- Rate limiting
- Security headers (HSTS, CSP, etc.)

## 📝 Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode

## 🚀 Deployment

### Vercel
The project is configured for Vercel deployment:
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### Other Platforms
1. Set all required environment variables
2. Run `npm install`
3. Run `npm start`
4. Configure reverse proxy if needed

## 🔒 Security

- All sensitive configuration is stored in environment variables
- Client-side code never contains secret keys
- Server injects only public configuration into HTML
- Comprehensive input validation and sanitization
- See `docs/SECURITY_SUMMARY.md` for details

## 🧪 Testing

Run tests with:
```bash
npm test
```

Tests cover:
- Payment flow integration
- Input validation
- Security measures
- Error handling

## 📚 Documentation

- [Security Summary](docs/SECURITY_SUMMARY.md) - Security measures and best practices
- [Production Guide](docs/PRODUCTION_GUIDE.md) - Production deployment guide
- [Email Validation](docs/EMAIL_VALIDATION_README.md) - Email validation setup

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure tests pass
5. Submit a pull request

## 📄 License

Private and confidential - Course Creator 360

---

For support or questions, contact the Course Creator 360 development team. 