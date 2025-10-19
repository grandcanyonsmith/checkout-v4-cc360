const AFFILIATE_ID_STORAGE_KEY = 'affiliateId';

// 1. Function to read the stored ID from Local Storage
export const getAffiliateId = () => {
  if (typeof window === 'undefined') return null;
  // Checks both keys for maximum compatibility
  return localStorage.getItem(AFFILIATE_ID_STORAGE_KEY) || 
         localStorage.getItem('am_id') || 
         null; 
};

// 2. Function to read the ID from the URL and save it
export const initializeAffiliateTracking = () => {
  if (typeof window === 'undefined') return;

  const urlParams = new URLSearchParams(window.location.search);
  // Prioritizes 'am_id' but checks other common keys
  const amIdFromUrl = urlParams.get('am_id') || urlParams.get('affiliate_id') || urlParams.get('affiliateId');

  if (amIdFromUrl) {
    // Stores the ID under both keys for redundancy on the current subdomain
    localStorage.setItem(AFFILIATE_ID_STORAGE_KEY, amIdFromUrl);
    localStorage.setItem('am_id', amIdFromUrl); 
  }
};