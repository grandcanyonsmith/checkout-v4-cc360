/**
 * Simple Development Server
 * Serves the checkout page locally for development and testing
 */

const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Simple health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Development server is running',
    timestamp: new Date().toISOString()
  });
});

// Mock email validation endpoint
app.post('/api/validate-email', (req, res) => {
  const { email } = req.body;
  
  // Simple validation for development
  const isValid = email && email.includes('@') && email.includes('.');
  
  res.json({
    success: true,
    isValid,
    validationMethod: 'dev_mock',
    risk: 'low',
    message: isValid ? 'Valid email' : 'Invalid email format'
  });
});

// Mock subscription creation for development
app.post('/api/create-subscription', (req, res) => {
  const { email, name, phone, subscriptionType, priceId } = req.body;
  
  console.log('Mock subscription created:', { email, name, subscriptionType, priceId });
  
  res.json({
    success: true,
    customerId: 'cus_dev_' + Date.now(),
    subscriptionId: 'sub_dev_' + Date.now(),
    message: 'Mock subscription created for development'
  });
});

// Mock payment intent creation for development
app.post('/api/create-payment-intent', (req, res) => {
  const { amount, currency, subscription_type, price_id } = req.body;
  
  console.log('Mock payment intent created:', { amount, currency, subscription_type, price_id });
  
  res.json({
    success: true,
    client_secret: 'pi_dev_' + Date.now() + '_secret_dev',
    message: 'Mock payment intent created for development'
  });
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle all other routes by serving the main page (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Development server running at http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🛒 Checkout page: http://localhost:${PORT}`);
  console.log('');
  console.log('⚠️  Note: This is a development server with mock API endpoints');
  console.log('   Real Stripe payments will not work with these mock endpoints');
}); 