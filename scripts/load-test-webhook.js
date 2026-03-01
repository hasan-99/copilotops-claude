#!/usr/bin/env node
/**
 * Simple load testing for webhook endpoints
 * Usage: node load-test-webhook.js <webhook-url> [concurrency=10] [total=100]
 */

const https = require('https');
const http = require('http');

async function loadTest(webhookUrl, concurrency = 10, totalRequests = 100) {
  console.log(`🔥 Load testing ${webhookUrl}`);
  console.log(`📊 Concurrency: ${concurrency}, Total: ${totalRequests}\n`);

  const results = {
    success: 0,
    failed: 0,
    times: [],
    errors: []
  };

  const batches = Math.ceil(totalRequests / concurrency);

  for (let batch = 0; batch < batches; batch++) {
    const batchSize = Math.min(concurrency, totalRequests - batch * concurrency);
    const promises = [];

    console.log(`🚀 Batch ${batch + 1}/${batches} (${batchSize} requests)`);

    for (let i = 0; i < batchSize; i++) {
      promises.push(makeRequest(webhookUrl, batch * concurrency + i + 1));
    }

    const batchResults = await Promise.allSettled(promises);

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.success++;
        results.times.push(result.value.duration);
      } else {
        results.failed++;
        results.errors.push(result.reason.message);
      }
    }

    // Brief pause between batches
    if (batch < batches - 1) {
      await sleep(100);
    }
  }

  printResults(results, totalRequests);
}

function makeRequest(url, requestId) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;

    // Sample WhatsApp webhook payload
    const payload = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [{
        id: "123456789",
        changes: [{
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "15551234567" },
            contacts: [{ profile: { name: "Load Test User" }, wa_id: `loadtest${requestId}` }],
            messages: [{
              id: `loadtest_${requestId}_${Date.now()}`,
              from: `loadtest${requestId}`,
              timestamp: Math.floor(Date.now() / 1000).toString(),
              type: "text",
              text: { body: `Load test message ${requestId}` }
            }]
          }
        }]
      }]
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent': 'WhatsApp/2.0 LoadTest'
      },
      timeout: 10000
    };

    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ duration, statusCode: res.statusCode });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(payload);
    req.end();
  });
}

function printResults(results, totalRequests) {
  console.log('\n📈 RESULTS');
  console.log('=' .repeat(50));

  const successRate = (results.success / totalRequests * 100).toFixed(1);
  const avgTime = results.times.length ? (results.times.reduce((a, b) => a + b, 0) / results.times.length).toFixed(0) : 0;
  const p95Time = results.times.length ? results.times.sort((a, b) => a - b)[Math.floor(results.times.length * 0.95)] : 0;

  console.log(`✅ Success: ${results.success}/${totalRequests} (${successRate}%)`);
  console.log(`❌ Failed: ${results.failed}/${totalRequests}`);
  console.log(`⚡ Avg response: ${avgTime}ms`);
  console.log(`📊 95th percentile: ${p95Time}ms`);

  if (results.errors.length > 0) {
    console.log('\n🚨 ERRORS');
    const errorCounts = {};
    results.errors.forEach(error => {
      errorCounts[error] = (errorCounts[error] || 0) + 1;
    });
    Object.entries(errorCounts).forEach(([error, count]) => {
      console.log(`   ${count}x ${error}`);
    });
  }

  // Production readiness assessment
  console.log('\n🎯 PRODUCTION READINESS');
  if (successRate >= 95 && avgTime < 5000) {
    console.log('✅ READY FOR PRODUCTION');
  } else {
    console.log('❌ NOT READY FOR PRODUCTION');
    if (successRate < 95) console.log(`   - Success rate too low (${successRate}% < 95%)`);
    if (avgTime >= 5000) console.log(`   - Response too slow (${avgTime}ms ≥ 5000ms)`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// CLI execution
if (require.main === module) {
  const [webhookUrl, concurrency = 10, total = 100] = process.argv.slice(2);

  if (!webhookUrl) {
    console.error('Usage: node load-test-webhook.js <webhook-url> [concurrency=10] [total=100]');
    process.exit(1);
  }

  loadTest(webhookUrl, parseInt(concurrency), parseInt(total))
    .catch(console.error);
}

module.exports = { loadTest };