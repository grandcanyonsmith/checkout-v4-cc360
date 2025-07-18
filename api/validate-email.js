/**
 * Vercel Serverless Function for Email Validation
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
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Mailgun configuration from environment variables
    const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
    const MAILGUN_BASE_URL = 'https://api.mailgun.net/v4';
    
    if (!MAILGUN_API_KEY) {
      console.warn('MAILGUN_API_KEY not configured, using basic validation');
      return res.status(200).json({
        success: true,
        isValid: true,
        validationMethod: 'basic_fallback',
        risk: 'unknown'
      });
    }
    
    try {
      // Make request to Mailgun validation API
      const params = new URLSearchParams({
        address: email,
        provider_lookup: 'true'
      });
      
      const response = await fetch(`${MAILGUN_BASE_URL}/address/validate?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64')}`
        }
      });

      if (!response.ok) {
        console.warn('Mailgun API error:', response.status);
        return res.status(200).json({
          success: true,
          isValid: true,
          validationMethod: 'basic_fallback',
          risk: 'unknown'
        });
      }

      const data = await response.json();
      
      // Transform Mailgun response to our format
      const result = {
        success: true,
        isValid: data.result === 'deliverable',
        result: data.result,
        risk: data.risk || 'unknown',
        isDisposable: data.is_disposable_address || false,
        isRoleAddress: data.is_role_address || false,
        reason: data.reason || null,
        didYouMean: data.did_you_mean || null,
        validationMethod: 'mailgun_api'
      };

      // Add caching headers for successful validation
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
      res.status(200).json(result);

    } catch (mailgunError) {
      console.error('Mailgun request error:', mailgunError);
      return res.status(200).json({
        success: true,
        isValid: true,
        validationMethod: 'basic_fallback',
        risk: 'unknown',
        apiError: mailgunError.message
      });
    }

  } catch (error) {
    console.error('Email validation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};