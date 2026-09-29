require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const crypto = require('crypto');
const path = require('path');

const { parseIntent, parseVendorCatalog, parseUserIntent } = require('./services/cerebrasService');
const { findVendors } = require('./services/airtableService');
const { sendText, sendVendorList, initBaileySocket, sendVendorListInteractive, sendButtonMessage, sendOnboardingWelcome } = require('./services/twilioService');

// Interactive WhatsApp Components
const {
  ButtonMessage,
  ListMessage,
  parseInteractiveResponse,
  ComponentIds
} = require('./services/whatsappComponents');

// Conversation Router with NLP
const {
  routeConversation,
  getContext: getConversationContext,
  isReturningToTopic,
  TOPICS
} = require('./services/conversationService');

// TINYFISH Search Integration
const { searchProductPrices, getMarketTrends, formatSearchResultsForWhatsApp } = require('./services/tinyfishService');
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

// JEV + CEREBRAS Hybrid Decision Layer
const {
  makeDecision,
  delegateToCerebras,
  INTENT_TYPES,
  THRESHOLDS
} = require('./services/decisionService');

const app = express();

// Capture the raw body too — Paystack's webhook signature is computed over
// the exact raw bytes, not the re-serialized JSON.
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));

// --- Inbound WhatsApp messages ---
// No webhook endpoint needed - Baileys uses direct WebSocket connection

// No webhook handler needed - Baileys receives messages directly

// GoToMart Agent Persona
const AGENT_NAME = 'GoToMart';
const AGENT_PERSONA = {
  greeting: [
    "👋 Hello! I'm your GoToMart shopping assistant. I help you find vendors and get the best prices for items like rice, beans, garri, and more!\n\nWhat do you need today?",
    "Hi there! 👋 Welcome to GoToMart - your AI marketplace assistant!\n\nI can help you:\n• Find vendors for items\n• Compare prices\n• Connect with sellers\n\nWhat are you looking for?",
    "Hey! 🛒 I'm GoToMart, your personal shopping agent. Tell me what you need and I'll find the best vendors for you!"
  ],
  
  help: [
    "Here's what I can do:\n\n🛒 **Shopping**: \"I need 50kg rice in Lagos\"\n\n🏪 **Sell Items**: \"I want to sell beans\"\n\n🔄 **Select Vendor**: Reply with a number (1, 2, 3...)\n\n💳 **Pay**: Click the payment link I send\n\nWhat would you like to do?"
  ],
  
  fallback: [
    "I didn't quite catch that. Try:\n• \"I need rice\"\n• \"Find beans in Lagos\"\n• \"I want to sell garri\"\n\nOr type 'help' for more options."
  ],
  
  thinking: [
    "Let me find the best vendors for you... 🔍",
    "Searching for great deals... 🛒",
    "Looking up vendors in your area... 📍"
  ]
};

// Check if message is a greeting
function isGreeting(text) {
  const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'gm', 'how are you', 'what\'s up', 'yo', 'hola'];
  const lower = text.toLowerCase().trim();
  return greetings.some(g => lower.includes(g) || lower === g);
}

// Check if message is help request
function isHelpRequest(text) {
  const helpWords = ['help', 'what can you do', 'how does this work', 'options', 'commands', 'menu'];
  return helpWords.some(word => text.toLowerCase().includes(word));
}

// Get random response from array
function getRandomResponse(responses) {
  return responses[Math.floor(Math.random() * responses.length)];
}

// Get agent response
async function sendAgentResponse(from, type) {
  const response = getRandomResponse(AGENT_PERSONA[type]);
  await sendText(from, response);
}

/**
 * Handle interactive button/list responses
 */
async function handleInteractiveResponse(from, interaction, session) {
  console.log('[INTERACTIVE]', interaction.type, interaction.itemId || interaction.buttonId);

  const id = interaction.itemId || interaction.buttonId;
  if (!id) return false;

  // Vendor selection from list
  if (ComponentIds.hasPrefix(id, ComponentIds.VENDOR_PREFIX)) {
    const reference = id.replace(ComponentIds.VENDOR_PREFIX, '');
    await handleVendorSelection(from, reference);
    return true;
  }

  // Menu navigation
  if (ComponentIds.hasPrefix(id, ComponentIds.MENU_PREFIX)) {
    const action = id.replace(ComponentIds.MENU_PREFIX, '');
    return await handleMenuAction(from, action, session);
  }

  // Payment buttons
  if (ComponentIds.hasPrefix(id, ComponentIds.PAY)) {
    const reference = id.replace(/^pay_/, '');
    await handleVendorSelection(from, reference);
    return true;
  }

  // Cancel button
  if (id === ComponentIds.CANCEL) {
    await sendText(from, '❌ Cancelled. What else can I help you with?');
    await ListMessage.mainMenu().send(from);
    return true;
  }

  // Confirmation buttons
  if (id.includes('_yes') || id.includes('_no')) {
    return await handleConfirmationResponse(from, id, session);
  }

  return false;
}

/**
 * Handle menu actions from interactive list
 */
async function handleMenuAction(from, action, session) {
  switch (action) {
    case 'buy':
      await sendText(from, 'What are you looking for? (Example: "50kg rice in Lagos")');
      break;
    case 'sell':
      await sendOnboardingWelcome(from);
      break;
    case 'orders':
      await handleOrderStatus(from, session);
      break;
    case 'help':
      await sendAgentResponse(from, 'help');
      break;
    default:
      await sendText(from, 'What would you like to do?');
  }
  return true;
}

/**
 * Handle confirmation button responses (Yes/No)
 */
async function handleConfirmationResponse(from, buttonId, session) {
  if (buttonId.includes('_yes')) {
    // Extract the action from the button ID
    const action = buttonId.split('_')[0];
    await sendText(from, `✅ Confirmed: ${action}`);
  } else if (buttonId.includes('_no')) {
    await sendText(from, '❌ Got it. Is there something else I can help with?');
    await ListMessage.mainMenu().send(from);
  }
  return true;
}

/**
 * Main message handler - processes both text and interactive messages
 */
async function handleTextMessage(from, message, fullMessage = null) {
  const session = await getSession(from);
  const text = typeof message === 'string' ? message : message.text;

  // STEP 0: Check if this is an interactive response (button/list click)
  if (fullMessage) {
    const interaction = parseInteractiveResponse(fullMessage);
    if (interaction) {
      return await handleInteractiveResponse(from, interaction, session);
    }
  }

  // STEP 0.5: Check if user is returning to topic after off-topic
  if (isReturningToTopic(text)) {
    const convContext = getConversationContext(from);
    const inProgress = convContext.getInProgressBuyingIntent();
    if (inProgress) {
      await sendText(from, `Great! Let's continue with your request for ${inProgress.quantity || ''} ${inProgress.item}.`);
      return handleBuyerIntent(from, inProgress, { intent: 'buy', scores: { confidence: 0.9 } });
    }
  }

  // STEP 1: Check for off-topic with NLP router
  const convResult = await routeConversation(from, text, null);

  if (convResult.shouldRedirect) {
    // User went off-topic - redirect gently
    if (convResult.showMenu) {
      await sendText(from, convResult.message);
      await ListMessage.mainMenu().send(from);
    } else {
      await sendText(from, convResult.message);
    }
    return;
  }

  // STEP 2: JEV DECIDES (System One)
  const decision = await makeDecision(text, session);

  console.log('[ROUTING]', JSON.stringify({
    intent: decision.intent,
    confidence: decision.jev.confidence.toFixed(2),
    action: decision.action.type,
    topic: convResult.topic
  }));

  // Update conversation context with detected topic
  const convContext = getConversationContext(from);
  if (decision.intent === 'buy' && decision.extractedParams?.item) {
    convContext.storeBuyingIntent(decision.extractedParams);
    convContext.state = 'awaiting_vendor_selection';
  } else if (decision.intent === 'sell') {
    convContext.state = 'vendor_onboarding';
  }

  // STEP 3: Route based on action type
  if (!decision.action.needsLLM) {
    return handleDirectResponse(from, text, decision, session);
  }

  // CEREBRAS NEEDED
  console.log('[CEREBRAS_INVOKED]', decision.action.reason);

  try {
    const cerebrasResult = await delegateToCerebras(text, decision);
    return handleCerebrasResponse(from, text, decision, cerebrasResult, session);
  } catch (err) {
    console.error('[CEREBRAS_FAILED]', err.message);
    await sendAgentResponse(from, 'fallback');
  }
}

/**
 * Decision-aware response handler with validation
 */
async function handleDecisionResponse(from, decision, responseFn, responseType) {
  try {
    const response = await responseFn();
    
    // Validate response (Jev guardrail pattern)
    const validation = validateResponse(response, '', decision);
    if (!validation.answersQuestion && !validation.toneOk) {
      console.warn('[GUARDRAIL] Response failed validation, using fallback');
      // Could trigger fallback response here
    }
    
    return response;
  } catch (err) {
    console.error(`[DECISION] Error in ${responseType} handler:`, err.message);
    await sendAgentResponse(from, 'fallback');
  }
}

/**
 * Handle numeric vendor selection
 */
async function handleNumericSelection(from, text) {
  try {
    const recentOrders = await getOrdersByPhone(from);
    const index = parseInt(text) - 1;
    if (recentOrders[index]) {
      await handleVendorSelection(from, recentOrders[index].Reference);
      return true;
    }
  } catch (e) {
    console.error('Error in numeric selection:', e);
  }
  return false;
}

/**
 * Handle order status inquiries
 */
async function handleOrderStatus(from, session) {
  try {
    const orders = await getOrdersByPhone(from);
    if (orders.length === 0) {
      await sendText(from, "You don't have any orders yet. Send something like \"I need 50kg rice\" to find vendors!");
      return;
    }
    
    const pending = orders.filter(o => o.Status === 'pending');
    const paid = orders.filter(o => o.Status === 'paid');
    
    let statusMsg = `📦 *Your Orders*\n\n`;
    if (pending.length > 0) {
      statusMsg += `⏳ *Pending:* ${pending.length}\n`;
    }
    if (paid.length > 0) {
      statusMsg += `✅ *Paid:* ${paid.length}\n\n`;
      statusMsg += `Your PIN for pickup: ${paid[0].Pin}`;
    }
    
    await sendText(from, statusMsg);
  } catch (err) {
    console.error('Error fetching orders:', err);
    await sendText(from, "Couldn't retrieve your orders right now. Try again in a moment.");
  }
}

/**
 * Handle buyer intent with decision context
 */
async function handleBuyerIntent(from, intent, decision) {
  try {
    console.log(`[BUY] Fast path: item=${intent.item}, qty=${intent.quantity}, loc=${intent.location}`);
    
    // Show thinking message based on urgency score
    if (decision.scores?.urgency > 0.7) {
      await sendText(from, "Got it! Searching for urgent delivery options... 🔍");
    }
    
    const vendors = await withEnhancedErrorHandling(
      () => findVendors(intent),
      { from, intent, stage: 'vendor_search' }
    );

    if (!vendors.length) {
      await sendText(from, `No vendors found for ${intent.item}${intent.location ? ` in ${intent.location}` : ''} right now.`);
      return;
    }

    // Create orders and send vendor list
    const vendorOrderPairs = [];
    for (const vendor of vendors) {
      const reference = crypto.randomUUID();
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

    await withEnhancedErrorHandling(
      () => sendVendorList(from, intent, vendorOrderPairs),
      { from, vendorCount: vendors.length, stage: 'send_vendor_list' }
    );
    
  } catch (err) {
    const errorType = categorizeError(err);
    const userMessage = getUserFriendlyMessage(errorType, err);
    logError(err, { from, decision, errorType, stage: 'handleBuyerIntent' });
    await sendText(from, userMessage);
  }
}

// ---------------- Buyer flow ----------------

async function handleTextQuery(from, text, decision = null) {
  // If we have decision context, use it for logging
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
    // Send interactive vendor list
    const vendorsList = ListMessage.vendorSelection(vendorOrderPairs, intent);
    await withEnhancedErrorHandling(
      () => vendorsList.send(from),
      { from, vendorCount: vendors.length, stage: 'send_vendor_list_interactive' }
    );
    
  } catch (err) {
    const errorType = categorizeError(err);
    const userMessage = getUserFriendlyMessage(errorType, err);
    
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

// ---------------- JEV + CEREBRAS Hybrid Handlers ----------------

/**
 * Handle direct responses where Jev has high confidence
 * No Cerebras LLM call needed
 */
async function handleDirectResponse(from, text, decision, session) {
  const { intent, jev, extractedParams } = decision;
  
  console.log('[DIRECT_RESPONSE]', intent, '- extracted:', JSON.stringify(extractedParams));
  
  switch (intent) {
  case INTENT_TYPES.GREETING:
      await sendAgentResponse(from, 'greeting');
      // Show interactive main menu after greeting
      await ListMessage.mainMenu().send(from);
      return;
    
    case INTENT_TYPES.HELP:
      await sendAgentResponse(from, 'help');
      return;
    
    case INTENT_TYPES.BUY:
      // Fast path for BUY: use extracted params from regex
      if (extractedParams && extractedParams.item) {
        const fastIntent = {
          item: extractedParams.item,
          quantity: extractedParams.quantity,
          location: extractedParams.location
        };
        return handleFastBuy(from, fastIntent, decision);
      }
      
      // No extraction - need Cerebras parsing
      console.log('[UPGRADE_TO_CEREBRAS] BUY intent but no extraction');
      try {
        const cerebrasResult = await delegateToCerebras(text, decision);
        return handleCerebrasResponse(from, text, decision, cerebrasResult, session);
      } catch (err) {
        console.error('[CEREBRAS_FAILED]', err.message);
        await sendAgentResponse(from, 'fallback');
      }
      return;
    
    case INTENT_TYPES.SELL:
      // Vendor onboarding
      if (session.state !== 'idle') {
        return continueVendorOnboarding(session, text);
      }
      
      // Check if they already provided catalog details
      const sellMatch = text.match(/sell\s+(\w+)\s+for\s*₦?(\d+)/i);
      if (sellMatch) {
        const aiDecision = {
          item: sellMatch[1],
          price: parseInt(sellMatch[2]),
          location: text.match(/\b(in|at)\s+([A-Za-z]+)/i)?.[2] || '',
          shopName: ''
        };
        return startVendorOnboarding(session, from, aiDecision);
      }
      
      return startVendorOnboarding(session, from);
    
    case INTENT_TYPES.ORDER_STATUS:
      return handleOrderStatus(from, session);
    
    case INTENT_TYPES.VENDOR_SELECTION:
      await handleNumericSelection(from, text.trim());
      return;
    
    default:
      // Unknown intent - still try Cerebras
      try {
        const cerebrasResult = await delegateToCerebras(text, decision);
        return handleCerebrasResponse(from, text, decision, cerebrasResult, session);
      } catch (err) {
        console.error('[CEREBRAS_FAILED]', err.message);
        await sendAgentResponse(from, 'fallback');
      }
  }
}

/**
 * Handle Cerebras result
 * The LLM has reasoned, now act on its output
 */
async function handleCerebrasResponse(from, text, decision, cerebrasResult, session) {
  const { intent, item, quantity, location, price, shopName } = cerebrasResult;
  
  console.log('[CEREBRAS_RESULT]', JSON.stringify({ intent, item, quantity, location }));
  
  // Route based on Cerebras intent
  if (intent === 'BUY' || decision.intent === INTENT_TYPES.BUY) {
    if (item) {
      const buyIntent = { item, quantity, location };
      return handleFastBuy(from, buyIntent, decision);
    } else {
      await sendText(from, "I couldn't understand what you're looking for. Try: 'I need 50kg rice in Lagos'");
      return;
    }
  }
  
  if (intent === 'SELL' || decision.intent === INTENT_TYPES.SELL) {
    const aiDecision = { item, price, location, shopName };
    return startVendorOnboarding(session, from, aiDecision);
  }
  
  // Fallback for unrecognized
  await sendAgentResponse(from, 'fallback');
}

/**
 * Fast BUY handler using extracted params
 */
async function handleFastBuy(from, intent, decision) {
  try {
    console.log(`[FAST_BUY] item=${intent.item}, qty=${intent.quantity}, loc=${intent.location}`);
    
    // Show thinking if urgent
    if (decision.jev?.scores?.urgency > 0.7) {
      await sendText(from, "Got it! Searching urgent options... 🔍");
    } else {
      await sendText(from, "Searching for vendors... 🔍");
    }
    
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

    // Use interactive list message instead of plain text
    await sendVendorListInteractive(from, intent, vendorOrderPairs);
    
  } catch (err) {
    const errorType = categorizeError(err);
    const userMessage = getUserFriendlyMessage(errorType, err);
    logError(err, { from, intent, errorType, stage: 'handleFastBuy' });
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

// Init Baileys with message handler
async function initWhatsApp() {
  await initBaileySocket(async (msg) => {
    console.log('[BAILEYS] 📨 Received:', msg.text.substring(0, 30) + '...', '| from:', msg.from);
    try {
      // Pass full message to handle interactive responses
      await handleTextMessage(msg.from, msg, msg.fullMessage);
    } catch (err) {
      console.error('[BAILEYS] Error handling message:', err.message);
    }
  });
}

// Start Baileys
setTimeout(initWhatsApp, 1000);

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`GoToMart backend running on port ${PORT}`);
    console.log('⠋ Baileys WhatsApp connecting... (scan QR code when it appears)');
  });
}

module.exports = app;
