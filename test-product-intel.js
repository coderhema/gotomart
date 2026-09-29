/**
 * Test script for Product Intelligence System
 * Run: node test-product-intel.js
 */

require('dotenv').config();

const {
  isKnownProduct,
  getProductCategory,
  enrichProduct
} = require('./src/services/productIntelligence');

const {
  containsProductReference,
  detectCategory
} = require('./src/services/productPatterns');

console.log('=== GoToMart Product Intelligence Test ===\n');

// Test 1: Known products
console.log('Test 1: Known Products');
const knownItems = ['rice', 'beans', 'shirt', 'phone'];
knownItems.forEach(item => {
  console.log(`  ${item}: known=${isKnownProduct(item)}, category=${getProductCategory(item)}`);
});

// Test 2: Product reference detection
console.log('\nTest 2: Product Reference Detection');
const testMessages = [
  'I need 50kg of rice',
  'Do you sell phone chargers',
  'Looking for ankara fabric',
  'I want to buy a blender',
  'Hello there' // Should be false
];
testMessages.forEach(msg => {
  console.log(`  "${msg}": ${containsProductReference(msg) ? 'PRODUCT FOUND' : 'No product'}`);
});

// Test 3: Category detection
console.log('\nTest 3: Category Detection');
const productMessages = [
  'I need shirts in Yaba',
  'Do you have phone chargers?',
  'Looking for blender',
  'Need rice and beans'
];
productMessages.forEach(msg => {
  console.log(`  "${msg}": ${detectCategory(msg)}`);
});

// Test 4: Tinyfish enrichment (requires API key)
console.log('\nTest 4: Product Enrichment');
async function testEnrichment() {
  const testItems = ['laptop', 'bicycle', 'coffee maker'];
  
  for (const item of testItems) {
    console.log(`\n  Enriching: "${item}"`);
    const result = await enrichProduct(item);
    console.log(`    Category: ${result.category}`);
    console.log(`    Subcategory: ${result.subcategory}`);
    console.log(`    Found: ${result.found}`);
    console.log(`    Source: ${result.source}`);
    console.log(`    Confidence: ${result.confidence}`);
  }
  
  console.log('\n=== Test Complete ===');
}

testEnrichment().catch(err => {
  console.error('Enrichment test failed:', err.message);
  process.exit(1);
});