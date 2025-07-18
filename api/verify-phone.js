/**
 * Vercel Serverless Function for Phone Verification with Twilio Identity API
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
    const { phone, firstName, lastName } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    // Clean phone number (remove all non-digits)
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Basic validation
    if (cleanPhone.length < 10) {
      return res.status(200).json({
        success: true,
        isValid: false,
        validationMethod: 'basic',
        risk: 'high',
        reason: 'Phone number too short'
      });
    }

    // Format phone number (add +1 if US number)
    let formattedPhone = cleanPhone;
    if (cleanPhone.length === 10) {
      formattedPhone = `+1${cleanPhone}`;
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
      formattedPhone = `+${cleanPhone}`;
    } else if (!cleanPhone.startsWith('+')) {
      formattedPhone = `+${cleanPhone}`;
    }

    // Try Lambda endpoint for Twilio Identity Match first
    if (firstName && lastName) {
      try {
        const lambdaResponse = await fetch('https://6md7xnb5zegjqwkos5lpihtkoy0xpnki.lambda-url.us-west-2.on.aws/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            identity_phone_number: formattedPhone,
            first_name: firstName,
            last_name: lastName
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
            
            return res.status(200).json({
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
            });
          }
        }
      } catch (lambdaError) {
        console.warn('Lambda API error:', lambdaError.message);
      }
    }

    // Fallback to basic Twilio Lookup
    const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      // No Twilio credentials, return basic validation
      return res.status(200).json({
        success: true,
        isValid: true,
        phoneNumber: formattedPhone,
        countryCode: 'US',
        risk: 'unknown',
        reason: 'Basic validation only',
        validationMethod: 'basic_fallback'
      });
    }

    try {
      // Use Twilio Lookup API to verify phone number
      const lookupUrl = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(formattedPhone)}`;
      
      const response = await fetch(lookupUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn('Twilio Lookup API error:', response.status);
        return res.status(200).json({
          success: true,
          isValid: true,
          phoneNumber: formattedPhone,
          countryCode: 'US',
          risk: 'unknown',
          reason: 'Basic validation only',
          validationMethod: 'basic_fallback',
          apiError: `Twilio API returned ${response.status}`
        });
      }

      const data = await response.json();
      
      // Check if phone number is valid
      const isValid = data.valid === true;
      
      // Determine risk level
      let risk = 'low';
      let reason = null;
      
      if (!isValid) {
        risk = 'high';
        reason = 'Invalid phone number';
      } else if (data.line_type_intelligence && data.line_type_intelligence.type === 'VOIP') {
        risk = 'medium';
        reason = 'VOIP number detected';
      } else if (data.line_type_intelligence && data.line_type_intelligence.type === 'PREMIUM') {
        risk = 'high';
        reason = 'Premium rate number';
      }

      const result = {
        success: true,
        isValid,
        phoneNumber: data.phone_number,
        countryCode: data.country_code,
        nationalFormat: data.national_format,
        internationalFormat: data.international_format,
        lineType: data.line_type_intelligence?.type || 'unknown',
        carrier: data.carrier?.name || null,
        risk,
        reason,
        validationMethod: 'twilio_lookup_api'
      };

      // Add caching headers for successful validation
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
      res.status(200).json(result);

    } catch (twilioError) {
      console.error('Twilio request error:', twilioError);
      return res.status(200).json({
        success: true,
        isValid: true,
        phoneNumber: formattedPhone,
        countryCode: 'US',
        risk: 'unknown',
        reason: 'Basic validation only',
        validationMethod: 'basic_fallback',
        apiError: twilioError.message
      });
    }

  } catch (error) {
    console.error('Phone verification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}; 