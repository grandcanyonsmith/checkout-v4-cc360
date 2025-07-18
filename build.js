#!/usr/bin/env node

/**
 * Build script for Vercel deployment
 * Organizes static files and prepares the application for production
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = 'public';
const STATIC_FILES = [
  'index.html',
  'styles.css',
  'app.js',
  'app-config.js',
  'routes.js',
  'email-validator.js',
  'sanitizer.js',
  'app-logger.js',
  'vercel-analytics.js'
];

function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
}

function copyFile(src, dest) {
  try {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`✅ Copied: ${src} → ${dest}`);
    } else {
      console.log(`⚠️  File not found: ${src}`);
    }
  } catch (error) {
    console.error(`❌ Error copying ${src}:`, error.message);
  }
}

function build() {
  console.log('🚀 Starting build process for Vercel deployment...\n');

  // Create public directory
  ensureDirectoryExists(PUBLIC_DIR);

  // Copy static files to public directory
  console.log('📁 Copying static files...');
  STATIC_FILES.forEach(file => {
    const src = path.join(__dirname, file);
    const dest = path.join(__dirname, PUBLIC_DIR, file);
    copyFile(src, dest);
  });

  // Create a simple index.js for Vercel if it doesn't exist
  const indexPath = path.join(__dirname, 'index.js');
  if (!fs.existsSync(indexPath)) {
    const indexContent = `// Vercel entry point
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.end('Checkout application is running. Please visit the main page.');
};`;
    fs.writeFileSync(indexPath, indexContent);
    console.log('✅ Created index.js entry point');
  }

  // Verify API directory exists
  const apiDir = path.join(__dirname, 'api');
  if (fs.existsSync(apiDir)) {
    const apiFiles = fs.readdirSync(apiDir);
    console.log(`✅ API directory contains ${apiFiles.length} serverless functions:`, apiFiles);
  } else {
    console.error('❌ API directory not found!');
    process.exit(1);
  }

  // Create vercel.json if it doesn't exist or update it
  const vercelConfigPath = path.join(__dirname, 'vercel.json');
  const vercelConfig = {
    version: 2,
    functions: {
      "api/**/*.js": {
        maxDuration: 10
      }
    },
    rewrites: [
      {
        source: "/api/(.*)",
        destination: "/api/$1"
      },
      {
        source: "/(.*)",
        destination: "/public/$1"
      }
    ],
    headers: [
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*"
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS"
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, stripe-signature"
          }
        ]
      }
    ]
  };

  fs.writeFileSync(vercelConfigPath, JSON.stringify(vercelConfig, null, 2));
  console.log('✅ Updated vercel.json configuration');

  console.log('\n🎉 Build completed successfully!');
  console.log('\n📋 Deployment checklist:');
  console.log('  ✅ Static files copied to public/');
  console.log('  ✅ API functions ready in api/');
  console.log('  ✅ Vercel configuration updated');
  console.log('  ✅ Entry point created');
  
  console.log('\n🚀 Ready for Vercel deployment!');
  console.log('   Run: vercel --prod');
}

// Run build if called directly
if (require.main === module) {
  build();
}

module.exports = build;