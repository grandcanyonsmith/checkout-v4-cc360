const AFFILIATE_ID_STORAGE_KEY = 'affiliateId';

/**
 * Retrieves the stored affiliate ID from Local Storage.
 * @returns {string | null} The affiliate ID or null if not found.
 */
export const getAffiliateId = () => {
  if (typeof window === 'undefined') return null;
  // Checks both keys for maximum compatibility
  return localStorage.getItem(AFFILIATE_ID_STORAGE_KEY) || 
         localStorage.getItem('am_id') || 
         null; 
};

/**
 * Reads the affiliate ID from URL parameters ('am_id', 'affiliate_id', 'affiliateId') 
 * and stores it in Local Storage. This function MUST be called once on app load (in App.jsx).
 */
export const initializeAffiliateTracking = () => {
  if (typeof window === 'undefined') return;

  const urlParams = new URLSearchParams(window.location.search);
  // Prioritize 'am_id' but check other common keys
  const amIdFromUrl = urlParams.get('am_id') || urlParams.get('affiliate_id') || urlParams.get('affiliateId');

  if (amIdFromUrl) {
    // Store the ID under both keys for redundancy
    localStorage.setItem(AFFILIATE_ID_STORAGE_KEY, amIdFromUrl);
    localStorage.setItem('am_id', amIdFromUrl); 
  }
};