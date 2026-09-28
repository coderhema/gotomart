/**
 * Comprehensive Integration Test
 * Tests Airtable, Cerebras, and JEV connectivity
 */

require('dotenv').config();

console.log('='.repeat(70));
console.log('GoToMart Integration Diagnostic Test');
console.log('='.repeat(70));
console.log();

// Check environment variables
console.log('1. ENVIRONMENT VARIABLES');
console.log('-'.repeat(50));
const requiredEnv = [
  'AIRTABLE_BASE_ID',
  'AIRTABLE_API_KEY',
  'AIRTABLE_VENDORS_TABLE',
  'AIRTABLE_SESSIONS_TABLE',
  'AIRTABLE_ORDERS_TABLE',
  'CEREBRAS_API_KEY',
  'JEV_API'
];

let envCheck = true;
for (const key of requiredEnv) {
  const exists = process.env[key] ? '✓' : '✗';
  const value = process.env[key] ? process.env[key].substring(0, 15) + '...' : 'NOT SET';
  console.log(`  ${exists} ${key}: ${value}`);
  if (!process.env[key]) envCheck = false;
}
console.log();

async function testAirtable() {
  console.log('2. AIRTABLE CONNECTION TEST');
  console.log('-'.repeat(50));
  
  try {
    const axios = require('axios');
    const baseId = process.env.AIRTABLE_BASE_ID;
    const apiKey = process.env.AIRTABLE_API_KEY;
    
    // Test Vendors table
    const vendorsTable = process.env.AIRTABLE_VENDORS_TABLE || 'Vendors';
    console.log(`  Testing table: ${vendorsTable}`);
    
    try {
      const response = await axios.get(
        `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(vendorsTable)}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          params: { maxRecords: 1 }
        }
      );
      console.log(`  ✓ Vendors table: ACCESSIBLE (${response.data.records.length} records)`);
    } catch (err) {
      console.log(`  ✗ Vendors table: ${err.response?.status} - ${err.response?.data?.error?.message || err.message}`);
    }
    
    // Test Sessions table
    const sessionsTable = process.env.AIRTABLE_SESSIONS_TABLE || 'Sessions';
    console.log(`  Testing table: ${sessionsTable}`);
    
    try {
      const response = await axios.get(
        `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(sessionsTable)}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          params: { maxRecords: 1 }
        }
      );
      console.log(`  ✓ Sessions table: ACCESSIBLE (${response.data.records.length} records)`);
    } catch (err) {
      console.log(`  ✗ Sessions table: ${err.response?.status} - ${err.response?.data?.error?.message || err.message}`);
    }
    
    // Test Orders table
    const ordersTable = process.env.AIRTABLE_ORDERS_TABLE || 'Orders';
    console.log(`  Testing table: ${ordersTable}`);
    
    try {
      const response = await axios.get(
        `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(ordersTable)}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          params: { maxRecords: 1 }
        }
      );
      console.log(`  ✓ Orders table: ACCESSIBLE (${response.data.records.length} records)`);
    } catch (err) {
      console.log(`  ✗ Orders table: ${err.response?.status} - ${err.response?.data?.error?.message || err.message}`);
    }
    
  } catch (err) {
    console.log(`  ✗ Airtable test error: ${err.message}`);
  }
}

async function testCerebras() {
  console.log();
  console.log('3. CEREBRAS CONNECTION TEST');
  console.log('-'.repeat(50));
  
  try {
    const Cerebras = require('@cerebras/cerebras_cloud_sdk');
    const cerebras = new Cerebras({
      apiKey: process.env.CEREBRAS_API_KEY,
    });
    
    const start = Date.now();
    const response = await cerebras.chat.completions.create({
      model: 'gpt-oss-120b',
      messages: [{ role: 'user', content: 'Say "Cerebras is working" in 3 words' }],
      max_tokens: 10
    });
    const duration = Date.now() - start;
    
    console.log(`  ✓ Cerebras API: RESPONDED (${duration}ms)`);
    console.log(`    Response: "${response.choices[0].message.content.trim()}"`);
  } catch (err) {
    console.log(`  ✗ Cerebras API: ${err.message}`);
  }
}

async function testTypeSafeJEV() {
  console.log();
  console.log('4. TYPESAFE JEV INTEGRATION TEST');
  console.log('-'.repeat(50));
  
  try {
    const { parseUserIntent, normalizeSearchQuery } = require('./services/typesafeService');
    
    console.log('  Testing BUY intent...');
    const buyIntent = await parseUserIntent('I need rice in Ikorodu');
    console.log(`    Intent: ${buyIntent.intent}, Item: ${buyIntent.item}, Location: ${buyIntent.location}`);
    console.log(`    ${buyIntent.intent === 'BUY' ? '✓' : '✗'} BUY classification`);
    
    console.log('  Testing SELL intent...');
    const sellIntent = await parseUserIntent('I want to sell rice for 45000');
    console.log(`    Intent: ${sellIntent.intent}, Item: ${sellIntent.item}, Price: ${sellIntent.price}`);
    console.log(`    ${sellIntent.intent === 'SELL' ? '✓' : '✗'} SELL classification`);
    
    console.log('  Testing search normalization...');
    const query = await normalizeSearchQuery('50kg bag of rice in Ikorodu');
    console.log(`    Normalized: ${query.normalizedItem} in ${query.normalizedLocation}`);
    console.log(`    Search terms: [${query.searchTerms.join(', ')}]`);
    
  } catch (err) {
    console.log(`  ✗ TypeSafe JEV: ${err.message}`);
    console.log(`    Stack: ${err.stack}`);
  }
}

async function testServices() {
  console.log();
  console.log('5. SERVICE INTEGRATION TEST');
  console.log('-'.repeat(50));
  
  try {
    const { getSession, setSession } = require('./services/sessionService');
    const testPhone = '+2349990000000';
    
    console.log('  Testing session service...');
    const session = await getSession(testPhone);
    console.log(`    Session state: ${session.state}`);
    
    await setSession({ ...session, state: 'test', data: { test: true } });
    console.log('    ✓ Session saved');
    
    const updated = await getSession(testPhone);
    console.log(`    Retrieved state: ${updated.state}`);
    console.log(`    ${updated.state === 'test' ? '✓' : '✗'} Session persistence`);
    
  } catch (err) {
    console.log(`  ✗ Service test: ${err.message}`);
  }
}

async function runAllTests() {
  await testAirtable();
  await testCerebras();
  await testTypeSafeJEV();
  await testServices();
  
  console.log();
  console.log('='.repeat(70));
  console.log('DIAGNOSTIC COMPLETE');
  console.log('='.repeat(70));
}

runAllTests();
