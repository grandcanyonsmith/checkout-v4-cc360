/**
 * Simple HTTP Server for Local Development
 * Uses Node.js built-in modules to avoid dependency issues
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Load environment variables only once at the top
require('dotenv').config({ quiet: true });

const PORT = process.env.PORT || 3000;

// Twilio configuration - log once at startup
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID || 'VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

console.log('Twilio configuration:', {
  hasAccountSid: !!TWILIO_ACCOUNT_SID,
  hasAuthToken: !!TWILIO_AUTH_TOKEN,
  hasVerifyServiceSid: !!VERIFY_SERVICE_SID,
  accountSid: TWILIO_ACCOUNT_SID ? TWILIO_ACCOUNT_SID.substring(0, 10) + '...' : 'not set'
});

// Rate limiting for Twilio requests
const twilioRequestTimestamps = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

function checkTwilioRateLimit(phone) {
  const now = Date.now();
  const timestamps = twilioRequestTimestamps.get(phone) || [];
  
  // Remove old timestamps
  const recentTimestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
  
  if (recentTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false; // Rate limit exceeded
  }
  
  recentTimestamps.push(now);
  twilioRequestTimestamps.set(phone, recentTimestamps);
  return true;
}

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

async function handleApiRequest(req, res, pathname) {
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
    
    req.on('end', async () => {
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
      
      // Identity verification endpoint
      if (pathname === '/api/verify-identity' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const { phone, action, code } = JSON.parse(body);
            
            if (!phone) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Phone number is required'
              }));
              return;
            }
            
            // Check rate limit
            if (!checkTwilioRateLimit(phone)) {
              res.writeHead(429, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Too many requests. Please wait before trying again.'
              }));
              return;
            }
            
            // Check if Twilio is configured

            if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
              console.warn('Twilio credentials not configured - using mock response');
              // Return mock success for development
              res.writeHead(200, { 'Content-Type': 'application/json' });
              if (action === 'send') {
                res.end(JSON.stringify({
                  success: true,
                  message: 'Mock: Verification code sent',
                  status: 'pending',
                  to: phone,
                  mock: true
                }));
              } else if (action === 'check') {
                res.end(JSON.stringify({
                  success: true,
                  valid: code === '123456', // Mock code for testing
                  status: code === '123456' ? 'approved' : 'pending',
                  message: code === '123456' ? 'Mock: Identity verified' : 'Mock: Invalid code',
                  mock: true
                }));
              }
              return;
            }
            
            // Clean and format phone number
            const cleanPhone = phone.replace(/\D/g, '');
            let formattedPhone = cleanPhone;
            if (cleanPhone.length === 10) {
              formattedPhone = `+1${cleanPhone}`;
            } else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
              formattedPhone = `+${cleanPhone}`;
            } else if (!cleanPhone.startsWith('+')) {
              formattedPhone = `+${cleanPhone}`;
            }
            
            try {
              if (action === 'send') {
                // Send verification code
                const params = new URLSearchParams({
                  To: formattedPhone,
                  Channel: 'sms'
                });
                
                const response = await fetch(`https://verify.twilio.com/v2/Services/${VERIFY_SERVICE_SID}/Verifications`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                  },
                  body: params
                });
                
                if (!response.ok) {
                  const errorText = await response.text();
                  console.error('Twilio Verify send error:', response.status, errorText);
                  res.writeHead(response.status, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({
                    success: false,
                    error: 'Failed to send verification code',
                    details: errorText
                  }));
                  return;
                }
                
                const verifyData = await response.json();
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  success: true,
                  message: 'Verification code sent',
                  status: verifyData.status,
                  to: verifyData.to,
                  serviceSid: verifyData.service_sid,
                  sid: verifyData.sid
                }));
                
              } else if (action === 'check') {
                // Check verification code
                if (!code) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({
                    success: false,
                    error: 'Verification code is required'
                  }));
                  return;
                }
                
                const params = new URLSearchParams({
                  To: formattedPhone,
                  Code: code
                });
                
                const response = await fetch(`https://verify.twilio.com/v2/Services/${VERIFY_SERVICE_SID}/VerificationCheck`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                  },
                  body: params
                });
                
                if (!response.ok) {
                  const errorText = await response.text();
                  console.error('Twilio Verify check error:', response.status, errorText);
                  res.writeHead(response.status, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({
                    success: false,
                    error: 'Failed to verify code',
                    details: errorText
                  }));
                  return;
                }
                
                const verifyData = await response.json();
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  success: true,
                  valid: verifyData.status === 'approved',
                  status: verifyData.status,
                  message: verifyData.status === 'approved' ? 'Identity verified successfully' : 'Invalid verification code'
                }));
                
              } else {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  success: false,
                  error: 'Invalid action. Use "send" or "check"'
                }));
              }
              
            } catch (twilioError) {
              console.error('Twilio API error:', twilioError);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: false,
                error: 'Twilio service error',
                details: twilioError.message
              }));
            }
            
          } catch (error) {
            console.error('Identity verification error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: error.message
            }));
          }
        });
        return;
      }
      
      // Phone verification endpoint (remove duplicate dotenv.config() call)
      if (pathname === '/api/verify-phone' && req.method === 'POST') {
        // Remove this line: require('dotenv').config();
        
        const { phone, firstName, lastName } = data;
        
        // Use Lambda endpoint for Twilio Identity Match
        try {
          const cleanPhone = phone.replace(/\D/g, '');
          let formattedPhone = cleanPhone;
          if (cleanPhone.length === 10) {
            formattedPhone = `+1${cleanPhone}`;
          } else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
            formattedPhone = `+${cleanPhone}`;
          } else if (!cleanPhone.startsWith('+')) {
            formattedPhone = `+${cleanPhone}`;
          }
          
          // Call Lambda endpoint
          const lambdaResponse = await fetch('https://6md7xnb5zegjqwkos5lpihtkoy0xpnki.lambda-url.us-west-2.on.aws/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              identity_phone_number: formattedPhone,
              first_name: firstName || '',
              last_name: lastName || ''
            })
          });
          
          if (lambdaResponse.ok) {
            const lambdaData = await lambdaResponse.json();
            
            if (lambdaData.success) {
              // Process Identity Match results
              let risk = 'low';
              let reason = null;
              let isValid = true;
              let requiresVerification = false;
              const summaryScore = lambdaData.summary_score || 0;
              
              // Determine risk and validity based on summary score
              if (summaryScore >= 80) {
                risk = 'low';
                reason = 'Strong identity match';
                isValid = true;
                requiresVerification = false;
              } else if (summaryScore >= 40) {
                risk = 'medium';
                reason = 'Partial identity match';
                isValid = true;
                requiresVerification = false;
              } else if (summaryScore > 20) {
                risk = 'high';
                reason = 'Weak identity match';
                isValid = true;
                requiresVerification = false;
              } else {
                // summaryScore <= 20 (including 20) requires verification
                risk = 'high';
                reason = 'Name does not match phone number. Please verify your identity.';
                isValid = false;
                requiresVerification = true;
              }
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                isValid,
                phoneNumber: formattedPhone,
                countryCode: 'US',
                risk,
                reason,
                requiresVerification,
                identityMatch: {
                  first_name_match: lambdaData.first_name_match,
                  last_name_match: lambdaData.last_name_match,
                  summary_score: lambdaData.summary_score
                },
                validationMethod: 'twilio_identity_match_lambda'
              }));
              return;
            } else {
              console.warn('Lambda returned error:', lambdaData.error);
            }
          } else {
            console.warn('Lambda API error:', lambdaResponse.status);
            const errorText = await lambdaResponse.text();
            console.error('Error details:', errorText);
          }
        } catch (error) {
          console.error('Lambda API error:', error);
        }
        
        // Fallback to mock validation
        const cleanPhone = phone.replace(/\D/g, '');
        const isValid = cleanPhone.length >= 10;
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          isValid,
          validationMethod: 'simple_dev_mock',
          risk: 'low',
          message: isValid ? 'Valid phone number' : 'Invalid phone number format',
          phoneNumber: phone,
          countryCode: 'US',
          lineType: 'mobile',
          carrier: 'Mock Carrier'
        }));
        return;
      }
      
      if (pathname === '/api/create-subscription') {
        const { email, name, phone, subscriptionType, priceId } = data;
        
        // Map subscription types to actual price IDs
        const priceIdMap = {
          'monthly': 'price_1Rm28YBnnqL8bKFQEnVUozqo',
          'annual': 'price_1RjSoDBnnqL8bKFQUorl1OKI'
        };
        
        const actualPriceId = priceIdMap[subscriptionType] || priceId;
        console.log('Mock subscription created:', { email, name, subscriptionType, priceId: actualPriceId });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          customerId: 'cus_dev_' + Date.now(),
          subscriptionId: 'sub_dev_' + Date.now(),
          priceId: actualPriceId,
          message: 'Mock subscription created for development'
        }));
        return;
      }
      
      if (pathname === '/api/create-payment-intent') {
        const { amount, currency, subscription_type, price_id } = data;
        
        // Map subscription types to actual price IDs
        const priceIdMap = {
          'monthly': 'price_1Rm28YBnnqL8bKFQEnVUozqo',
          'annual': 'price_1RjSoDBnnqL8bKFQUorl1OKI'
        };
        
        const actualPriceId = priceIdMap[subscription_type] || price_id;
        console.log('Mock payment intent created:', { amount, currency, subscription_type, price_id: actualPriceId });
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          client_secret: 'pi_dev_' + Date.now() + '_secret_dev',
          price_id: actualPriceId,
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