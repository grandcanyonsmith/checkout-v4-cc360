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
    const { amount, currency, subscription_type, price_id, customer_id, subscription_id } = req.body;

    // For trial subscriptions (amount = 0), use Setup Intent instead of Payment Intent
    if (amount === 0) {
      const setupIntent = await stripe.setupIntents.create({
        customer: customer_id,
        automatic_payment_methods: { enabled: true },
        metadata: {
          subscription_type,
          price_id,
          subscription_id
        }
      });

      res.json({
        success: true,
        client_secret: setupIntent.client_secret
      });
    } else {
      const paymentIntent = await stripe.paymentIntents.create({
        customer: customer_id,
        amount,
        currency,
        automatic_payment_methods: { enabled: true },
        metadata: {
          subscription_type,
          price_id,
          subscription_id
        }
      });

      res.json({
        success: true,
        client_secret: paymentIntent.client_secret
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