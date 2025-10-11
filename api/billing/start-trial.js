import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { customerId, paymentMethodId, priceId, userInfo } = req.body;

    // Validate required fields
    if (!customerId || !paymentMethodId || !priceId || !userInfo?.email) {
      return res.status(400).json({ error: 'Missing required parameters for trial creation' });
    }

    // Basic validation for priceId format
    if (!/^[\w-]+$/.test(priceId)) {
      return res.status(400).json({ error: 'Invalid price ID format' });
    }

    // Verify the payment method belongs to the customer
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (paymentMethod.customer !== customerId) {
      return res.status(400).json({ error: 'Payment method does not belong to customer' });
    }

    // Set as default payment method for the customer
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId }
    });

    // Create subscription with 30-day trial
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: 30,
      default_payment_method: paymentMethodId,
      collection_method: 'charge_automatically',
      expand: ['latest_invoice'],
      metadata: {
        signup_source: 'course_creator_360_trial',
        user_info: JSON.stringify(userInfo),
        affiliateId: userInfo.affiliateId || '',
        referrer: userInfo.referrer || '',
        campaign: userInfo.campaign || '',
        trial_started: new Date().toISOString()
      }
    });

    // Optional: send lead immediately to HighLevel
    try {
      if (process.env.GHL_API_KEY) {
        await fetch('https://rest.gohighlevel.com/v1/leads/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            firstName: userInfo.name,
            email: userInfo.email,
            phone: userInfo.phone,
            affiliateId: userInfo.affiliateId || '',
            referrer: userInfo.referrer || '',
            campaign: userInfo.campaign || ''
          })
        });
        console.log(`Lead sent to GHL for ${userInfo.email}, affiliate: ${userInfo.affiliateId}`);
      }
    } catch (ghlError) {
      console.error('GHL API error:', ghlError);
    }

    // Log subscription creation
    console.log(`Trial subscription created for ${userInfo.email}, affiliate: ${userInfo.affiliateId}`);

    res.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      nextBillingDate: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      amount: subscription.items.data[0].price.unit_amount,
      currency: subscription.items.data[0].price.currency
    });

  } catch (error) {
    console.error('Stripe error:', error);

    let message = 'An error occurred processing your request';
    let statusCode = 500;

    if (error.type === 'StripeCardError') {
      message = error.message;
      statusCode = 400;
    } else if (error.type === 'StripeInvalidRequestError') {
      message = 'Invalid request parameters';
      statusCode = 400;
    }

    res.status(statusCode).json({
      error: message,
      type: error.type || 'unknown_error'
    });
  }
}
