import Stripe from "stripe";
import { buffer } from "micro";
import axios from 'axios';

// Initialize Stripe using the existing environment variable name: JI_UPWORK_STRIPE_API
const stripe = new Stripe(process.env.JI_UPWORK_STRIPE_API, {
  apiVersion: "2023-10-16",
});

// GHL API Key and the new dedicated Renewal Webhook URL, named consistently
const GHL_API_KEY = process.env.JI_GHL_API;
const GHL_RENEWAL_WEBHOOK_URL = process.env.JI_UPWORK_GHL_RENEWAL_WEBHOOK_URL; 

// Required for Vercel to handle the raw body data
export const config = {
  api: {
    bodyParser: false,
  },
};

// -----------------------------------------------------------------------
// --- GHL TRANSACTION FUNCTION (FOR RENEWALS) ---
// -----------------------------------------------------------------------
/**
 * Sends a transaction record to GoHighLevel via a dedicated webhook.
 * This ensures the revenue is logged and commission is tracked using the am_id.
 * @param {object} transactionData - Data including customerId, amount, and affiliateId.
 */
async function sendRenewalTransactionToGHL(transactionData) {
    if (!GHL_RENEWAL_WEBHOOK_URL) {
        console.error("JI_UPWORK_GHL_RENEWAL_WEBHOOK_URL is not set. Cannot record renewal transaction.");
        return;
    }
    
    console.log("Preparing GHL Renewal Transaction Payload:", transactionData);

    try {
        // This hits a dedicated GHL Webhook designed to create an Opportunity/Transaction
        // and attribute the commission using the am_id.
        const response = await axios.post(GHL_RENEWAL_WEBHOOK_URL, {
            // These keys should match what your GHL workflow webhook expects
            stripeCustomerId: transactionData.customerId,
            renewalAmount: transactionData.amount,
            am_id: transactionData.affiliateId, // CRITICAL: This links the commission
            renewalDate: new Date().toISOString(),
            status: 'renewal_succeeded',
        });

        console.log(`GHL Renewal Webhook Response Status: ${response.status}`);
        console.log("GHL Renewal Transaction successfully recorded.");
        
    } catch (error) {
        console.error("GHL Renewal Webhook failed:", error.response ? error.response.data : error.message);
    }
}


// -----------------------------------------------------------------------
// --- ASYNC FUNCTION: Fetches Customer and executes GHL logic (Initial Signup) ---
// -----------------------------------------------------------------------
async function fetchCustomerAndProcessGHL(customerId, subscriptionId) {
    // 1. CRITICAL STEP: Fetch the full Customer object from Stripe
    if (!customerId) {
      console.error("Missing Customer ID. Aborting GHL call.");
      return;
    }

    let customer;
    try {
      customer = await stripe.customers.retrieve(customerId);
    } catch (error) {
      console.error("Failed to retrieve Customer from Stripe:", error.message);
      return;
    }

    // 2. Data Extraction
    const name = customer.name || "Unknown";
    const email = customer.email || "No email";
    const phone = customer.phone || customer.metadata.phone || "No phone"; 
    
    // ✅ KRITIČNA ISPAVKA: Proveravamo 'affiliateId' (camelCase) PRVO, pa 'affiliate_id' (legacy)
    const affiliateId = customer.metadata.affiliateId || customer.metadata.affiliate_id || 'none'; 
    
    // Extract names 
    const nameParts = name.split(' ');
    const firstName = customer.metadata.firstName || nameParts[0] || name;
    const lastName = customer.metadata.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : "");
    
    if (email === "No email") {
      return console.error("Skipping GHL call: Email is missing even after full customer retrieval.");
    }
    
    // 3. GHL Logic Execution
    try { 
      const GHL_ENDPOINT = "https://rest.gohighlevel.com/v1/contacts/";
      const GHL_LOCATION_ID = process.env.JI_GHL_LOCATION_ID;

      if (!GHL_LOCATION_ID || !GHL_API_KEY) {
         return console.error("GHL credentials missing. Aborting initial contact creation.");
      }

      const ghlPayload = {
          email,
          firstName: firstName, 
          lastName: lastName, 
          phone: phone ? phone.replace(/\D/g, '') : undefined, 
          locationId: GHL_LOCATION_ID, 
          source: "Stripe Checkout/Subscription",
          // Affiliate tracking tag
          tags: ["Stripe", "CC360", `affiliate-${affiliateId}`],
          // Add subscription ID for better tracking in GHL
          customField: { 
            subscription_id: subscriptionId 
          }
      };

      console.log("Attempting to send guaranteed payload to GHL for initial contact creation/update.");
      
      try {
         const ghlResponse = await axios.post(GHL_ENDPOINT, ghlPayload, {
           headers: {
             "Content-Type": "application/json",
             Authorization: `Bearer ${GHL_API_KEY}`,
           },
           timeout: 10000,
         });

         console.log("GHL contact successfully created/updated.");

      } catch (axiosError) {
         console.error("GHL API failed during initial contact processing.");
      }
    } catch (innerErr) {
      console.error("Internal Error during GHL processing:", innerErr);
    }
}


// -----------------------------------------------------------------------
// --- MAIN WEBHOOK HANDLER ---
// -----------------------------------------------------------------------
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  // 1. Webhook Verification Setup
  const sig = req.headers["stripe-signature"];
  // Using the existing environment variable name: JI_UPWORK_STRIPE_WEBHOOK
  const endpointSecret = process.env.JI_UPWORK_STRIPE_WEBHOOK;

  if (!endpointSecret) {
    console.error("Webhook secret missing (JI_UPWORK_STRIPE_WEBHOOK)");
    return res.status(500).send("Webhook secret not configured");
  }

  let event;
  const rawBody = await buffer(req);

  // 2. Verify Stripe Signature
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    console.log("Webhook verified successfully. Event type:", event.type);
  } catch (err) {
    console.error("Stripe signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 3. Process the Event
  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "customer.subscription.created":
        // Initial Signup: Call the function that guarantees contact creation/update
        const customerId = event.data.object.customer;
        const subscriptionId = event.type === "customer.subscription.created" ? event.data.object.id : null;
        
        await fetchCustomerAndProcessGHL(customerId, subscriptionId);
        break;

      case "invoice.payment_succeeded":
        // === FIX: Handle Subscription Renewal Transaction (Affiliate Commission Tracking) ===
        const invoice = event.data.object;
        
        // Check if this is a recurring renewal payment
        if (invoice.billing_reason === 'subscription_cycle' && invoice.status === 'paid') {
            
            const renewalCustomerId = invoice.customer;
            const amount = invoice.amount_paid / 100; // Convert cents to dollars
            
            // Fetch customer again to retrieve metadata (affiliate_id)
            const customer = await stripe.customers.retrieve(renewalCustomerId);
            
            // ✅ KRITIČNA ISPAVKA: Proveravamo 'affiliateId' (camelCase) PRVO, pa 'affiliate_id' (legacy)
            const affiliateId = customer.metadata.affiliateId || customer.metadata.affiliate_id; 
            
            if (!affiliateId) {
                console.warn(`Renewal processed, but affiliate ID missing for customer ${renewalCustomerId}. Will use 'none'.`);
            }

            // Send transaction data to GHL Webhook
            await sendRenewalTransactionToGHL({
                customerId: renewalCustomerId,
                amount: amount,
                affiliateId: affiliateId || 'none', // Use stored ID or 'none'
            });

            console.log(`Renewal transaction recorded. Amount: $${amount}. AM_ID: ${affiliateId || 'none'}.`);
            
        } else {
            // Ignore non-renewal payments (e.g., failed payments, one-time fees, etc.)
            console.log("Ignoring non-renewal or unpaid invoice.");
        }
        break;

      default:
        console.log("Ignoring non-relevant event type:", event.type);
    }

    // 4. Respond 200 OK after ALL synchronous processing is done.
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error(`Error processing webhook event: ${err.message}`);
    // Returning a 500 error signals Stripe to retry the webhook
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}