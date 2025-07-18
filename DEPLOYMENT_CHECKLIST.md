# Vercel Deployment Checklist

## Pre-Deployment

- [ ] All environment variables configured in `.env`
- [ ] Stripe keys (publishable and secret) are valid
- [ ] Mailgun API key configured (optional)
- [ ] Build process runs successfully: `npm run build`
- [ ] Local development works: `npm run dev`

## Vercel Setup

- [ ] Vercel CLI installed: `npm i -g vercel`
- [ ] Logged into Vercel: `vercel login`
- [ ] Project linked: `vercel link` (optional)

## Environment Variables in Vercel

Set these in your Vercel project dashboard:

### Required
- [ ] `STRIPE_SECRET_KEY` - Your Stripe secret key
- [ ] `STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key  
- [ ] `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret

### Optional
- [ ] `MAILGUN_API_KEY` - For email validation
- [ ] `NODE_ENV` - Set to "production"

## Deployment

- [ ] Run build: `npm run build`
- [ ] Deploy: `npm run deploy` or `vercel --prod`
- [ ] Verify deployment URL works
- [ ] Test API endpoints: `npm test`

## Post-Deployment

- [ ] Configure Stripe webhook endpoint with your Vercel URL
- [ ] Test complete checkout flow
- [ ] Verify email validation works
- [ ] Check Vercel function logs for any errors
- [ ] Set up custom domain (optional)

## File Structure Check

Your project should have:
```
├── api/                    # Serverless functions
│   ├── create-payment-intent.js
│   ├── create-subscription.js
│   ├── health.js
│   ├── validate-email.js
│   └── webhook.js
├── public/                 # Static files (created by build)
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   └── ...
├── vercel.json            # Vercel configuration
├── package.json           # Dependencies and scripts
└── .env                   # Environment variables (local only)
```

## Testing Commands

```bash
# Build the project
npm run build

# Test locally
npm run dev

# Test deployment
npm test

# Deploy to production
npm run deploy
```

## Common Issues

1. **"public directory not found"** → Run `npm run build`
2. **API functions not working** → Check environment variables
3. **Webhook errors** → Verify webhook secret and endpoint URL
4. **CORS issues** → Check vercel.json headers configuration

## Success Indicators

- ✅ Vercel deployment completes without errors
- ✅ Main page loads at your Vercel URL
- ✅ API health check returns 200: `/api/health`
- ✅ Email validation works: `/api/validate-email`
- ✅ No console errors in browser
- ✅ Stripe integration functional