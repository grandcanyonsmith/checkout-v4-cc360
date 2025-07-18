# Vercel Deployment Guide

This application has been configured to run on Vercel as a serverless application.

## Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/your-repo)

## Manual Deployment

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

## Environment Variables

Set these environment variables in your Vercel dashboard:

### Required Variables
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret

### Optional Variables
- `MAILGUN_API_KEY` - For email validation (falls back to basic validation if not set)
- `NODE_ENV` - Set to "production" for production deployment

## Configuration Files

- `vercel.json` - Vercel configuration
- `api/` - Serverless functions directory
- `.env.example` - Environment variables template

## Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Run locally with Vercel dev server**
   ```bash
   npm run dev
   ```

This will start the Vercel development server with serverless functions at `http://localhost:3000`.

## Serverless Functions

The following API endpoints are available as serverless functions:

- `/api/create-payment-intent` - Creates Stripe payment intents
- `/api/create-subscription` - Creates Stripe subscriptions  
- `/api/validate-email` - Validates email addresses
- `/api/webhook` - Handles Stripe webhooks

## Static Files

All static files (HTML, CSS, JS) are served directly by Vercel's CDN.

## Webhook Configuration

After deployment, configure your Stripe webhook endpoint:
1. Go to Stripe Dashboard > Webhooks
2. Add endpoint: `https://your-domain.vercel.app/api/webhook`
3. Select events: `customer.subscription.*`, `invoice.payment_*`
4. Copy the webhook secret to your environment variables

## Domain Configuration

To use a custom domain:
1. Go to your Vercel project dashboard
2. Navigate to Settings > Domains
3. Add your custom domain
4. Update DNS records as instructed

## Performance

- Static files are served from Vercel's global CDN
- Serverless functions have cold start times but scale automatically
- Functions timeout after 10 seconds (configurable in vercel.json)

## Troubleshooting

### Common Issues

1. **Build fails with "public directory not found"**
   ```bash
   npm run build
   ```
   This creates the public directory with static files.

2. **API functions not working**
   - Check environment variables are set in Vercel dashboard
   - Verify function names match the file names in api/

3. **Webhook signature verification fails**
   - Ensure STRIPE_WEBHOOK_SECRET is set correctly
   - Check that webhook endpoint URL matches your Vercel domain

4. **CORS errors**
   - Headers are configured in vercel.json
   - Check browser network tab for specific CORS issues

### Testing Deployment

Run the test script to verify everything works:
```bash
npm test
```

Or test specific URL:
```bash
TEST_URL=https://your-app.vercel.app npm test
```

## Monitoring

Monitor your deployment:
- Vercel Dashboard for deployment logs and function metrics
- Stripe Dashboard for payment processing
- Browser DevTools for client-side issues
- Function logs in Vercel dashboard for serverless function debugging