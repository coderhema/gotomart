/**
 * Test TypeSafe JEV Search Normalization
 */

const { normalizeSearchQuery, computeVendorScore, rankVendors } = require('./services/typesafeService');

async function testNormalization() {
  console.log('='.repeat(70));
  console.log('TypeSafe JEV Search Normalization Test');
  console.log('='.repeat(70));
  console.log();

  const queries = [
    'I need 50kg bag of rice in Ikorodu',
    'Where can I find fresh tomatoes in Yaba',
    'Looking for cooking gas refill in Lekki',
    'Buy palm oil gallons at wholesale price in Ikeja'
  ];

  for (const query of queries) {
    console.log(`Query: "${query}"`);
    console.log('-'.repeat(50));
    
    const result = await normalizeSearchQuery(query);
    
    console.log(`  Item: ${result.item}`);
    console.log(`  Normalized: ${result.normalizedItem}`);
    console.log(`  Location: ${result.location}`);
    console.log(`  Norm-Location: ${result.normalizedLocation}`);
    console.log(`  Search Terms: [${result.searchTerms.join(', ')}]`);
    console.log();
  }
}

function testRanking() {
  console.log('='.repeat(70));
  console.log('Vendor Ranking Test');
  console.log('='.repeat(70));
  console.log();

  const vendors = [
    { id: '1', name: 'Iya Basira', item: 'rice', price: 45000, rating: 4.5, verified: true, location: 'Ikorodu' },
    { id: '2', name: 'Mama's Pride', item: 'rice', price: 42000, rating: 4.2, verified: false, location: 'Ikorodu' },
    { id: '3', name: 'Premium Rice', item: 'rice', price: 48000, rating: 4.8, verified: true, location: 'Lekki' },
    { id: '4', name: 'Budget Foods', item: 'rice', price: 40000, rating: 3.9, verified: false, location: 'Ikorodu' }
  ];

  const searchQuery = {
    normalizedItem: 'rice',
    normalizedLocation: 'ikorodu'
  };

  console.log('Input vendors:');
  vendors.forEach(v => {
    console.log(`  - ${v.name}: ₦${v.price}, ${v.rating}★, ${v.verified ? 'Verified' : 'Unverified'}, ${v.location}`);
  });
  console.log();

  const ranked = rankVendors(vendors, searchQuery, 3);

  console.log('Ranked results:');
  ranked.forEach((v, i) => {
    console.log(`  ${i + 1}. ${v.name} (Score: ${v.score.toFixed(1)}) - ₦${v.price}`);
  });
  console.log();
  console.log('Ranking factors:');
  console.log('  - Verified vendors get +10 points');
  console.log('  - Lower price = higher score');
  console.log('  - Higher rating = more points');
  console.log('  - Location match = +5 points');
}

async function runTests() {
  await testNormalization();
  console.log();
  testRanking();
  console.log();
  console.log('='.repeat(70));
  console.log('✓ TypeSafe JEV tests completed');
  console.log('='.repeat(70));
}

runTests();
