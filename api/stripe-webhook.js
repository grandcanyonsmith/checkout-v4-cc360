import Stripe from "stripe";
import { buffer } from "micro";
import axios from 'axios'; // <-- CRITICAL: Using axios to bypass fetch network errors

// Initialize Stripe with the API key.
const stripe = new Stripe(process.env.JI_UPWORK_STRIPE_API, {
  apiVersion: "2023-10-16",
});

// Required for Vercel to handle the raw body data
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  // 1. Webhook Verification Setup
  const sig = req.headers["stripe-signature"];
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
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Respond 200 OK immediately
  res.status(200).json({ received: true });

  // 3. Process the Event Asynchronously
  (async () => {
    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        
        // Data Extraction
        const name = session.customer_details?.name || "Unknown";
        const email = session.customer_details?.email || "No email";
        const phone = session.customer_details?.phone || "No phone";
        
        const nameParts = name.split(' ');
        const firstName = nameParts[0] || name;
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : "";
        
        const affiliateId = session.metadata?.affiliateId || 'none'; 
        
        console.log("Processing customer:", { firstName, lastName, email, phone, affiliateId });

        // 4. Send Data to GoHighLevel (GHL)
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
              // Sanitize phone number to numeric-only format for GHL
              phone: phone.replace(/\D/g, ''), 
              locationId: GHL_LOCATION_ID, 
              source: "Stripe Checkout",
              tags: ["Stripe", "CC360", `affiliate-${affiliateId}`],
          };

          console.log("Attempting to send payload to GHL:", ghlPayload);
          
          let ghlResponse;
          try {
             // API Call to GHL using AXIOS
             ghlResponse = await axios.post(GHL_ENDPOINT, ghlPayload, {
               headers: {
                 "Content-Type": "application/json",
                 Authorization: `Bearer ${GHL_API_KEY}`,
               },
               timeout: 10000, // 10-second timeout
             });

             // AXIOS Success Logging
             console.log("GHL Response Status:", ghlResponse.status);
             console.log("GHL contact created/updated successfully:", ghlResponse.data);

          } catch (axiosError) {
             // CRITICAL: CATCHING ALL AXIOS ERRORS
             if (axiosError.response) {
                // GHL responded with an error (401, 422, 500)
                console.error("GHL API failed (AXIOS):", axiosError.response.status, axiosError.response.data);
             } else if (axiosError.request) {
                // Network error (DNS, Timeout, Firewall)
                console.error("CRITICAL AXIOS NETWORK ERROR:", "No response received from GHL endpoint (Timeout/DNS).");
             } else {
                // Setup error
                console.error("CRITICAL AXIOS SETUP ERROR:", axiosError.message);
             }
             return; 
          }
        } catch (innerErr) {
          console.error("Internal Error during GHL processing:", innerErr);
        }
      } else {
        console.log("Ignoring non-relevant event type:", event.type);
      }
    } catch (outerErr) {
      console.error("Async processing error:", outerErr);
    }
  })();
}