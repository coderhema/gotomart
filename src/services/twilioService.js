/**
 * Baileys WhatsApp Service - WebSocket-based, no external API
 * 
 * Install: npm i @whiskeysockets/baileys
 * Scan QR code on first run to link your WhatsApp number
 */

const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');

let sock = null;
let messageBuffer = [];
let messageHandler = null;

// Initialize Baileys socket
async function initBaileySocket(onMessageReceived) {
  if (sock) return sock;

  const { state, saveCreds } = await useMultiFileAuthState('baileys_auth');
  
  console.log('[BAILEYS] Connecting to WhatsApp...');
  
  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    browser: ['GoToMart Bot', 'Chrome', '1.0.0'],
    connectTimeoutMs: 60000,
  });

  sock.ev.on('creds.update', saveCreds);
  
  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('[BAILEYS] ═════════════════════════════════════════════════');
      console.log('[BAILEYS]  📱 SCAN THIS QR CODE WITH YOUR WHATSAPP');
      console.log('[BAILEYS]  Settings → Linked Devices → Link a Device');
      console.log('[BAILEYS] ═════════════════════════════════════════════════');
    }
    if (connection === 'open') {
      console.log('[BAILEYS] ✅ WhatsApp connected! Ready to receive messages.');
    }
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error instanceof Boom) 
        ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
        : true;
      console.log('[BAILEYS] Connection closed, reconnecting:', shouldReconnect);
      if (shouldReconnect) {
        initBaileySocket();
      }
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg || msg.key.fromMe) return;
    
    const message = {
      from: msg.key.remoteJid.replace(/[@].*/, '').replace(/^\d+:/, ''),
      text: msg.message?.conversation || msg.message?.extendedTextMessage?.text || '',
      type: 'text',
      fullMessage: msg
    };
    
    // Use global messageHandler if set
    const handler = onMessageReceived || messageHandler;
    if (handler) {
      handler(message);
    } else {
      console.log('[BAILEYS] Received (no handler):', message.text, 'from', message.from);
    }
  });

  return sock;
}

// Send text message
async function sendText(to, body) {
  if (!sock) {
    await initBaileySocket();
  }
  
  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
  
  try {
    await sock.sendMessage(jid, { text: body });
    console.log('[BAILEYS] Sent to', to, ':', body.substring(0, 50) + '...');
    return { id: Date.now().toString(), status: 'sent' };
  } catch (err) {
    console.error('[BAILEYS] Send error:', err.message);
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

// Parse incoming message (Baileys format)
function parseBaileysMessage(body) {
  // When used via webhook, body might be the parsed format
  return {
    from: body.from,
    text: body.text,
    type: 'text'
  };
}

// Webhook verification - just return 200
function handleWebhookVerify(req, res) {
  res.sendStatus(200);
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
  parseBaileysMessage,
  handleWebhookVerify,
  setMessageHandler,
  getSocket
};
