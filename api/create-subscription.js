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
    const { email, name, phone, subscriptionType, priceId, customerId } = req.body;

    let customer;

    // If customerId is provided, use existing customer, otherwise create new one
    if (customerId) {
      customer = await stripe.customers.retrieve(customerId);
      
      // Update customer information if needed
      await stripe.customers.update(customerId, {
        email,
        name,
        phone,
        metadata: {
          source: 'checkout_page',
          subscription_type: subscriptionType
        }
      });
    } else {
      // Check if customer already exists by email
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
        
        // Update customer information
        await stripe.customers.update(customer.id, {
          name,
          phone,
          metadata: {
            source: 'checkout_page',
            subscription_type: subscriptionType
          }
        });
      } else {
        // Create new customer
        customer = await stripe.customers.create({
          email,
          name,
          phone,
          metadata: {
            source: 'checkout_page',
            subscription_type: subscriptionType
          }
        });
      }
    }

    // Check for existing active subscriptions
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 100
    });

    // Check if customer already has an active subscription
    if (existingSubscriptions.data.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Customer already has an active subscription',
        existingSubscriptionId: existingSubscriptions.data[0].id,
        subscriptionStatus: existingSubscriptions.data[0].status
      });
    }

    // Check for pending subscriptions (incomplete, past_due, etc.)
    const pendingSubscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'incomplete',
      limit: 100
    });

    if (pendingSubscriptions.data.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Customer has a pending subscription that needs to be completed first',
        pendingSubscriptionId: pendingSubscriptions.data[0].id,
        subscriptionStatus: pendingSubscriptions.data[0].status
      });
    }

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