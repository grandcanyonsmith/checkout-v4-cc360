# Vercel Identity Validation Fix Guide

## 🚨 Issue Summary

The name identity validation is not working in Vercel because the `/api/verify-phone` endpoint was not calling the Lambda function for Twilio Identity Match. Additionally, there are Stripe configuration issues causing payment errors.

## 🔧 Fixes Applied

### 1. Updated `/api/verify-phone.js`

The API endpoint now properly calls the Lambda function for identity matching:

```javascript
// Call Lambda endpoint for Twilio Identity Match
const lambdaResponse = await fetch('https://6md7xnb5zegjqwkos5lpihtkoy0xpnki.lambda-url.us-west-2.on.aws/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    identity_phone_number: formattedPhone,
    first_name: firstName || '',
    last_name: lastName || ''
  })
});
```

### 2. Identity Match Flow

The validation now follows this logic:
- **Summary Score ≥ 80**: Strong identity match → Green checkmark ✓
- **Summary Score 40-79**: Partial identity match → Green checkmark ✓
- **Summary Score 21-39**: Weak identity match → Green checkmark ✓
- **Summary Score ≤ 20**: No match → Red X ✗ + Identity verification required

## 📋 Deployment Checklist

### 1. Environment Variables in Vercel

Ensure these are set in your Vercel project settings:

```bash
# Required for Stripe
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# Required for Twilio (optional, for fallback)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Required for Mailgun (optional)
MAILGUN_API_KEY=your_mailgun_api_key
```

### 2. Verify API Routes

Check that these endpoints are accessible:
- `https://your-domain.vercel.app/api/verify-phone`
- `https://your-domain.vercel.app/api/verify-identity`
- `https://your-domain.vercel.app/api/create-subscription`
- `https://your-domain.vercel.app/api/validate-email`

### 3. Test Identity Validation

```bash
# Test the identity validation endpoint
curl -X POST https://your-domain.vercel.app/api/verify-phone \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "8016237654",
    "firstName": "Colby",
    "lastName": "Smith"
  }'
```

Expected response should include identity match data:
```json
{
  "success": true,
  "isValid": false,
  "requiresVerification": true,
  "identityMatch": {
    "first_name_match": "no_match",
    "last_name_match": "no_match",
    "summary_score": 0
  }
}
```

## 🔍 Debugging Stripe Issues

The Stripe errors indicate a mismatch between the publishable key and the secret key. To fix:

1. **Verify Stripe Keys Match**:
   - The publishable key in `app-config.js` must match the secret key in Vercel env vars
   - Both must be from the same Stripe account (test or live)

2. **Check Stripe Mode**:
   - If using test keys (pk_test_...), ensure secret key is also test (sk_test_...)
   - If using live keys (pk_live_...), ensure secret key is also live (sk_live_...)

3. **Update Stripe Configuration**:
   ```javascript
   // In app-config.js
   stripe: {
     publishableKey: 'pk_test_YOUR_CORRECT_KEY_HERE'
   }
   ```

## 🚀 Deployment Steps

1. **Push the updated code**:
   ```bash
   git add api/verify-phone.js
   git commit -m "Fix: Add Lambda integration for identity validation in Vercel"
   git push origin main
   ```

2. **Verify deployment in Vercel dashboard**:
   - Check build logs for any errors
   - Verify all API routes are created
   - Test the endpoints using the Vercel Functions tab

3. **Monitor logs**:
   - Check Vercel Functions logs for any errors
   - Look for Lambda API call failures
   - Monitor identity match scores

## 📊 Testing the Complete Flow

1. **Open your Vercel deployment**
2. **Fill out the form**:
   - Enter a name and phone number
   - Complete the password field
3. **Watch for validation**:
   - Should see visual indicators (✓ or ✗)
   - If score ≤ 20, verification modal should appear
4. **Check browser console** for any errors

## 🆘 Troubleshooting

### If identity validation still doesn't work:

1. **Check Lambda endpoint**:
   ```bash
   curl -X POST https://6md7xnb5zegjqwkos5lpihtkoy0xpnki.lambda-url.us-west-2.on.aws/ \
     -H "Content-Type: application/json" \
     -d '{
       "identity_phone_number": "+18016237654",
       "first_name": "Colby",
       "last_name": "Smith"
     }'
   ```

2. **Check Vercel Function logs**:
   - Go to Vercel dashboard → Functions tab
   - Look for errors in `/api/verify-phone` logs

3. **Verify CORS headers**:
   - The `vercel.json` should have proper CORS configuration
   - API endpoints should return Access-Control headers

### Common Issues:

- **"Failed to fetch"**: Usually CORS or network issues
- **"Lambda timeout"**: Lambda function may be cold starting
- **"Invalid phone format"**: Ensure phone number is properly formatted
- **Stripe errors**: Mismatch between publishable and secret keys

## 📝 Next Steps

1. Deploy the fix to Vercel
2. Test the identity validation flow
3. Fix Stripe configuration if payment errors persist
4. Monitor logs for any issues

For additional support, check the Vercel Functions documentation or contact support with specific error messages from the logs. 