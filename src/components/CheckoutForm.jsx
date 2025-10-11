import React, { useState, useEffect } from 'react';
// Assuming necessary imports like useStripe, useElements, CardElement, etc. are here
// import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
// import { useRouter } from 'next/router'; // If using Next.js for routing

const CheckoutForm = ({ planId, planName, price }) => {
    // 1. STATE MANAGEMENT
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Assume Stripe hooks are available in the scope
    // const stripe = useStripe(); 
    // const elements = useElements(); 

    // --- MODIFICATION 1: Reading and Storing Affiliate ID ---
    const AFFILIATE_ID_KEY = 'affiliateId';

    useEffect(() => {
        // A. TRY READING FROM URL
        // We use window.location.search to get the URL query parameters universally.
        const urlParams = new URLSearchParams(window.location.search);
        const affiliateIdFromUrl = urlParams.get(AFFILIATE_ID_KEY);

        if (affiliateIdFromUrl) {
            // If the ID is found in the URL, save it to localStorage
            localStorage.setItem(AFFILIATE_ID_KEY, affiliateIdFromUrl);
            console.log(`Affiliate ID found in URL and saved: ${affiliateIdFromUrl}`);
        } else {
            // B. CHECK LOCAL STORAGE
            const storedAffiliateId = localStorage.getItem(AFFILIATE_ID_KEY);
            if (storedAffiliateId) {
                console.log(`Affiliate ID found in localStorage: ${storedAffiliateId}`);
            } else {
                console.log('No Affiliate ID found in URL or localStorage.');
            }
        }
    }, []);

    // Helper function to consistently retrieve the ID from storage
    const getAffiliateId = () => {
        return localStorage.getItem(AFFILIATE_ID_KEY);
    };
    // --------------------------------------------------------

    // 2. SUBMISSION HANDLER
    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);

        // Check if Stripe is loaded (assuming the useStripe hook is used)
        // if (!stripe || !elements) {
        //     setIsLoading(false);
        //     return;
        // }

        // const cardElement = elements.getElement(CardElement); 

        try {
            // I. STEP: CREATE CUSTOMER (API call: create-customer)
            // This call should create a customer on your backend (e.g., Stripe)
            const customerResponse = await fetch('/api/create-customer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    name,
                    planId,
                    // --- MODIFICATION 2: Adding affiliateId to create-customer request body ---
                    affiliateId: getAffiliateId(), // This corresponds to line ~415 in your description
                    // -------------------------------------------------------------------------
                }),
            });

            if (!customerResponse.ok) {
                const errorData = await customerResponse.json();
                throw new Error(errorData.message || 'Failed to create customer.');
            }

            const { customerId, clientSecret } = await customerResponse.json();

            // II. STEP: CONFIRM CARD SETUP
            // Assuming this uses Stripe's setupIntent to confirm payment method
            /*
            const result = await stripe.confirmCardSetup(clientSecret, {
                payment_method: {
                    card: cardElement,
                    billing_details: { name, email },
                },
            });

            if (result.error) {
                setError(result.error.message);
                setIsLoading(false);
                return;
            }
            */
            
            // For demonstration, let's assume setup was successful and we have a paymentMethodId
            const paymentMethodId = "pm_mocked_id"; // Replace with actual result.setupIntent.payment_method

            // III. STEP: START TRIAL PERIOD (API call: start-trial)
            const trialResponse = await fetch('/api/start-trial', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    customerId,
                    paymentMethodId: paymentMethodId, // Use actual paymentMethodId
                    planId,
                    // --- MODIFICATION 3: Adding affiliateId to start-trial request body ---
                    affiliateId: getAffiliateId(), // This corresponds to line ~473 in your description
                    // --------------------------------------------------------------------
                }),
            });

            if (!trialResponse.ok) {
                const errorData = await trialResponse.json();
                throw new Error(errorData.message || 'Failed to start trial.');
            }

            // IV. STEP: SUCCESS
            console.log('Subscription successful! Navigating...');
            // Example: router.push('/success');

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // 3. RENDER COMPONENT
    return (
        <form onSubmit={handleSubmit}>
            <h2>Checkout for {planName}</h2>
            <div>Price: ${price}</div>
            
            {/* Input fields */}
            <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="Email Address" 
                required 
            />
            <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Full Name" 
                required 
            />

            {/* Placeholder for Stripe Card Element */}
            {/* <div className="card-element-container">
                <CardElement />
            </div> */}
            
            {error && <div style={{ color: 'red' }}>Error: {error}</div>}
            
            <button disabled={isLoading} type="submit">
                {isLoading ? 'Processing...' : `Start ${planName} Trial`}
            </button>
        </form>
    );
};

export default CheckoutForm;