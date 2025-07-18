/**
 * Vercel Serverless Function for Twilio Verify Identity Authentication
 */

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phone, action } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    // Twilio configuration from environment variables
    const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID || 'VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      console.warn('Twilio credentials not configured');
      return res.status(500).json({
        success: false,
        error: 'Twilio service not configured'
      });
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
          console.error('Twilio Verify error:', response.status, errorText);
          return res.status(response.status).json({
            success: false,
            error: 'Failed to send verification code',
            details: errorText
          });
        }

        const data = await response.json();
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Verification code sent',
          status: data.status,
          to: data.to,
          serviceSid: data.service_sid,
          sid: data.sid
        }));

      } else if (action === 'check') {
        // Check verification code
        const { code } = req.body;
        
        if (!code) {
          return res.status(400).json({
            success: false,
            error: 'Verification code is required'
          });
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
          return res.status(response.status).json({
            success: false,
            error: 'Failed to verify code',
            details: errorText
          });
        }

        const data = await response.json();
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          valid: data.status === 'approved',
          status: data.status,
          message: data.status === 'approved' ? 'Identity verified successfully' : 'Invalid verification code'
        }));

      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Use "send" or "check"'
        });
      }

    } catch (twilioError) {
      console.error('Twilio Verify request error:', twilioError);
      return res.status(500).json({
        success: false,
        error: 'Twilio service error',
        details: twilioError.message
      });
    }

  } catch (error) {
    console.error('Identity verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}; 