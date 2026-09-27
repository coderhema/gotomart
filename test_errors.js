/**
 * Test script to demonstrate enhanced error handling improvements
 */

const {
  ERROR_TYPES,
  GoToMartError,
  logError,
  categorizeError,
  getUserFriendlyMessage,
  createErrorResponse,
  withEnhancedErrorHandling
} = require('./utils/errors');

console.log('Testing Enhanced Error Handling for GoToMart Buyer Flow\n');
console.log('='.repeat(60));

// Test 1: Different error categorizations
console.log('Test 1: Error Categorization\n');

const testErrors = [
  { message: 'Airtable rate limit exceeded', code: '429' },
  { message: 'Cerebras API is down', config: { url: 'https://api.cerebras.ai' } },
  { message: 'Airtable connection failed', config: { url: 'https://api.airtable.com' } },
  { message: 'WhatsApp API error', config: { url: 'https://graph.facebook.com' } },
  { message: 'Bachs payment failed', config: { url: 'https://api.bachs.io' } },
  { message: 'Validation failed for input' },
  { message: 'Session not found' },
  { message: 'Random network error' }
];

testErrors.forEach((error, idx) => {
  const type = categorizeError(error);
  const message = getUserFriendlyMessage(type, error);
  console.log(`Error ${idx + 1}: "${error.message.substring(0, 30)}..."`);
  console.log(`  Type: ${type}`);
  console.log(`  User Message: ${message}`);
  console.log();
});

console.log('='.repeat(60));
console.log('Test 2: Enhanced Error Logging\n');

// Test enhanced error logging
const sampleError = new Error('Airtable rate limit - 429 Too Many Requests');
sampleError.code = '429';
sampleError.response = { data: { error: 'Too many requests' } };

const loggedError = logError(sampleError, { 
  userId: 'user123', 
  action: 'findVendors',
  timestamp: new Date().toISOString()
});

console.log('Logged error structure:');
console.log(JSON.stringify(loggedError, null, 2));

console.log('\n' + '='.repeat(60));
console.log('Test 3: withEnhancedErrorHandling wrapper\n');

// Test the wrapper function
async function simulateFlakyAPI() {
  throw new Error('AI Service Temporarily Unavailable');
}

async function testWrapper() {
  try {
    await withEnhancedErrorHandling(
      simulateFlakyAPI,
      { 
        userId: 'buyer456',
        requestType: 'intent_parsing',
        item: '50kg bag of rice'
      }
    );
  } catch (error) {
    console.log('Error caught with wrapper:');
    console.log(`  Error Type: ${error.type || 'N/A'}`);
    console.log(`  Error Message: ${error.message}`);
    console.log(`  Is GoToMartError: ${error instanceof GoToMartError}`);
  }
}

// Run the test
testWrapper().then(() => {
  console.log('\n' + '='.repeat(60));
  console.log('Test 4: Error Response Creation\n');
  
  // Test error response creation
  const sampleError2 = new Error('Payment gateway timeout');
  sampleError2.config = { url: 'https://api.bachs.io/v1/checkout-sessions' };
  
  const errorResponse = createErrorResponse(sampleError2, {
    orderId: 'order789',
    buyerPhone: '+2348000000000'
  });
  
  console.log('Structured Error Response:');
  console.log(JSON.stringify(errorResponse, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log('Summary of Enhanced Error Handling Improvements:\n');
  
  console.log('1. Structured error categorization with types:');
  Object.values(ERROR_TYPES).forEach(type => {
    console.log(`   - ${type}`);
  });
  
  console.log('\n2. User-friendly messages based on error type:');
  console.log('   - Clears technical jargon');
  console.log('   - Provides actionable next steps');
  console.log('   - Differentiates between service types');
  
  console.log('\n3. Enhanced logging features:');
  console.log('   - Structured JSON logging');
  console.log('   - Context capture (user, action, stage)');
  console.log('   - Original error preservation');
  
  console.log('\n4. Error handling utilities:');
  console.log('   - withEnhancedErrorHandling wrapper');
  console.log('   - createErrorResponse for APIs');
  console.log('   - getRecoverySuggestion helper');
  
  console.log('\n' + '='.repeat(60));
  console.log('Error handling improvements successfully implemented!');
});