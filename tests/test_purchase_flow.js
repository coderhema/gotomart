/**
 * End-to-End Purchase Flow Test
 * Chat path simulation: Search vendors → Select → Create order → Payment link → Verify Airtable
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const axios = require('axios');
const { findVendors } = require('../src/services/airtableService');
const { createOrder, getOrdersByPhone, getOrderByReference } = require('../src/services/orderService');
const { createCheckoutLink } = require('../src/services/paymentService');
const { getSession, setSession } = require('../src/services/sessionService');

const TEST_PHONE = '2348000000001';
const TEST_ITEM = 'rice 50kg bag';
const TEST_LOCATION = 'Ikorodu';

function airtableHeaders() {
  return {
    Authorization: 'Bearer ' + process.env.AIRTABLE_API_KEY,
    'Content-Type': 'application/json'
  };
}

async function fetchOrderById(recordId) {
  const base = process.env.AIRTABLE_BASE_ID;
  const table = encodeURIComponent(process.env.AIRTABLE_ORDERS_TABLE || 'Orders');
  const { data } = await axios.get(
    'https://api.airtable.com/v0/' + base + '/' + table + '/' + recordId,
    { headers: airtableHeaders() }
  );
  return { id: data.id, ...data.fields };
}

async function runE2ETest() {
  console.log('===========================================================');
  console.log('       GoToMart End-to-End Purchase Flow Test');
  console.log('===========================================================\n');

  let passed = 0;
  let failed = 0;
  let orderRef = null;
  let orderRecordId = null;
  let vendors = [];
  let checkoutUrl = null;

  // Test 1: Session
  console.log('TEST 1: Initialize Buyer Session');
  try {
    const session = await getSession(TEST_PHONE);
    console.log('   OK Session:', session ? 'ACTIVE' : 'NEW');
    passed++;
  } catch (err) {
    console.log('   FAIL Session error:', err.message);
    failed++;
  }

  // Test 2: Vendor search (Airtable Vendors)
  console.log('\nTEST 2: Search for Vendors (Airtable)');
  try {
    vendors = await findVendors({ item: TEST_ITEM, location: TEST_LOCATION });
    console.log('   OK Found ' + vendors.length + ' vendors:');
    vendors.forEach((v, i) => {
      console.log(
        '      ' + (i + 1) + '. ' + v.name + ' | N' + v.price + ' | ' + v.location +
        (v.verified ? ' | verified' : '') + ' | uid=' + v.uid
      );
    });
    if (!vendors.length) throw new Error('No vendors found for rice in Ikorodu');
    passed++;
  } catch (err) {
    console.log('   FAIL Vendor search error:', err.message);
    failed++;
  }

  // Test 3: Selection + session
  console.log('\nTEST 3: Vendor Selection + Session');
  try {
    const selectedVendor = vendors[0];
    if (!selectedVendor) throw new Error('No vendor to select');
    console.log('   OK Selected: ' + selectedVendor.name + ' (N' + selectedVendor.price + ')');

    const session = (await getSession(TEST_PHONE)) || {};
    session.lastVendors = vendors;
    session.selectedVendorId = selectedVendor.id;
    session.selectedVendorUid = selectedVendor.uid;
    session.lastItem = TEST_ITEM;
    session.lastLocation = TEST_LOCATION;
    session.state = 'awaiting_payment';
    await setSession(TEST_PHONE, session);
    console.log('   OK Session saved with selection');
    passed++;
  } catch (err) {
    console.log('   FAIL Selection error:', err.message);
    failed++;
  }

  // Test 4: Create order in Airtable
  // Quantity is single-line text in Airtable (e.g. "50kg"), not a number
  console.log('\nTEST 4: Create Order in Airtable');
  try {
    orderRef = 'TEST-' + Date.now();
    const selected = vendors[0] || {};
    const order = {
      Reference: orderRef,
      BuyerPhone: TEST_PHONE,
      VendorId: selected.uid || selected.id || 'vendor_001',
      VendorPhone: selected.phone || '2348011111111',
      Item: selected.item || TEST_ITEM,
      Quantity: '1 bag',
      Price: selected.price || 45000,
      Pin: String(Math.floor(1000 + Math.random() * 9000)),
      Status: 'pending'
    };

    const result = await createOrder(order);
    orderRecordId = result.id;
    console.log('   OK Order created');
    console.log('      Reference: ' + orderRef);
    console.log('      Airtable ID: ' + result.id);
    console.log('      Fields: ' + JSON.stringify(result.fields || {}));
    passed++;
  } catch (err) {
    console.log('   FAIL Order creation error:', err.message);
    if (err.response && err.response.data) {
      console.log('      Airtable:', JSON.stringify(err.response.data));
    }
    failed++;
  }

  // Test 5: Payment link (BACHs)
  // Signature: createCheckoutLink(buyerPhone, order)
  console.log('\nTEST 5: Generate Payment Link (BACHs)');
  try {
    const selected = vendors[0] || {};
    const payOrder = {
      reference: orderRef || ('TEST-' + Date.now()),
      vendorUid: selected.uid || 'vendor_001',
      item: selected.item || TEST_ITEM,
      quantity: '1 bag',
      price: selected.price || 45000
    };
    checkoutUrl = await createCheckoutLink(TEST_PHONE, payOrder);
    if (!checkoutUrl) throw new Error('No checkout URL returned');
    console.log('   OK Payment link created');
    console.log('      URL: ' + String(checkoutUrl).substring(0, 100));
    passed++;
  } catch (err) {
    console.log('   FAIL Payment link error:', err.message);
    if (err.response && err.response.data) {
      console.log('      BACHs:', JSON.stringify(err.response.data));
    }
    failed++;
  }

  // Test 6: List orders by phone
  console.log('\nTEST 6: Retrieve Orders by BuyerPhone');
  try {
    const orders = await getOrdersByPhone(TEST_PHONE);
    console.log('   OK Found ' + orders.length + ' order(s)');
    orders.slice(0, 5).forEach(o => {
      console.log(
        '      - ' + (o.Reference || o.id) + ' | ' + (o.Item || '?') +
        ' | N' + (o.Price || '?') + ' | ' + (o.Status || '?')
      );
    });
    passed++;
  } catch (err) {
    console.log('   FAIL Order retrieval error:', err.message);
    failed++;
  }

  // Test 7: Verify the exact record in Airtable
  console.log('\nTEST 7: Verify Order Record in Airtable');
  try {
    let verified = null;

    if (orderRef) {
      verified = await getOrderByReference(orderRef);
    }
    if (!verified && orderRecordId) {
      verified = await fetchOrderById(orderRecordId);
    }

    if (!verified) {
      throw new Error('Could not load created order from Airtable');
    }

    console.log('   OK Order present in Airtable:');
    console.log('      id: ' + (verified.id || orderRecordId));
    console.log('      Reference: ' + verified.Reference);
    console.log('      BuyerPhone: ' + verified.BuyerPhone);
    console.log('      Item: ' + verified.Item);
    console.log('      Quantity: ' + verified.Quantity);
    console.log('      Price: ' + verified.Price);
    console.log('      Status: ' + verified.Status);
    console.log('      Pin: ' + verified.Pin);
    console.log('      VendorId: ' + (verified.VendorId || '(n/a)'));
    console.log('      VendorPhone: ' + verified.VendorPhone);

    const checks = [
      verified.Reference === orderRef,
      verified.BuyerPhone === TEST_PHONE,
      verified.Status === 'pending',
      Number(verified.Price) > 0
    ];
    if (checks.every(Boolean)) {
      console.log('   OK Field values match expected purchase payload');
      passed++;
    } else {
      console.log('   FAIL Field mismatch vs expected payload');
      failed++;
    }
  } catch (err) {
    console.log('   FAIL Verification error:', err.message);
    failed++;
  }

  console.log('\n===========================================================');
  console.log('                    TEST SUMMARY');
  console.log('===========================================================');
  console.log('   Passed: ' + passed);
  console.log('   Failed: ' + failed);
  if (orderRef) console.log('   Order ref: ' + orderRef);
  if (orderRecordId) console.log('   Record id: ' + orderRecordId);
  if (checkoutUrl) console.log('   Pay URL: ' + String(checkoutUrl).substring(0, 80) + '...');
  console.log('===========================================================\n');

  if (failed === 0) {
    console.log('All tests passed. Chat→order→Airtable→payment path is OK.\n');
  } else {
    console.log('Some tests failed. See errors above.\n');
  }
  return failed === 0;
}

runE2ETest()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Test crash:', err);
    process.exit(1);
  });
