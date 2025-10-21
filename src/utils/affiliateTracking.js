// src/utils/affiliateTracking.js

const AFFILIATE_ID_STORAGE_KEY = 'am_id'; // <--- STANDARDIZED KEY: Use 'am_id' consistently

/**
 * Retrieves the stored affiliate ID from Local Storage.
 * @returns {string | null} The affiliate ID or null if not found.
 */
export const getAffiliateId = () => {
  if (typeof window === 'undefined') return null;
  // Retrieve using the single, standardized key
  return localStorage.getItem(AFFILIATE_ID_STORAGE_KEY) || null;
};

/**
 * Reads the affiliate ID from URL parameters ('am_id', 'affiliate_id', 'affiliateId') 
 * and stores it in Local Storage using the standardized key.
 */
export const initializeAffiliateTracking = () => {
  if (typeof window === 'undefined') return;

  const urlParams = new URLSearchParams(window.location.search);
  // Prioritize 'am_id' but check other common keys
  const amIdFromUrl = urlParams.get('am_id') || urlParams.get('affiliate_id') || urlParams.get('affiliateId');

  if (amIdFromUrl) {
    // Store the ID under the standardized key
    localStorage.setItem(AFFILIATE_ID_STORAGE_KEY, amIdFromUrl);
  }
  
  // Optional: Clear old keys if they exist to maintain cleanliness (not strictly needed, but good practice)
  if (localStorage.getItem('affiliateId') && AFFILIATE_ID_STORAGE_KEY !== 'affiliateId') {
    localStorage.removeItem('affiliateId');
  }
};