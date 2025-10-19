// FIX: Initialize Stripe using the Vercel environment variable name
const stripe = require('stripe')(process.env.JI_UPWORK_STRIPE_API); 

// Handler function for the API route
module.exports = async (req, res) => {
  // Enforce POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Create a SetupIntent without a customer ID.
    // This is required by the Stripe Elements component on the frontend for initialization.
    const setupIntent = await stripe.setupIntents.create();

    // 2. Return the clientSecret
    res.status(200).json({
      clientSecret: setupIntent.client_secret,
    });

  } catch (error) {
    console.error('Error creating Setup Intent on load:', error);
    // Return a 500 status with an error message
    res.status(500).json({ 
        error: 'Failed to initialize Stripe. Please check the JI_UPWORK_STRIPE_API key.',
        details: error.message 
    });
  }
};