#!/usr/bin/env node

/**
 * Simple deployment test script
 * Tests that all API endpoints are working correctly
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

async function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DeploymentTest/1.0'
      }
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testEndpoints() {
  console.log(`🧪 Testing deployment at: ${BASE_URL}\n`);

  const tests = [
    {
      name: 'Health Check',
      path: '/api/health',
      method: 'GET',
      expected: 200
    },
    {
      name: 'Email Validation',
      path: '/api/validate-email',
      method: 'POST',
      data: { email: 'test@example.com' },
      expected: 200
    },
    {
      name: 'Static File (index.html)',
      path: '/',
      method: 'GET',
      expected: 200
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}...`);
      const result = await makeRequest(test.path, test.method, test.data);
      
      if (result.status === test.expected) {
        console.log(`✅ ${test.name} - PASSED (${result.status})`);
        passed++;
      } else {
        console.log(`❌ ${test.name} - FAILED (${result.status}, expected ${test.expected})`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} - ERROR: ${error.message}`);
      failed++;
    }
    console.log('');
  }

  console.log(`\n📊 Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log(`\n🎉 All tests passed! Deployment is working correctly.`);
    process.exit(0);
  } else {
    console.log(`\n⚠️  Some tests failed. Please check the deployment.`);
    process.exit(1);
  }
}

// Run tests
testEndpoints().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});