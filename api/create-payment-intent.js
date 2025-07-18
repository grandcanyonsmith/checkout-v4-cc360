/**
 * Vercel Serverless Function for Creating Payment Intents
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
    const { amount, currency, subscription_type, price_id, customer_id, subscription_id, email, name, phone } = req.body;

    let customerId = customer_id;

    // If no customer_id provided, check if customer exists by email
    if (!customerId) {
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1
      });

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
        
        // Check for existing active subscriptions
        const existingSubscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: 'active',
          limit: 1
        });

        if (existingSubscriptions.data.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Customer already has an active subscription',
            existingSubscriptionId: existingSubscriptions.data[0].id
          });
        }

        // Check for pending subscriptions
        const pendingSubscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: 'incomplete',
          limit: 1
        });

        if (pendingSubscriptions.data.length > 0) {
          return res.status(400).json({
            success: false,
            error: 'Customer has a pending subscription that needs to be completed first',
            pendingSubscriptionId: pendingSubscriptions.data[0].id
          });
        }
      } else {
        // Create new customer
        const customer = await stripe.customers.create({
          email: email,
          name: name,
          phone: phone,
          metadata: {
            subscription_type,
            price_id
          }
        });
        customerId = customer.id;
      }
    } else {
      // Customer ID provided, check for existing subscriptions
      const existingSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1
      });

      if (existingSubscriptions.data.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Customer already has an active subscription',
          existingSubscriptionId: existingSubscriptions.data[0].id
        });
      }

      // Check for pending subscriptions
      const pendingSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'incomplete',
        limit: 1
      });

      if (pendingSubscriptions.data.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Customer has a pending subscription that needs to be completed first',
          pendingSubscriptionId: pendingSubscriptions.data[0].id
        });
      }
    }

    // For trial subscriptions, we need to pre-authorize the card for the full amount
    // but not capture the payment - this ensures the card is valid
    if (subscription_type === 'monthly') {
      // Create a Payment Intent for $147 pre-authorization (not captured)
      const preAuthAmount = 14700; // $147.00 in cents
      
      const paymentIntent = await stripe.paymentIntents.create({
        customer: customerId,
        amount: preAuthAmount,
        currency: 'usd',
        capture_method: 'manual', // Don't capture immediately
        confirm: false, // Don't confirm immediately
        payment_method_types: ['card'],
        payment_method_options: {
          card: {
            request_three_d_secure: 'automatic'
          }
        },
        metadata: {
          subscription_type,
          price_id,
          subscription_id: subscription_id || null,
          is_preauth: 'true',
          trial_subscription: 'true'
        }
      });

      res.json({
        success: true,
        client_secret: paymentIntent.client_secret,
        customer_id: customerId,
        is_preauth: true,
        preauth_amount: preAuthAmount
      });
    } else {
      // For annual subscriptions, charge the full amount immediately
      const paymentIntent = await stripe.paymentIntents.create({
        customer: customerId,
        amount,
        currency,
        payment_method_types: ['card'],
        payment_method_options: {
          card: {
            request_three_d_secure: 'automatic'
          }
        },
        metadata: {
          subscription_type,
          price_id,
          subscription_id: subscription_id || null
        }
      });

      res.json({
        success: true,
        client_secret: paymentIntent.client_secret,
        customer_id: customerId
      });
    }

  } catch (error) {
    console.error('Payment intent creation error:', error);
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Payment processing error' : error.message
    });
  }
};