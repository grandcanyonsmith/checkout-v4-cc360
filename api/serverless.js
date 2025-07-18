/**
 * Vercel Serverless Function Entry Point
 * This file exports the Express app for Vercel to use
 */

// Import the Express app from our server
const app = require('../src/server/server');

// Export for Vercel
module.exports = app; 