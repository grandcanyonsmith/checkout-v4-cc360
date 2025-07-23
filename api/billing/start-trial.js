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

    if (!customerId || !paymentMethodId || !priceId) {
      return res.status(400).json({ error: 'Missing required parameters for trial creation' });
    }

    // Verify the payment method belongs to the customer
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (paymentMethod.customer !== customerId) {
      return res.status(400).json({ error: 'Payment method does not belong to customer' });
    }

    // Set as default payment method for the customer
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });

    // Create subscription with 30-day trial
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ 
        price: priceId // This should be the $147/month price ID
      }],
      trial_period_days: 30,
      default_payment_method: paymentMethodId,
      collection_method: 'charge_automatically',
      expand: ['latest_invoice'],
      metadata: {
        signup_source: 'course_creator_360_trial',
        user_info: JSON.stringify(userInfo),
        trial_started: new Date().toISOString()
      }
    });

    res.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      trialEnd: new Date(subscription.trial_end * 1000).toISOString(),
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