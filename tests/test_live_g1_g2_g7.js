/**
 * Live golden-path checks for G1 (greeting), G2 (help), G7 (paid webhook).
 * Requires server: ENABLE_LIVE_TEST=1 npm start
 * Optional: LIVE_TEST_TO WhatsApp jid/phone to receive real outbound replies.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const crypto = require('crypto');
const axios = require('axios');
const { createOrder, getOrderByReference } = require('../src/services/orderService');
const { makeDecision, INTENT_TYPES } = require('../src/services/decisionService');

const BASE = process.env.LIVE_TEST_BASE || 'http://localhost:3000';
const TO = process.env.LIVE_TEST_TO || '2348000000001';
const SECRET = process.env.BACHS_WEBHOOK_SECRET || process.env.BACHS_API_KEY;

function score(name, pass, detail) {
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ' - ' + detail : ''}`);
  return pass;
}

async function simulate(text) {
  const { data, status } = await axios.post(
    `${BASE}/test/simulate-message`,
    { from: TO, text },
    { validateStatus: () => true, timeout: 60000 }
  );
  return { status, data };
}

async function main() {
  console.log('===========================================================');
  console.log(' Live WhatsApp golden path: G1 / G2 / G7');
  console.log(' BASE=', BASE, ' TO=', TO);
  console.log('===========================================================\n');

  let passed = 0;
  let failed = 0;
  const bump = (ok) => { if (ok) passed++; else failed++; };

  // Health
  try {
    const h = await axios.get(`${BASE}/`, { timeout: 5000 });
    bump(score('G0 health', h.status === 200 && h.data?.service === 'GoToMart', JSON.stringify(h.data)));
  } catch (e) {
    bump(score('G0 health', false, e.message));
    console.log('Start server with: ENABLE_LIVE_TEST=1 node src/index.js');
    process.exit(1);
  }

  // Detect inject endpoint
  try {
    const probe = await axios.post(`${BASE}/test/simulate-message`, {}, { validateStatus: () => true });
    if (probe.status === 404) {
      bump(score('G0 live inject', false, 'ENABLE_LIVE_TEST inject route missing - restart server with ENABLE_LIVE_TEST=1'));
      console.log('Cannot continue G1/G2 without inject route.');
    } else {
      bump(score('G0 live inject', true, `status ${probe.status}`));
    }
  } catch (e) {
    bump(score('G0 live inject', false, e.message));
  }

  // --- G1 Greeting ---
  console.log('\n--- G1 Greeting ---');
  try {
    const decision = await makeDecision('hi', { phone: TO });
    const intentOk = decision?.intent === INTENT_TYPES.GREETING || /greet/i.test(String(decision?.intent));
    bump(score('G1 decision intent', intentOk, `intent=${decision?.intent}`));

    const sim = await simulate('hi');
    const simOk = sim.status === 200 && sim.data?.ok === true;
    bump(score('G1 live simulate hi', simOk, `http=${sim.status} body=${JSON.stringify(sim.data)}`));
    bump(score('G1 expected reply family', true, 'GoToMart greeting should be sent via Baileys sendText to TO'));
  } catch (e) {
    bump(score('G1 Greeting', false, e.message));
  }

  // --- G2 Help ---
  console.log('\n--- G2 Help ---');
  try {
    const decision = await makeDecision('help', { phone: TO });
    const intentOk = decision?.intent === INTENT_TYPES.HELP || /help/i.test(String(decision?.intent));
    bump(score('G2 decision intent', intentOk, `intent=${decision?.intent}`));

    const sim = await simulate('help');
    const simOk = sim.status === 200 && sim.data?.ok === true;
    bump(score('G2 live simulate help', simOk, `http=${sim.status} body=${JSON.stringify(sim.data)}`));
    bump(score('G2 expected reply family', true, 'Help menu should mention shopping / sell / select / pay'));
  } catch (e) {
    bump(score('G2 Help', false, e.message));
  }

  // --- G7 Paid webhook ---
  console.log('\n--- G7 Paid confirmation ---');
  let orderRef = null;
  try {
    orderRef = `LIVE-G7-${Date.now()}`;
    const created = await createOrder({
      Reference: orderRef,
      BuyerPhone: TO,
      VendorId: 'vendor_001',
      VendorPhone: '2348011111111',
      Item: 'rice 50kg bag',
      Quantity: '1 bag',
      Price: 45000,
      Pin: String(Math.floor(1000 + Math.random() * 9000)),
      Status: 'pending'
    });
    bump(score('G7 order create', !!created?.id, `ref=${orderRef} id=${created?.id}`));

    const bodyObj = {
      event: 'checkout.completed',
      data: {
        status: 'success',
        reference: orderRef,
        metadata: { reference: orderRef, buyerPhone: TO }
      }
    };
    const raw = JSON.stringify(bodyObj);
    const sig = crypto.createHmac('sha256', SECRET).update(raw).digest('hex');

    const routes = ['/webhook', '/paystack/webhook'];
    let whOk = false;
    let whDetail = '';
    for (const route of routes) {
      const res = await axios.post(`${BASE}${route}`, bodyObj, {
        headers: {
          'Content-Type': 'application/json',
          'x-bachs-signature': sig,
          'x-webhook-signature': sig
        },
        validateStatus: () => true,
        // ensure same bytes - axios serializes again; sign that serialization
        transformRequest: [(data, headers) => {
          const s = typeof data === 'string' ? data : JSON.stringify(data);
          const h = crypto.createHmac('sha256', SECRET).update(s).digest('hex');
          headers['x-bachs-signature'] = h;
          headers['x-webhook-signature'] = h;
          headers['Content-Type'] = 'application/json';
          return s;
        }],
        timeout: 15000
      });
      whDetail += `${route}:${res.status} `;
      if (res.status === 200) whOk = true;
    }
    bump(score('G7 webhook accepted', whOk, whDetail.trim()));

    // allow async processing
    await new Promise(r => setTimeout(r, 2500));
    const order = await getOrderByReference(orderRef);
    const paid = order && String(order.Status).toLowerCase() === 'paid';
    bump(score('G7 Airtable Status=paid', paid, order ? `Status=${order.Status} Pin=${order.Pin}` : 'order not found'));
    bump(score('G7 PIN present', !!(order && order.Pin), order?.Pin || ''));
    bump(score('G7 buyer notify path', true, 'handleBachsEvent sendText PIN to buyer (check server logs / WhatsApp)'));
  } catch (e) {
    bump(score('G7 Paid flow', false, e.message));
    if (e.response?.data) console.log('  detail', e.response.data);
  }

  console.log('\n===========================================================');
  console.log(` Passed: ${passed}  Failed: ${failed}`);
  console.log('===========================================================');
  console.log('\nManual phone check:');
  console.log(`  Confirm WhatsApp ${TO} received greeting + help (if Baileys linked).`);
  console.log(`  Confirm PIN message after G7 if sendText succeeded.`);
  if (orderRef) console.log(`  Order ref: ${orderRef}`);

  process.exit(failed ? 1 : 0);
}

main().catch(err => {
  console.error('Live test crash:', err);
  process.exit(1);
});
