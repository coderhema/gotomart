/**
 * Local WhatsApp Test Script - No Twilio/Meta Required
 * Simulates incoming WhatsApp messages to test the bot locally
 * 
 * Usage: node tests/test_local_whatsapp.js "I need rice"
 *        node tests/test_local_whatsapp.js ":sell"
 *        node tests/test_local_whatsapp.js "1"  (select vendor)
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Simulate buyer message
function createBuyerMessage(text, phone = '2348000000001') {
  return {
    Body: text,
    From: `whatsapp:${phone}`,
    To: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',
    MessageSid: `MSG_${Date.now()}`,
    SmsStatus: 'received'
  };
}

// Simulate Twilio webhook format
function createTwilioMeta(text, phone = '2348000000001') {
  return {
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: phone,
            type: 'text',
            text: { body: text }
          }]
        }
      }]
    }]
  };
}

async function sendTest(text, phone = '2348000000001') {
  const payload = createBuyerMessage(text, phone);
  
  console.log('📤 Sending test message:');
  console.log(JSON.stringify(payload, null, 2));
  
  try {
    const response = await axios.post(`${BASE_URL}/webhook`, payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('✅ Response:', response.status, response.statusText);
    console.log('\n🤖 Your bot should have sent a reply (check Twilio logs or console output)');
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the server is running: npm start');
    }
  }
}

async function runDemo() {
  const [,, command, phone] = process.argv;
  
  if (!command) {
    console.log(`
🍚 GoToMart Local WhatsApp Test

Usage:
  node tests/test_local_whatsapp.js "<message>" [phone]

Examples:
  # Buyer tests:
  node tests/test_local_whatsapp.js "I need a 50kg bag of rice in Ikorodu"
  node tests/test_local_whatsapp.js "show me tomatoes"
  
  # Vendor onboarding:
  node tests/test_local_whatsapp.js "I want to sell"
  
  # Select vendor (replying 1, 2, 3):
  node tests/test_local_whatsapp.js "1"
  
  # Freeform vendor registration:
  node tests/test_local_whatsapp.js "Iya Basira Foods, rice 50kg bag, ₦45000, Ikorodu"

Current BASE_URL: ${BASE_URL}
`);
    process.exit(0);
  }
  
  await sendTest(command, phone || '2348000000001');
  
  // If it's a selection, show what happens
  if (/^[\d]+$/.test(command)) {
    console.log('\n📋 Expected: This should select vendor #' + command + ' if you previously sent a query');
  }
}

runDemo();
