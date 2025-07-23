#!/usr/bin/env node

/**
 * Simple development server for Course Creator 360 Checkout
 * Usage: node serve.js [port]
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.argv[2] || 8000;

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
  // Parse URL
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;

  // Default to index.html
  if (pathname === '/') {
    pathname = '/index.html';
  }

  // Get file path - serve from public directory
  let filePath;
  if (pathname.startsWith('/js/')) {
    // JavaScript files from src directories
    const jsPath = pathname.slice(4); // Remove '/js/'
    
    // Try client directory first
    filePath = path.join(__dirname, '../client', jsPath);
    if (!fs.existsSync(filePath)) {
      // Try shared directory
      filePath = path.join(__dirname, '../shared', jsPath);
    }
  } else {
    // Static files from public directory
    filePath = path.join(__dirname, '../../public', pathname);
  }
  const extname = path.extname(filePath).toLowerCase();

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Read file
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // File not found
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>404 - File Not Found</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                h1 { color: #333; }
                a { color: #0066cc; text-decoration: none; }
                a:hover { text-decoration: underline; }
              </style>
            </head>
            <body>
              <h1>404 - File Not Found</h1>
              <p>The requested file was not found on this server.</p>
              <p><a href="/">Go to homepage</a></p>
            </body>
          </html>
        `);
      } else {
        // Server error
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>500 - Server Error</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                h1 { color: #333; }
              </style>
            </head>
            <body>
              <h1>500 - Server Error</h1>
              <p>An internal server error occurred.</p>
            </body>
          </html>
        `);
      }
      return;
    }

    // Set content type
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });

    // Send file
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`
🚀 Course Creator 360 Checkout Development Server

📍 Local: http://localhost:${PORT}
🌐 Network: http://0.0.0.0:${PORT}

📁 Serving files from: public/ and src/
⏰ Started at: ${new Date().toLocaleString()}

Press Ctrl+C to stop the server
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});

// Error handling
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    console.log(`💡 Try using a different port: node serve.js ${PORT + 1}`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
}); 