import Stripe from "stripe";
import { buffer } from "micro";

const stripe = new Stripe(process.env.JI_UPWORK_STRIPE_API, {
  apiVersion: "2025-07-30",
});

export const config = {
  api: {
    bodyParser: false, // required for webhook verification
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.JI_UPWORK_STRIPE_WEBHOOK;

  if (!endpointSecret) {
    console.error("Webhook secret missing");
    return res.status(500).send("Webhook secret not configured");
  }

  let event;
  try {
    const rawBody = await buffer(req);

    console.log(
      "Raw payload (first 300 chars):",
      rawBody.toString("utf8").slice(0, 300)
    );
    console.log("Stripe signature header:", sig);

    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    console.log("Webhook verified:", event.type);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Respond 200 immediately so Stripe does not retry
  res.status(200).json({ received: true });

  // Process the event asynchronously
  (async () => {
    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const name = session.customer_details?.name || "Unknown";
        const email = session.customer_details?.email || "No email";
        const phone = session.customer_details?.phone || "No phone";

        console.log("Processing Stripe customer:", { name, email, phone });

        try {
          console.log(
            "GHL API key preview:",
            process.env.JI_GHL_API?.slice(0, 5) + "..."
          );

          const ghlResponse = await fetch(
            "https://rest.gohighlevel.com/v1/contacts/",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.JI_GHL_API}`,
              },
              body: JSON.stringify({
                email,
                name,
                phone,
                source: "Stripe Checkout",
                tags: ["Stripe", "CourseCreator360"],
              }),
            }
          );

          console.log("GHL status:", ghlResponse.status);
          if (!ghlResponse.ok) {
            const text = await ghlResponse.text();
            console.error("GHL API failed:", text);
          } else {
            const data = await ghlResponse.json();
            console.log("GHL contact created:", data);
          }
        } catch (err) {
          console.error("Error sending data to GHL:", err);
        }
      } else {
        // Ignore all other event types, log them for debugging
        console.log("Ignoring non-relevant event type:", event.type);
      }
    } catch (err) {
      console.error("Async processing error:", err);
    }
  })();
}
