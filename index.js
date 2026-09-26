require('dotenv').config();
const express = require('express');
const crypto = require('crypto');

const { parseIntent, parseVendorCatalog } = require('./services/groqService');
const { findVendors } = require('./services/airtableService');
const { sendText, sendVendorList } = require('./services/whatsappService');
const { createCheckoutLink, verifyWebhookSignature } = require('./services/paystackService');
const { getSession, setSession, clearSession } = require('./services/sessionService');
const { generateVendorUid, createVendor } = require('./services/vendorService');
const { createOrder, getOrderByReference, markOrderPaid } = require('./services/orderService');
const { generatePin } = require('./utils/pin');
const { isVendorIntent, hasBusinessProfileSignal } = require('./utils/classify');

const app = express();

// Capture the raw body too — Paystack's webhook signature is computed over
// the exact raw bytes, not the re-serialized JSON.
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));

// --- Meta webhook verification ---
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// --- Inbound WhatsApp messages ---
app.post('/webhook', (req, res) => {
  res.sendStatus(200); // ack immediately, process async
  handleIncoming(req.body).catch(err => console.error('handleIncoming error:', err));
});

async function handleIncoming(body) {
  const value = body?.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];
  if (!message) return;

  const from = message.from;

  if (message.type === 'interactive' && message.interactive?.type === 'list_reply') {
    return handleVendorSelection(from, message.interactive.list_reply.id);
  }

  if (message.type !== 'text') return;

  const text = message.text.body;
  const session = await getSession(from);

  if (session.state !== 'idle') {
    return continueVendorOnboarding(session, text);
  }

  if (isVendorIntent(text) || hasBusinessProfileSignal(value)) {
    return startVendorOnboarding(session, from);
  }

  return handleTextQuery(from, text);
}

// ---------------- Buyer flow ----------------

async function handleTextQuery(from, text) {
  try {
    const intent = await parseIntent(text);

    if (!intent || !intent.item) {
      await sendText(from, "Sorry, I couldn't understand that. Try something like: \"I need a 50kg bag of rice in Ikorodu\".");
      return;
    }

    const vendors = await findVendors(intent);

    if (!vendors.length) {
      await sendText(from, `No vendors found for ${intent.item}${intent.location ? ` in ${intent.location}` : ''} right now.`);
      return;
    }

    const vendorOrderPairs = [];
    for (const vendor of vendors) {
      const reference = crypto.randomUUID();
      await createOrder({
        Reference: reference,
        BuyerPhone: from,
        VendorId: vendor.id,
        VendorPhone: vendor.phone,
        Item: intent.item,
        Quantity: intent.quantity,
        Price: vendor.price,
        Pin: generatePin(),
        Status: 'pending'
      });
      vendorOrderPairs.push({ vendor, reference });
    }

    await sendVendorList(from, intent, vendorOrderPairs);
  } catch (err) {
    console.error('handleTextQuery error:', err?.response?.data || err);
    await sendText(from, 'Something went wrong on our end. Please try again in a moment.');
  }
}

async function handleVendorSelection(from, reference) {
  try {
    const order = await getOrderByReference(reference);
    if (!order) {
      await sendText(from, 'That selection expired. Please resend your request.');
      return;
    }

    const link = await createCheckoutLink(from, {
      reference: order.Reference,
      vendorUid: order.VendorId,
      item: order.Item,
      quantity: order.Quantity,
      price: order.Price
    });

    await sendText(from, `Great choice. Complete your secure payment here: ${link}`);
  } catch (err) {
    console.error('handleVendorSelection error:', err?.response?.data || err);
    await sendText(from, 'Could not generate a payment link. Please try again.');
  }
}

// ---------------- Vendor onboarding flow ----------------

async function startVendorOnboarding(session, from) {
  await setSession({ ...session, state: 'awaiting_confirm', data: {} });
  await sendText(from, "Want to list your business on GoToMart? Reply YES to get started.");
}

async function continueVendorOnboarding(session, text) {
  const from = session.phone;
  const lower = text.trim().toLowerCase();

  if (session.state === 'awaiting_confirm') {
    if (['yes', 'yeah', 'yep', 'sure', 'ok', 'okay'].includes(lower)) {
      await setSession({ ...session, state: 'awaiting_bank' });
      await sendText(from, 'Great! Where would you like to receive your money? Send your bank name, account number, and account name.');
    } else {
      await clearSession(session);
      await sendText(from, "No problem — message me anytime if you change your mind.");
    }
    return;
  }

  if (session.state === 'awaiting_bank') {
    await setSession({ ...session, state: 'awaiting_catalog', data: { ...session.data, bankDetails: text } });
    await sendText(from, "Got it. Now tell me about your shop — shop name, what you sell, price, and location. e.g. \"Iya Basira Foods, rice 50kg bag, ₦45000, Ikorodu\"");
    return;
  }

  if (session.state === 'awaiting_catalog') {
    try {
      const catalog = await parseVendorCatalog(text);
      if (!catalog || !catalog.item) {
        await sendText(from, "I couldn't quite catch that — try again with shop name, item, price, and location.");
        return;
      }

      const uid = generateVendorUid(from);
      await createVendor({
        Name: catalog.shopName || 'Unnamed shop',
        Item: catalog.item,
        Location: catalog.location,
        Price: catalog.price,
        Rating: 0,
        Verified: false,
        Phone: from,
        UID: uid,
        BankDetails: session.data.bankDetails || ''
      });

      await clearSession(session);
      await sendText(from, `You're live on GoToMart! Buyers looking for ${catalog.item}${catalog.location ? ` in ${catalog.location}` : ''} can now find ${catalog.shopName || 'your shop'}.`);
    } catch (err) {
      console.error('vendor onboarding catalog error:', err?.response?.data || err);
      await sendText(from, 'Something went wrong saving your listing. Please try again.');
    }
    return;
  }
}

// --- Paystack payment webhook ---
app.post('/paystack/webhook', (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  if (!verifyWebhookSignature(req.rawBody, signature)) {
    return res.sendStatus(401);
  }

  res.sendStatus(200); // ack immediately, process async
  handlePaystackEvent(req.body).catch(err => console.error('handlePaystackEvent error:', err));
});

async function handlePaystackEvent(event) {
  if (event.event !== 'charge.success') return;

  const reference = event.data?.reference;
  const order = await getOrderByReference(reference);
  if (!order || order.Status === 'paid') return;

  await markOrderPaid(order.id);

  await sendText(order.BuyerPhone, `Payment confirmed! Your PIN is ${order.Pin}. Show this to the vendor to confirm handover.`);

  await sendText(
    order.VendorPhone,
    `You've received ₦${Number(order.Price).toLocaleString()} for ${order.Quantity ? order.Quantity + ' ' : ''}${order.Item}. Contact the buyer at ${order.BuyerPhone} to arrange delivery — they'll confirm with PIN ${order.Pin}.`
  );
}

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`GoToMart backend running on port ${PORT}`));
}

module.exports = app;
