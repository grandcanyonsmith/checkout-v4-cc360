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
    // Read customer and tracking data from the request Body
    const { email, name, phone, zipCode, metadata, affiliateId } = req.body;

    // Validate required fields
    if (!email || !name) {
      return res.status(400).json({ error: 'Missing required customer information' });
    }

    // CRITICAL FIX: Use 'affiliateId' (camelCase) and ensure a default value.
    const finalAffiliateId = affiliateId || 'none'; 
    const affiliateMetadata = { affiliateId: finalAffiliateId };

    // Check if customer already exists
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    let customer;
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
      
      // Update customer info if needed
      const updateData = {
        name,
        phone,
        metadata: {
          ...customer.metadata,
          ...metadata,
          // Incorporate the corrected affiliate metadata on UPDATE
          ...affiliateMetadata, 
          updated_at: new Date().toISOString()
        }
      };

      // Add address if provided
      if (zipCode) {
        updateData.address = {
          postal_code: zipCode,
          country: 'US'
        };
      }

      customer = await stripe.customers.update(customer.id, updateData);
    } else {
      // Create new customer
      const createData = {
        email,
        name,
        phone,
        metadata: {
          ...metadata,
          // Incorporate the corrected affiliate metadata on CREATE
          ...affiliateMetadata,
          created_at: new Date().toISOString()
        }
      };

      // Add address if provided
      if (zipCode) {
        createData.address = {
          postal_code: zipCode,
          country: 'US'
        };
      }

      customer = await stripe.customers.create(createData);
    }

    res.json({
      customerId: customer.id,
      email: customer.email
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