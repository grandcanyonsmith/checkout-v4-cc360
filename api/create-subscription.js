/**
 * Vercel Serverless Function for Creating Subscriptions
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, name, phone, subscriptionType, priceId } = req.body;

    // Create customer
    const customer = await stripe.customers.create({
      email,
      name,
      phone,
      metadata: {
        source: 'checkout_page',
        subscription_type: subscriptionType
      }
    });

    // Create subscription
    const subscriptionParams = {
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent']
    };

    // Add trial period for monthly subscriptions
    if (subscriptionType === 'monthly') {
      subscriptionParams.trial_period_days = 30;
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams);

    // For trial subscriptions, there's no payment intent yet
    const response = {
      success: true,
      customerId: customer.id,
      subscriptionId: subscription.id
    };

    // Only add clientSecret if there's a payment intent (non-trial subscriptions)
    if (subscription.latest_invoice.payment_intent) {
      response.clientSecret = subscription.latest_invoice.payment_intent.client_secret;
    }

    res.json(response);

  } catch (error) {
    console.error('Subscription creation error:', error);
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Subscription creation failed' : error.message
    });
  }
};