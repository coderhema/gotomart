/**
 * Test Cerebras BUY/SELL Intent Classification
 */

const { parseUserIntent } = require('./services/cerebrasService');

const testCases = [
  // BUY intents
  { text: 'I need 50kg bag of rice in Ikorodu', expectedIntent: 'BUY' },
  { text: 'Where can I find tomatoes in Yaba', expectedIntent: 'BUY' },
  { text: 'Buy cooking gas cylinder', expectedIntent: 'BUY' },
  { text: 'Looking for palm oil in Lekki', expectedIntent: 'BUY' },
  
  // SELL intents
  { text: 'I want to sell rice for 45000 in Ikorodu', expectedIntent: 'SELL' },
  { text: 'List my shop: Iya Basira Foods, rice 50kg, 45000, Ikorodu', expectedIntent: 'SELL' },
  { text: 'I have tomatoes for sale 5000 per basket', expectedIntent: 'SELL' },
  { text: 'Sell my palm oil 8000', expectedIntent: 'SELL' },
  
  // Unknown/Greeting intents
  { text: 'Hello', expectedIntent: 'UNKNOWN' },
  { text: 'Hi there', expectedIntent: 'UNKNOWN' },
  { text: 'Help', expectedIntent: 'UNKNOWN' },
  { text: 'What is this', expectedIntent: 'UNKNOWN' }
];

async function runTests() {
  console.log('='.repeat(70));
  console.log('Cerebras BUY/SELL Intent Classification Test');
  console.log('='.repeat(70));
  console.log();

  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    process.stdout.write(`Testing: "${test.text.substring(0, 40)}...".`.padEnd(55, '.'));
    
    try {
      const result = await parseUserIntent(test.text);
      const match = result.intent === test.expectedIntent;
      
      if (match) {
        console.log(' ✓ PASS');
        console.log(`   Intent: ${result.intent}, Item: ${result.item || 'N/A'}, Location: ${result.location || 'N/A'}`);
        passed++;
      } else {
        console.log(' ✗ FAIL');
        console.log(`   Expected: ${test.expectedIntent}, Got: ${result.intent}`);
        console.log(`   Full result:`, JSON.stringify(result));
        failed++;
      }
    } catch (err) {
      console.log(' ✗ ERROR');
      console.log(`   ${err.message}`);
      failed++;
    }
    console.log();
  }

  console.log('='.repeat(70));
  console.log('Test Summary:');
  console.log(`  Passed: ${passed}/${testCases.length}`);
  console.log(`  Failed: ${failed}/${testCases.length}`);
  console.log('='.repeat(70));

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('\n✓ All classification tests passed!');
    process.exit(0);
  }
}

runTests();
