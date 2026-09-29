/**
 * Baileys WhatsApp Service - WebSocket-based, no external API
 * 
 * Install: npm i @whiskeysockets/baileys
 * Scan QR code on first run to link your WhatsApp number
 */

const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

let sock = null;
let messageHandler = null;

// Simple message store for retry functionality
const messageStore = new Map();

// Get message from store for retry
async function getMessage(key) {
  if (!key?.id) return undefined;
  const msg = messageStore.get(key.id);
  return msg?.message;
}

// Initialize Baileys socket
async function initBaileySocket(onMessageReceived) {
  if (sock) {
    // If we have a new handler, update it
    if (onMessageReceived) {
      messageHandler = onMessageReceived;
      console.log('[BAILEYS] Handler updated');
    }
    return sock;
  }
  
  // Store the handler
  if (onMessageReceived) {
    messageHandler = onMessageReceived;
    console.log('[BAILEYS] Handler registered');
  }

  const { state, saveCreds } = await useMultiFileAuthState('baileys_auth');
  
  console.log('[BAILEYS] Connecting to WhatsApp...');
  
  // Get latest WhatsApp Web version (recommended for v7.x)
  let version;
  try {
    const result = await fetchLatestBaileysVersion();  
    version = result.version;
    console.log('[BAILEYS] Using WhatsApp Web version:', version.join('.'));
  } catch (e) {
    console.log('[BAILEYS] Using default version');
    version = [2, 3000, 1016305113]; // Fallback version
  }
  
  // Note: printQRInTerminal is deprecated. We manually render QR below.
  sock = makeWASocket({
    auth: state,
    browser: ['GoToMart Bot', 'Chrome', '1.0.0'],
    connectTimeoutMs: 60000,
    version: version,
    defaultQueryTimeoutMs: 60000,
    syncFullHistory: false,
    markOnlineOnConnect: true,
    getMessage: getMessage, // Required for message retry
    msgRetryCounterCache: new Map(), // Track retry counts
  });

  sock.ev.on('creds.update', saveCreds);
  
  // Handle read receipts (blue ticks) for sent messages
  sock.ev.on('messages.update', (updates) => {
    for (const update of updates) {
      const { key, update: statusUpdate } = update;
      if (statusUpdate?.status) {
        const statusMap = {
          0: 'ERROR',
          1: 'PENDING', 
          2: 'SERVER_ACK',
          3: 'DELIVERY_ACK',
          4: 'READ',
          5: 'PLAYED'
        };
        const statusName = statusMap[statusUpdate.status] || statusUpdate.status;
        console.log(`[BAILEYS] Message ${key.id} status: ${statusName}`);
      }
    }
  });
  
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      console.log('\n[BAILEYS] ═════════════════════════════════════════════════');
      console.log('[BAILEYS]  📱 SCAN THIS QR CODE WITH YOUR WHATSAPP');
      console.log('[BAILEYS]  Settings → Linked Devices → Link a Device');
      console.log('[BAILEYS] ═════════════════════════════════════════════════\n');
      // Render QR code in terminal (printQRInTerminal is deprecated)
      qrcode.generate(qr, { small: true });
    }
    
    if (connection === 'open') {
      console.log('[BAILEYS] ✅ WhatsApp connected! Ready to receive messages.');
    }
    
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const reason = lastDisconnect?.error?.message || 'Unknown';
      console.log('[BAILEYS] ⚠️ Connection closed. Reason:', statusCode, reason);
      
      // Only reconnect if NOT logged out
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      if (shouldReconnect) {
        console.log('[BAILEYS] Reconnecting in 5 seconds...');
        setTimeout(() => {
          // Reset sock to allow reconnect
          sock = null;
          initBaileySocket();
        }, 5000);
      } else {
        console.log('[BAILEYS] Logged out. Scan QR code to reconnect.');
        sock = null;
      }
    }
    
    if (update.receivedPendingNotifications) {
      console.log('[BAILEYS] All pending notifications received');
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg || msg.key.fromMe) return;
    
    // Extract text from message
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    
    // Check for interactive responses (buttons/lists)
    const hasInteractive = !!(
      msg.message?.buttonsResponseMessage || 
      msg.message?.listResponseMessage || 
      msg.message?.templateButtonReplyMessage
    );
    
    if (hasInteractive) {
      console.log('[BAILEYS] 🎯 Interactive response detected:', JSON.stringify({
        buttons: msg.message?.buttonsResponseMessage,
        list: msg.message?.listResponseMessage,
        template: msg.message?.templateButtonReplyMessage
      }, null, 2).substring(0, 500));
    }
    
    // IMPORTANT: Use the actual remoteJid (could be @lid or @s.whatsapp.net)
    const fullJid = msg.key.remoteJid;
    const phoneNumber = fullJid.replace(/[@].*/, '').replace(/^\d+:/, '');
    
    console.log('[BAILEYS] 📨 Received from:', phoneNumber, 'JID:', fullJid, 'Text:', text.substring(0, 50));
    
    // Send read receipt (blue tick) for this message
    try {
      await sock.readMessages([msg.key]);
      console.log('[BAILEYS] ✓ Read receipt sent (blue tick)');
    } catch (e) {
      console.log('[BAILEYS] Read receipt error:', e.message);
    }
    
    const message = {
      from: fullJid,
      fromPhone: phoneNumber,
      text: text,
      type: 'text',
      fullMessage: msg
    };
    
    // Use global messageHandler if set, or the passed handler
    const handler = onMessageReceived || messageHandler;
    if (handler) {
      handler(message);
    } else {
      console.log('[BAILEYS] Received (no handler):', text, 'from', phoneNumber);
    }
  });

  return sock;
}

// Send text message
async function sendText(to, body) {
  if (!sock) {
    console.log('[BAILEYS] Socket not ready, attempting to initialize...');
    await initBaileySocket();
  }
  
  if (!sock) {
    console.error('[BAILEYS] Cannot send - socket is still null');
    throw new Error('WhatsApp not connected');
  }
  
  // IMPORTANT: Use the full JID as received (could be @lid or @s.whatsapp.net)
  // WhatsApp will handle the routing correctly
  let jid = to;
  if (!to.includes('@')) {
    // Only add @s.whatsapp.net if it's just a number
    jid = `${to}@s.whatsapp.net`;
  }
  
  try {
    console.log('[BAILEYS] Sending message to JID:', jid);
    console.log('[BAILEYS] Message body:', body.substring(0, 100));
    
    const result = await sock.sendMessage(jid, { text: body });
    
    // Store message for retry functionality
    messageStore.set(result.key.id, {
      key: result.key,
      message: { text: body }
    });
    
    // Keep only last 500 messages to prevent memory leak
    if (messageStore.size > 500) {
      const firstKey = messageStore.keys().next().value;
      messageStore.delete(firstKey);
    }
    
    console.log('[BAILEYS] ✓ Message sent successfully - ID:', result.key.id);
    return { id: result.key.id, status: 'sent' };
  } catch (err) {
    console.error('[BAILEYS] ✗ Send error:', err.message);
    console.error('[BAILEYS] Full error:', err);
    throw err;
  }
}

// Send vendor list
async function sendVendorList(to, intent, vendorOrderPairs) {
  const vendorText = vendorOrderPairs.map(({ vendor, reference }, i) => {
    return `${i + 1}. ${vendor.name}\n   ₦${vendor.price?.toLocaleString() || vendor.price} • ${vendor.location}${vendor.verified ? ' ✅' : ''}`;
  }).join('\n\n');

  const message = `🛒 GoToMart found ${vendorOrderPairs.length} vendors for ${[intent.quantity, intent.item].filter(Boolean).join(' ')}${intent.location ? ` in ${intent.location}` : ''}:

${vendorText}

Reply with 1-${vendorOrderPairs.length} to select`;

  return sendText(to, message);
}

// Send quick replies
async function sendQuickReplies(to, body, options, title = '') {
  const optionsText = options.map((opt, i) => `${i + 1}. ${opt.text}`).join('\n');
  const message = `${title ? title + '\n\n' : ''}${body}\n\n${optionsText}\n\nReply with a number.`;
  return sendText(to, message);
}

// WhatsApp Interactive: Button Message
// Use case: Yes/No, Confirm/Cancel, Quick actions
// IMPORTANT: Buttons require WhatsApp Business API or specific device support
async function sendButtonMessage(to, body, buttons) {
  if (!sock) {
    console.error('[BAILEYS] Cannot send buttons - socket not ready');
    return sendText(to, body); // Fallback to text
  }

  let jid = to;
  if (!to.includes('@')) {
    jid = `${to}@s.whatsapp.net`;
  }

  try {
    // Baileys uses buttons property for native button messages
    // Note: buttons may not display on all devices (iOS/Desktop often don't support)
    const buttonsList = buttons.slice(0, 3).map((btn, i) => ({
      buttonId: btn.id || `btn_${i}`,
      buttonText: { displayText: btn.text.slice(0, 20) }, // WhatsApp limit: 20 chars
      type: 1 // Quick reply button
    }));

    const result = await sock.sendMessage(jid, {
      text: body,
      buttons: buttonsList,
      headerType: 1
    });

    console.log('[BAILEYS] ✓ Button message sent - ID:', result.key.id);
    return result;
  } catch (err) {
    console.error('[BAILEYS] Button message failed:', err.message);
    // Fallback to plain text with numbered options
    const fallback = `${body}\n\n${buttons.map((b, i) => `${i + 1}. ${b.text}`).join('\n')}`;
    return sendText(to, fallback);
  }
}

// WhatsApp Interactive: List Message
// Use case: Vendor selection, menu items, multiple choices
// NOTE: List messages work on most devices but require WhatsApp Business API on some
async function sendListMessage(to, title, body, sections) {
  if (!sock) {
    console.error('[BAILEYS] Cannot send list - socket not ready');
    return sendText(to, body); // Fallback to text
  }

  let jid = to;
  if (!to.includes('@')) {
    jid = `${to}@s.whatsapp.net`;
  }

  try {
    // Format sections for Baileys native list message
    // Baileys uses 'list' property with sections inside
    const formattedSections = sections.map((section, idx) => ({
      title: (section.title || 'Options').slice(0, 24),
      rows: (section.options || section.items || []).slice(0, 10).map((opt, i) => ({
        title: (opt.text || opt.title || 'Option').slice(0, 24), // WhatsApp limit
        rowId: opt.id || `row_${idx}_${i}`,
        description: (opt.description || opt.desc || '').slice(0, 72) // WhatsApp limit
      }))
    }));

    // Baileys uses 'list' property for list messages
    const result = await sock.sendMessage(jid, {
      list: {
        title: (title || 'GoToMart').slice(0, 60),
        description: body.slice(0, 4096), // WhatsApp limit
        buttonText: 'Select',
        footer: 'Tap to choose',
        sections: formattedSections
      }
    });

    console.log('[BAILEYS] ✓ List message sent - ID:', result.key.id);
    return result;
  } catch (err) {
    console.error('[BAILEYS] List message failed:', err.message);
    console.error('[BAILEYS] Error details:', err.stack);
    // Fallback to plain text with numbered options
    let fallback = `*${title}*\n\n${body}\n\n`;
    sections.forEach((s, si) => {
      fallback += `*${s.title || 'Options'}*\n`;
      (s.options || s.items || []).forEach((opt, i) => {
        fallback += `${i + 1}. ${opt.text || opt.title}${opt.description ? ` - ${opt.description}` : ''}\n`;
      });
      fallback += '\n';
    });
    return sendText(to, fallback);
  }
}

// Send vendor list as interactive list
async function sendVendorListInteractive(to, intent, vendorOrderPairs) {
  const sections = [{
    title: `Vendors (${vendorOrderPairs.length})`,
    options: vendorOrderPairs.map(({ vendor, reference }, i) => ({
      id: `vendor_${reference}`,
      text: `${vendor.name}`.slice(0, 24),
      description: `₦${vendor.price?.toLocaleString()}, ${vendor.location}${vendor.verified ? ' ✅' : ''}`.slice(0, 72)
    }))
  }];

  return sendListMessage(
    to,
    '🛒 Available Vendors',
    `Found ${vendorOrderPairs.length} vendors${intent.location ? ` in ${intent.location}` : ''}. Tap an item to select:`,
    sections
  );
}

// Send order confirmation buttons
async function sendOrderConfirmation(to, vendor, intent, reference) {
  const buttons = [
    { id: `buy_${reference}`, text: `Pay ₦${vendor.price}` },
    { id: `contact_${reference}`, text: 'Contact Vendor' },
    { id: 'cancel', text: 'Cancel' }
  ];

  const body = `Selected: ${vendor.name}\n${intent.quantity || ''} ${intent.item}\n💰 ₦${vendor.price?.toLocaleString()}\n📍 ${vendor.location}`;

  return sendButtonMessage(to, body, buttons);
}

// Send onboarding welcome with buttons
async function sendOnboardingWelcome(to) {
  const buttons = [
    { id: 'start_selling', text: '✅ Start Selling' },
    { id: 'learn_more', text: '📖 Learn More' },
    { id: 'talk_to_human', text: '👤 Talk to Human' }
  ];

  const body = `Welcome to *GoToMart*! 🛒

Would you like to become a vendor and sell your products to thousands of buyers?`;

  return sendButtonMessage(to, body, buttons);
}

// Message received handler setter
function setMessageHandler(handler) {
  messageHandler = handler;
}

// Get socket for direct access
function getSocket() {
  return sock;
}

module.exports = {
  initBaileySocket,
  sendText,
  sendVendorList,
  sendQuickReplies,
  // Interactive Messages
  sendButtonMessage,
  sendListMessage,
  sendVendorListInteractive,
  sendOrderConfirmation,
  sendOnboardingWelcome,
  setMessageHandler,
  getSocket
};
