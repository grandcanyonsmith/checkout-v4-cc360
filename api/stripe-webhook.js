import Stripe from "stripe";
import { buffer } from "micro";
import fetch from "node-fetch";

// Initialize Stripe client
const stripe = new Stripe(process.env.JI_UPWORK_STRIPE_API);

export const config = {
  api: {
    bodyParser: false, // Stripe requires the raw body for signature verification
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  // Read Stripe signature and webhook secret
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.JI_UPWORK_STRIPE_WEBHOOK;

  console.log("Stripe signature header:", sig);
  console.log("Webhook secret loaded:", endpointSecret ? "Loaded" : "Missing");

  if (!endpointSecret) {
    console.error("Webhook secret is missing. Set JI_UPWORK_STRIPE_WEBHOOK in Vercel env vars.");
    return res.status(500).send("Webhook secret not configured");
  }

  let event;

  try {
    // Get raw request body
    const rawBody = await buffer(req);
    console.log("Raw body length:", rawBody.length);

    // Verify Stripe webhook signature
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    console.log("Webhook verified successfully:", event.type);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    console.error("Raw signature header:", sig);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const name = session.customer_details?.name || "Unknown";
    const email = session.customer_details?.email || "No email";
    const phone = session.customer_details?.phone || "No phone";

    console.log("New Stripe customer:", { name, email, phone });

    try {
      const ghlResponse = await fetch("https://rest.gohighlevel.com/v1/contacts/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.JI_GHL_API}`,
        },
        body: JSON.stringify({
          email,
          name,
          phone,
          source: "Stripe Checkout",
          tags: ["Stripe", "CourseCreator360"],
        }),
      });

      if (!ghlResponse.ok) {
        const errorText = await ghlResponse.text();
        console.error("Failed to create GHL contact:", errorText);
      } else {
        const ghlData = await ghlResponse.json();
        console.log("GHL contact created:", ghlData);
      }
    } catch (err) {
      console.error("Error sending data to GHL:", err);
    }
  } else {
    console.log("Unhandled event type:", event.type);
  }

  // Respond to Stripe to acknowledge receipt
  res.status(200).json({ received: true });
}