import Stripe from "stripe";
import { buffer } from "micro";
import axios from 'axios';

// Initialize Stripe with the dedicated API key.
const stripe = new Stripe(process.env.JI_UPWORK_STRIPE_API, {
  apiVersion: "2023-10-16",
});

// Required for Vercel to handle the raw body data
export const config = {
  api: {
    bodyParser: false,
  },
};

// --- ASYNC FUNCTION: Fetches Customer and executes GHL logic (The Fix) ---
async function fetchCustomerAndProcessGHL(customerId, subscriptionId) {
    // 1. CRITICAL STEP: Fetch the full Customer object from Stripe
    if (!customerId) {
      console.error("Missing Customer ID. Aborting GHL call.");
      return;
    }

    let customer;
    try {
      // This ensures we get all the data, including metadata, guaranteed to be on Stripe's server.
      customer = await stripe.customers.retrieve(customerId);
    } catch (error) {
      console.error("Failed to retrieve Customer from Stripe:", error.message);
      return;
    }

    // 2. Data Extraction from the guaranteed source (Customer object and Metadata)
    const name = customer.name || "Unknown";
    const email = customer.email || "No email";
    
    // Use data stored in metadata (from create-customer.js) if available, otherwise use customer object fields.
    const phone = customer.phone || customer.metadata.phone || "No phone"; 
    
    // Affiliate ID is stored in metadata as 'affiliate_id' by create-customer.js
    const affiliateId = customer.metadata.affiliate_id || 'none'; 
    
    // Extract names (safeguard)
    const nameParts = name.split(' ');
    const firstName = customer.metadata.firstName || nameParts[0] || name;
    const lastName = customer.metadata.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : "");
    
    console.log("Processing customer (Guaranteed Data):", { firstName, lastName, email, phone, affiliateId });

    if (email === "No email") {
      // This error should ideally no longer happen.
      return console.error("Skipping GHL call: Email is missing even after full customer retrieval.");
    }
    
    // 3. GHL Logic Execution
    try { 
      const GHL_ENDPOINT = "https://rest.gohighlevel.com/v1/contacts/";
      const GHL_API_KEY = process.env.JI_GHL_API;
      const GHL_LOCATION_ID = process.env.JI_GHL_LOCATION_ID;

      if (!GHL_LOCATION_ID) {
         return console.error("GHL Location ID missing (JI_GHL_LOCATION_ID). Aborting GHL call.");
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

      console.log("Attempting to send guaranteed payload to GHL.");
      
      // CRITICAL: This Axios call must complete synchronously before returning 200 OK.
      try {
         const ghlResponse = await axios.post(GHL_ENDPOINT, ghlPayload, {
           headers: {
             "Content-Type": "application/json",
             Authorization: `Bearer ${GHL_API_KEY}`,
           },
           timeout: 10000, // 10-second timeout
         });

         // AXIOS Success Logging (GHL responded with 200/201)
         console.log("GHL Response Status:", ghlResponse.status);
         console.log("GHL contact created/updated successfully.");

      } catch (axiosError) {
         // CRITICAL: CATCHING ALL AXIOS ERRORS
         if (axiosError.response) {
            console.error("GHL API failed (AXIOS):", axiosError.response.status, axiosError.response.data);
         } else if (axiosError.request) {
            console.error("CRITICAL AXIOS NETWORK ERROR:", "No response received from GHL endpoint (Timeout/DNS).");
         } else {
            console.error("CRITICAL AXIOS SETUP ERROR:", axiosError.message);
         }
      }
    } catch (innerErr) {
      console.error("Internal Error during GHL processing:", innerErr);
    }
}
// --- END ASYNC FUNCTION ---


export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  // 1. Webhook Verification Setup
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.JI_UPWORK_STRIPE_WEBHOOK; // Use the secret for this specific endpoint

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
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 3. Process the Event SYNCHRONOUSLY
  if (
    event.type === "checkout.session.completed" ||
    event.type === "customer.subscription.created"
  ) {
    // Extract IDs needed for guaranteed retrieval
    const customerId = event.data.object.customer;
    const subscriptionId = event.type === "customer.subscription.created" ? event.data.object.id : null;
    
    // KEY CHANGE: Use the new function that guarantees data retrieval
    await fetchCustomerAndProcessGHL(customerId, subscriptionId);
  } else if (event.type === "invoice.payment_succeeded") {
    // Ignore successful renewal payments to prevent duplicate contact creation.
    console.log("Subscription renewed (invoice.payment_succeeded). Ignoring GHL contact creation.");
  } else {
    console.log("Ignoring non-relevant event type:", event.type);
  }

  // 4. Respond 200 OK after ALL synchronous processing (including GHL) is done.
  return res.status(200).json({ received: true });
}