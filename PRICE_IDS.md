# Stripe Price IDs Configuration

## Current Price IDs

### Monthly Premium Plan
- **Price ID**: `price_1Rm28YBnnqL8bKFQEnVUozqo`
- **Amount**: $147.00 (14700 cents)
- **Interval**: Monthly
- **Trial**: 30 days
- **Currency**: USD

### Annual Premium Plan
- **Price ID**: `price_1RjSoDBnnqL8bKFQUorl1OKI`
- **Amount**: $1,470.00 (147000 cents)
- **Interval**: Annual
- **Trial**: None
- **Currency**: USD

## Files Updated

The following files have been updated with the new price IDs:

1. **`app-config.js`** - Client-side configuration
2. **`app.js`** - Main application logic
3. **`routes.js`** - API routes configuration
4. **`simple-server.js`** - Development server mock endpoints

## Testing

Both price IDs are now properly configured and tested:

### Monthly Subscription
```bash
curl -X POST http://localhost:3000/api/create-subscription \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "Test User", "subscriptionType": "monthly"}'
```

### Annual Subscription
```bash
curl -X POST http://localhost:3000/api/create-subscription \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "Test User", "subscriptionType": "annual"}'
```

## Production Deployment

When deploying to production:

1. Ensure these price IDs are active in your Stripe dashboard
2. Verify the amounts match your pricing strategy
3. Test both subscription flows in production environment
4. Monitor webhook events for successful subscriptions

## Previous Price IDs (Deprecated)

- `price_1QPF6eBnnqL8bKFQGvC5BUlm` (old monthly)
- `price_1QPF6eBnnqL8bKFQNV3JFSVh` (old annual)

These have been replaced with the new price IDs above.

---

**Last Updated**: July 18, 2025
**Environment**: Development & Production Ready 