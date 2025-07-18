# Production Deployment Guide

This guide covers everything you need to deploy the Course Creator 360 Checkout to production safely.

## 🚀 Production Checklist

### 1. Environment Variables

Create a `.env` file with these required variables:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Stripe Configuration (Required)
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY
STRIPE_SECRET_KEY=sk_live_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET

# Mailgun Configuration (Optional but recommended)
MAILGUN_API_KEY=your_api_key
MAILGUN_DOMAIN=your_domain

# URLs
BASE_URL=https://checkout.coursecreator360.com
REDIRECT_URL=https://link.coursecreator360.com/widget/bookings/cc360/onboarding

# Security
SESSION_SECRET=generate-a-long-random-string
CORS_ORIGIN=https://coursecreator360.com

# Logging
LOG_LEVEL=error
```

### 2. Security Hardening

#### API Keys
- ⚠️ **Never commit API keys to version control**
- Rotate any exposed keys immediately
- Use environment variables for all sensitive data

#### HTTPS
- Always use HTTPS in production
- Configure SSL certificates properly
- Redirect HTTP to HTTPS

#### Headers
The middleware automatically sets these security headers:
- Strict-Transport-Security
- X-Frame-Options
- X-XSS-Protection
- X-Content-Type-Options
- Content-Security-Policy
- Referrer-Policy

### 3. Performance Optimizations

#### Client-Side
- Minify JavaScript and CSS files
- Enable Gzip/Brotli compression
- Use CDN for static assets
- Implement caching headers

#### Server-Side
- Use a process manager (PM2, Forever)
- Enable Node.js clustering
- Configure reverse proxy (Nginx/Apache)
- Set up health checks

### 4. Monitoring Setup

#### Error Tracking
1. Configure a service like Sentry:
```javascript
// In server.js
if (config.server.isProduction) {
  const Sentry = require("@sentry/node");
  Sentry.init({ dsn: process.env.SENTRY_DSN });
}
```

2. Client-side error tracking is built-in via `app-logger.js`

#### Performance Monitoring
- Use services like New Relic or Datadog
- Monitor server metrics (CPU, memory, response times)
- Set up alerts for critical issues

### 5. Database Considerations

Although this app doesn't use a database, if you add one:
- Use connection pooling
- Implement proper indexing
- Set up regular backups
- Use read replicas for scaling

## 📦 Deployment Options

### Option 1: Traditional VPS

```bash
# Install dependencies
npm ci --production

# Build assets (if using build tools)
npm run build

# Start with PM2
pm2 start server.js -i max --name cc360-checkout
pm2 save
pm2 startup
```

### Option 2: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### Option 3: Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Configure `vercel.json`:
```json
{
  "functions": {
    "api/*.js": {
      "maxDuration": 10
    }
  },
  "env": {
    "MAILGUN_API_KEY": "@mailgun_api_key"
  }
}
```
3. Deploy: `vercel --prod`

### Option 4: Heroku

```bash
# Create app
heroku create cc360-checkout

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set STRIPE_SECRET_KEY=sk_live_...

# Deploy
git push heroku main
```

## 🔧 Configuration Details

### Rate Limiting
Default: 100 requests per 15 minutes per IP
Adjust in `config.js`:
```javascript
security: {
  rateLimitWindow: 15 * 60 * 1000,
  rateLimitMax: 100
}
```

### Logging
Production logs only errors by default.
To enable debug logging temporarily:
```bash
LOG_LEVEL=debug node server.js
```

### CORS
Configure allowed origins in production:
```bash
CORS_ORIGIN=https://coursecreator360.com,https://app.coursecreator360.com
```

## 🧪 Testing in Production

### Health Check
```bash
curl https://checkout.coursecreator360.com/api/health
```

### Test Webhook
```bash
stripe listen --forward-to https://checkout.coursecreator360.com/api/webhook
```

### Load Testing
```bash
# Install Artillery
npm install -g artillery

# Run load test
artillery quick --count 100 --num 10 https://checkout.coursecreator360.com
```

## 📊 Metrics to Monitor

1. **Response Times**
   - Target: < 200ms for API endpoints
   - Alert: > 500ms

2. **Error Rates**
   - Target: < 0.1%
   - Alert: > 1%

3. **Conversion Rate**
   - Track checkout completion rate
   - Monitor abandonment points

4. **Security**
   - Failed authentication attempts
   - Rate limit violations
   - Suspicious patterns

## 🚨 Incident Response

### If Payment Fails
1. Check Stripe dashboard for errors
2. Verify webhook endpoint is working
3. Check server logs for exceptions
4. Test with Stripe CLI

### If Site is Down
1. Check server status
2. Verify DNS settings
3. Check SSL certificate expiration
4. Review recent deployments

### If Performance Degrades
1. Check server resources
2. Review database queries (if applicable)
3. Check for memory leaks
4. Analyze traffic patterns

## 📚 Maintenance

### Regular Tasks
- **Daily**: Check error logs
- **Weekly**: Review metrics
- **Monthly**: Update dependencies
- **Quarterly**: Security audit

### Update Process
```bash
# Create backup
cp -r /path/to/app /path/to/backup

# Update code
git pull origin main

# Install dependencies
npm ci --production

# Run tests
npm test

# Restart server
pm2 reload cc360-checkout
```

## 🔐 Security Best Practices

1. **API Keys**
   - Use separate keys for dev/staging/production
   - Implement key rotation schedule
   - Audit key usage regularly

2. **Dependencies**
   - Run `npm audit` regularly
   - Keep dependencies updated
   - Review dependency licenses

3. **Access Control**
   - Use least privilege principle
   - Implement 2FA for admin access
   - Audit access logs

4. **Data Protection**
   - Hash all PII as configured [[memory:2502111]]
   - Use secure sessions
   - Implement GDPR compliance

## 📞 Support Contacts

- **Stripe Support**: https://support.stripe.com
- **Mailgun Support**: https://help.mailgun.com
- **Server Issues**: [Your DevOps Contact]
- **Application Issues**: [Your Dev Team Contact]

## 🎯 Success Criteria

Your production deployment is successful when:
- ✅ All health checks pass
- ✅ Test transactions complete successfully
- ✅ Monitoring is active and alerting works
- ✅ Backup procedures are tested
- ✅ Team is trained on incident response
- ✅ Documentation is up to date

Remember: **Always test in staging before deploying to production!** 