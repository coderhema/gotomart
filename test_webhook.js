/**
 * Test script to verify the webhook POST handler
 * Tests various WhatsApp webhook payloads
 */

const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const WEBHOOK_URL = `${BASE_URL}/webhook`;

console.log('='.repeat(60));
console.log('GoToMart Webhook Integration Test');
console.log(`Target: ${WEBHOOK_URL}`);
console.log('='.repeat(60));

// Mock payload templates
const mockPayloads = {
  // Test 1: Simple text message from buyer
  textMessage: {
    object: 'whatsapp_business_account',
    entry: [{
      id: '1353606787835500',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '15551234567',
            phone_number_id: '1353606787835500'
          },
          contacts: [{
            profile: { name: 'Test Buyer' },
            wa_id: '2348012345678'
          }],
          messages: [{
            from: '2348012345678',
            id: 'wamid.test123',
            timestamp: Math.floor(Date.now() / 1000),
            type: 'text',
            text: { body: 'I need 50kg bag of rice in Ikorodu' }
          }]
        },
        field: 'messages'
      }]
    }]
  },

  // Test 2: Vendor selection (list reply)
  vendorSelection: {
    object: 'whatsapp_business_account',
    entry: [{
      id: '1353606787835500',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '15551234567',
            phone_number_id: '1353606787835500'
          },
          contacts: [{
            profile: { name: 'Test Buyer' },
            wa_id: '2348012345678'
          }],
          messages: [{
            from: '2348012345678',
            id: 'wamid.test456',
            timestamp: Math.floor(Date.now() / 1000),
            type: 'interactive',
            interactive: {
              type: 'list_reply',
              list_reply: {
                id: 'order-123-456',
                title: 'Iya Basira Foods',
                description: 'Rice 50kg - ₦45,000'
              }
            }
          }]
        },
        field: 'messages'
      }]
    }]
  },

  // Test 3: Vendor onboarding confirmation (YES)
  vendorConfirmYes: {
    object: 'whatsapp_business_account',
    entry: [{
      id: '1353606787835500',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '15551234567',
            phone_number_id: '1353606787835500'
          },
          contacts: [{
            profile: { name: 'Test Vendor' },
            wa_id: '2348098765432'
          }],
          messages: [{
            from: '2348098765432',
            id: 'wamid.test789',
            timestamp: Math.floor(Date.now() / 1000),
            type: 'text',
            text: { body: 'YES' }
          }]
        },
        field: 'messages'
      }]
    }]
  },

  // Test 4: Bank details submission
  bankDetails: {
    object: 'whatsapp_business_account',
    entry: [{
      id: '1353606787835500',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '15551234567',
            phone_number_id: '1353606787835500'
          },
          contacts: [{
            profile: { name: 'Test Vendor' },
            wa_id: '2348098765432'
          }],
          messages: [{
            from: '2348098765432',
            id: 'wamid.testabc',
            timestamp: Math.floor(Date.now() / 1000),
            type: 'text',
            text: { body: 'GTBank 0123456789 John Doe' }
          }]
        },
        field: 'messages'
      }]
    }]
  },

  // Test 5: Catalog submission
  catalogSubmission: {
    object: 'whatsapp_business_account',
    entry: [{
      id: '1353606787835500',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '15551234567',
            phone_number_id: '1353606787835500'
          },
          contacts: [{
            profile: { name: 'Test Vendor' },
            wa_id: '2348098765432'
          }],
          messages: [{
            from: '2348098765432',
            id: 'wamid.testdef',
            timestamp: Math.floor(Date.now() / 1000),
            type: 'text',
            text: { body: 'Iya Basira Foods, rice 50kg bag, 45000, Ikorodu' }
          }]
        },
        field: 'messages'
      }]
    }]
  },

  // Test 6: Empty/invalid payload (edge case)
  emptyPayload: {},

  // Test 7: Payload with no messages (should be ignored gracefully)
  noMessages: {
    object: 'whatsapp_business_account',
    entry: [{
      id: '1353606787835500',
      changes: [{
        value: {
          messaging_product: 'whatsapp'
        },
        field: 'messages'
      }]
    }]
  },

  // Test 8: Non-text, non-interactive message type (should be ignored)
  imageMessage: {
    object: 'whatsapp_business_account',
    entry: [{
      id: '1353606787835500',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            display_phone_number: '15551234567',
            phone_number_id: '1353606787835500'
          },
          contacts: [{
            profile: { name: 'Test User' },
            wa_id: '2348012345678'
          }],
          messages: [{
            from: '2348012345678',
            id: 'wamid.testimg',
            timestamp: Math.floor(Date.now() / 1000),
            type: 'image',
            image: { id: 'media123', mime_type: 'image/jpeg' }
          }]
        },
        field: 'messages'
      }]
    }]
  }
};

function sendWebhook(payload, testName) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(payload);
    const url = new URL(WEBHOOK_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      resolve({
        success: res.statusCode === 200,
        status: res.statusCode,
        testName
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        status: 'Network Error',
        message: error.message,
        testName
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        status: 'Timeout',
        message: 'Request timed out after 5000ms',
        testName
      });
    });

    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('\nStarting webhook tests...\n');

  const tests = [
    { name: 'Test 1: Buyer text message', payload: mockPayloads.textMessage },
    { name: 'Test 2: Vendor selection (list reply)', payload: mockPayloads.vendorSelection },
    { name: 'Test 3: Vendor onboarding - YES confirmation', payload: mockPayloads.vendorConfirmYes },
    { name: 'Test 4: Bank details submission', payload: mockPayloads.bankDetails },
    { name: 'Test 5: Catalog submission', payload: mockPayloads.catalogSubmission },
    { name: 'Test 6: Empty payload (edge case)', payload: mockPayloads.emptyPayload },
    { name: 'Test 7: No messages payload', payload: mockPayloads.noMessages },
    { name: 'Test 8: Image message (should be ignored)', payload: mockPayloads.imageMessage }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`${test.name}`.padEnd(50, '.'));
    const result = await sendWebhook(test.payload, test.name);
    
    if (result.success) {
      console.log(` ✓ PASS (HTTP ${result.status})`);
      passed++;
    } else {
      console.log(` ✗ FAIL (HTTP ${result.status})`);
      if (result.message) console.log(`   Error: ${result.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test Summary:');
  console.log(`  Passed: ${passed}/${tests.length}`);
  console.log(`  Failed: ${failed}/${tests.length}`);
  console.log('='.repeat(60));

  if (failed > 0) {
    console.log('\nNOTE: Make sure the server is running on port 3000:');
    console.log('  node index.js');
    process.exit(1);
  } else {
    console.log('\n✓ All webhook tests completed successfully!');
    process.exit(0);
  }
}

runTests();
