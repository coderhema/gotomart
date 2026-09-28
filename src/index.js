require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const crypto = require('crypto');
const path = require('path');

const { parseIntent, parseVendorCatalog, parseUserIntent } = require('./services/cerebrasService');
const { findVendors } = require('./services/airtableService');
const { sendText, sendVendorList, parseTwilioMessage, handleWebhookVerify } = require('./services/twilioService');
const { createCheckoutLink, verifyWebhookSignature } = require('./services/paystackService');
const { getSession, setSession, clearSession } = require('./services/sessionService');
const { generateVendorUid, createVendor } = require('./services/vendorService');
const { createOrder, getOrderByReference, markOrderPaid, getOrdersByPhone } = require('./services/orderService');
const { generatePin } = require('./utils/pin');
const { isVendorIntent, hasBusinessProfileSignal } = require('./utils/classify');
const {
  logError,
  categorizeError,
  getUserFriendlyMessage,
  withEnhancedErrorHandling
} = require('./utils/errors');

const app = express();

// Capture the raw body too — Paystack's webhook signature is computed over
// the exact raw bytes, not the re-serialized JSON.
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));

// --- Twilio/Meta webhook verification ---
app.get('/webhook', handleWebhookVerify);

// --- Inbound WhatsApp messages ---
app.post('/webhook', (req, res) => {
  res.sendStatus(200); // ack immediately, process async
  
  // Enhanced error handling for incoming messages
  handleIncoming(req.body).catch(err => {
    const errorType = categorizeError(err);
    logError(err, {
      body: req.body,
      errorType,
      stage: 'handleIncoming_outer',
      timestamp: new Date().toISOString()
    });
    
    // Note: No user message sent for top-level errors
    // These are system errors that users shouldn't see
  });
});

async function handleIncoming(body) {
  // Check if Twilio format (has Body and From)
  if (body?.Body && body?.From) {
    const parsed = parseTwilioMessage(body);
    return handleTextMessage(parsed.from, parsed.text);
  }

  // Meta/WhatsApp format
  const value = body?.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];
  if (!message) return;

  const from = message.from;

  if (message.type === 'interactive' && message.interactive?.type === 'list_reply') {
    return handleVendorSelection(from, message.interactive.list_reply.id);
  }

  if (message.type !== 'text') return;

  const text = message.text.body;
  return handleTextMessage(from, text);
}

async function handleTextMessage(from, text) {
  const session = await getSession(from);
  const isVendor = isVendorIntent(text) || text.toLowerCase().includes('sell') || text.toLowerCase().includes('vendor');

  if (session.state !== 'idle') {
    return continueVendorOnboarding(session, text);
  }

  if (isVendor) {
    return startVendorOnboarding(session, from);
  }

  // Handle numbered vendor selection for Twilio
  if (/^[1-9]\d*$/.test(text.trim())) {
    try {
      const recentOrders = await getOrdersByPhone(from);
      const index = parseInt(text.trim()) - 1;
      if (recentOrders[index]) {
        return handleVendorSelection(from, recentOrders[index].Reference);
      }
    } catch (e) {
      console.error('Error fetching recent orders:', e);
    }
  }

  return handleTextQuery(from, text);
}

// ---------------- Buyer flow ----------------

async function handleTextQuery(from, text) {
  try {
    // Use enhanced error handling wrapper for intent parsing
    const intent = await withEnhancedErrorHandling(
      () => parseIntent(text),
      { from, text, stage: 'intent_parsing' }
    );

    if (!intent || !intent.item) {
      await sendText(from, "Sorry, I couldn't understand that. Try something like: \"I need a 50kg bag of rice in Ikorodu\".");
      return;
    }

    // Use enhanced error handling wrapper for vendor search
    const vendors = await withEnhancedErrorHandling(
      () => findVendors(intent),
      { from, intent, stage: 'vendor_search' }
    );

    if (!vendors.length) {
      await sendText(from, `No vendors found for ${intent.item}${intent.location ? ` in ${intent.location}` : ''} right now.`);
      return;
    }

    const vendorOrderPairs = [];
    for (const vendor of vendors) {
      const reference = crypto.randomUUID();
      
      // Use enhanced error handling wrapper for order creation
      await withEnhancedErrorHandling(
        () => createOrder({
          Reference: reference,
          BuyerPhone: from,
          VendorId: vendor.id,
          VendorPhone: vendor.phone,
          Item: intent.item,
          Quantity: intent.quantity,
          Price: vendor.price,
          Pin: generatePin(),
          Status: 'pending'
        }),
        { from, vendor, intent, stage: 'order_creation' }
      );
      vendorOrderPairs.push({ vendor, reference });
    }

    // Use enhanced error handling wrapper for vendor list sending
    await withEnhancedErrorHandling(
      () => sendVendorList(from, intent, vendorOrderPairs),
      { from, vendorCount: vendors.length, stage: 'send_vendor_list' }
    );
    
  } catch (err) {
    // Enhanced error handling with categorization
    const errorType = categorizeError(err);
    const userMessage = getUserFriendlyMessage(errorType, err);
    
    // Log the error with structured data
    logError(err, {
      from,
      text,
      errorType,
      stage: 'handleTextQuery',
      timestamp: new Date().toISOString()
    });
    
    await sendText(from, userMessage);
  }
}

async function handleVendorSelection(from, reference) {
  try {
    // Use enhanced error handling wrapper for order retrieval
    const order = await withEnhancedErrorHandling(
      () => getOrderByReference(reference),
      { from, reference, stage: 'order_retrieval' }
    );
    
    if (!order) {
      await sendText(from, 'That selection expired. Please resend your request.');
      return;
    }

    // Use enhanced error handling wrapper for checkout link creation
    const link = await withEnhancedErrorHandling(
      () => createCheckoutLink(from, {
        reference: order.Reference,
        vendorUid: order.VendorId,
        item: order.Item,
        quantity: order.Quantity,
        price: order.Price
      }),
      { from, order, stage: 'checkout_link_generation' }
    );

    // Use enhanced error handling wrapper for sending confirmation
    await withEnhancedErrorHandling(
      () => sendText(from, `Great choice. Complete your secure payment here: ${link}`),
      { from, link, stage: 'send_confirmation' }
    );
    
  } catch (err) {
    // Enhanced error handling with categorization
    const errorType = categorizeError(err);
    const userMessage = getUserFriendlyMessage(errorType, err);
    
    // Log the error with structured data
    logError(err, {
      from,
      reference,
      errorType,
      stage: 'handleVendorSelection',
      timestamp: new Date().toISOString()
    });
    
    await sendText(from, userMessage);
  }
}

// ---------------- Vendor onboarding flow ----------------

async function startVendorOnboarding(session, from, aiDecision = null) {
  // If AI already parsed catalog data (item, price, location), skip straight to bank details
  if (aiDecision?.item && aiDecision?.price) {
    await setSession({ 
      ...session, 
      state: 'awaiting_bank',
      data: { 
        catalog: {
          shopName: aiDecision.shopName || '',
          item: aiDecision.item,
          price: aiDecision.price,
          location: aiDecision.location
        }
      }
    });
    await sendText(from, `Great! I see you want to sell ${aiDecision.item} for ₦${aiDecision.price} in ${aiDecision.location || 'your area'}. Where would you like to receive payments? Send your bank name, account number, and account name.`);
    return;
  }
  
  // Standard onboarding flow - ask for confirmation first
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
      // Check if catalog was already parsed from AI in previous step
      let catalog;
      
      if (session.data?.catalog) {
        // Catalog was pre-parsed by AI in handleIncoming (e.g., "I want to sell rice for 45000")
        catalog = session.data.catalog;
        console.log('Using AI-pre-parsed catalog:', catalog);
      } else {
        // Parse from user's current message
        catalog = await withEnhancedErrorHandling(
          () => parseVendorCatalog(text),
          { from, text, stage: 'catalog_parsing' }
        );
      }
      
      if (!catalog || !catalog.item) {
        await sendText(from, "I couldn't quite catch that — try again with shop name, item, price, and location.");
        return;
      }

      const uid = generateVendorUid(from);
      
      // Use enhanced error handling wrapper for vendor creation
      await withEnhancedErrorHandling(
        () => createVendor({
          Name: catalog.shopName || 'Unnamed shop',
          Item: catalog.item,
          Location: catalog.location,
          Price: catalog.price,
          Rating: 0,
          Verified: false,
          Phone: from,
          UID: uid,
          BankDetails: session.data.bankDetails || ''
        }),
        { from, catalog, stage: 'vendor_creation' }
      );

      await clearSession(session);
      
      // Use enhanced error handling wrapper for success message
      await withEnhancedErrorHandling(
        () => sendText(from, `You're live on GoToMart! Buyers looking for ${catalog.item}${catalog.location ? ` in ${catalog.location}` : ''} can now find ${catalog.shopName || 'your shop'}.`),
        { from, catalog, stage: 'send_success_message' }
      );
      
    } catch (err) {
      // Enhanced error handling with categorization
      const errorType = categorizeError(err);
      const userMessage = getUserFriendlyMessage(errorType, err);
      
      // Log the error with structured data
      logError(err, {
        from,
        text,
        sessionState: session.state,
        errorType,
        stage: 'continueVendorOnboarding',
        timestamp: new Date().toISOString()
      });
      
      await sendText(from, userMessage);
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
  
  // Enhanced error handling for webhook processing
  handlePaystackEvent(req.body).catch(err => {
    const errorType = categorizeError(err);
    logError(err, {
      webhookEvent: req.body,
      errorType,
      stage: 'paystack_webhook',
      timestamp: new Date().toISOString()
    });
    
    // Note: No user message sent for webhook errors
    // Webhook failures are logged but not sent to users
  });
});

async function handlePaystackEvent(event) {
  try {
    if (event.event !== 'charge.success') return;

    const reference = event.data?.reference;
    
    // Use enhanced error handling wrapper for order retrieval
    const order = await withEnhancedErrorHandling(
      () => getOrderByReference(reference),
      { reference, event, stage: 'order_retrieval_payment' }
    );
    
    if (!order || order.Status === 'paid') return;

    // Use enhanced error handling wrapper for marking order as paid
    await withEnhancedErrorHandling(
      () => markOrderPaid(order.id),
      { order, stage: 'mark_order_paid' }
    );

    // Use enhanced error handling wrapper for buyer notification
    await withEnhancedErrorHandling(
      () => sendText(order.BuyerPhone, `Payment confirmed! Your PIN is ${order.Pin}. Show this to the vendor to confirm handover.`),
      { order, stage: 'notify_buyer_payment' }
    );

    // Use enhanced error handling wrapper for vendor notification
    await withEnhancedErrorHandling(
      () => sendText(
        order.VendorPhone,
        `You've received ₦${Number(order.Price).toLocaleString()} for ${order.Quantity ? order.Quantity + ' ' : ''}${order.Item}. Contact the buyer at ${order.BuyerPhone} to arrange delivery — they'll confirm with PIN ${order.Pin}.`
      ),
      { order, stage: 'notify_vendor_payment' }
    );
    
  } catch (err) {
    // Enhanced error handling with categorization
    const errorType = categorizeError(err);
    
    // Log the error with structured data
    logError(err, {
      event,
      errorType,
      stage: 'handlePaystackEvent',
      timestamp: new Date().toISOString()
    });
    
    // Re-throw to be caught by the outer handler
    throw err;
  }
}

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`GoToMart backend running on port ${PORT}`));
}

module.exports = app;
