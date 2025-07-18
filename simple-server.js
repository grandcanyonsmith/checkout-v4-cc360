/**
 * Simple HTTP Server for Local Development
 * Uses Node.js built-in modules to avoid dependency issues
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;

// MIME types for different file extensions
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || 'text/plain';
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      return;
    }
    
    const mimeType = getMimeType(filePath);
    res.writeHead(200, { 
      'Content-Type': mimeType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(data);
  });
}

function handleApiRequest(req, res, pathname) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: 'Simple development server is running',
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      let data;
      try {
        data = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }
      
      if (pathname === '/api/validate-email') {
        const { email } = data;
        const isValid = email && email.includes('@') && email.includes('.');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          isValid,
          validationMethod: 'simple_dev_mock',
          risk: 'low',
          message: isValid ? 'Valid email' : 'Invalid email format'
        }));
        return;
      }
      
      if (pathname === '/api/create-subscription') {
        const { email, name, phone, subscriptionType, priceId } = data;
        console.log('Mock subscription created:', { email, name, subscriptionType, priceId });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          customerId: 'cus_dev_' + Date.now(),
          subscriptionId: 'sub_dev_' + Date.now(),
          message: 'Mock subscription created for development'
        }));
        return;
      }
      
      if (pathname === '/api/create-payment-intent') {
        const { amount, currency, subscription_type, price_id } = data;
        console.log('Mock payment intent created:', { amount, currency, subscription_type, price_id });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          client_secret: 'pi_dev_' + Date.now() + '_secret_dev',
          message: 'Mock payment intent created for development'
        }));
        return;
      }
    });
    return;
  }
  
  // Unknown API endpoint
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'API endpoint not found' }));
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // Handle API requests
  if (pathname.startsWith('/api/')) {
    handleApiRequest(req, res, pathname);
    return;
  }
  
  // Determine file path
  let filePath;
  if (pathname === '/' || pathname === '/index.html') {
    filePath = path.join(__dirname, 'index.html');
  } else {
    filePath = path.join(__dirname, pathname);
  }
  
  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // If file doesn't exist, serve index.html (SPA fallback)
      serveFile(res, path.join(__dirname, 'index.html'));
    } else {
      serveFile(res, filePath);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Simple development server running at http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🛒 Checkout page: http://localhost:${PORT}`);
  console.log('');
  console.log('⚠️  Note: This is a development server with mock API endpoints');
  console.log('   Real Stripe payments will not work with these mock endpoints');
  console.log(`   Press Ctrl+C to stop the server`);
}); 