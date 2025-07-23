export default function handler(req, res) {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Course Creator 360 Billing API',
    stripe_connected: !!process.env.STRIPE_SECRET_KEY
  });
} 