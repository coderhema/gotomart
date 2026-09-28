/**
 * Twilio WhatsApp Service - Alternative to Meta API for demos
 * Use when Meta is blocked or unavailable
 */

const twilio = require('twilio');

const client = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const from = process.env.TWILIO_WHATSAPP_FROM; // e.g., whatsapp:+14155238886

async function sendText(to, body) {
  if (!client) {
    console.log('[TWILIO MOCK] Sending text to', to, ':', body);
    return { sid: 'MOCK_' + Date.now() };
  }

  return client.messages.create({
    body,
    from: from,
    to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
  });
}

/**
 * Send interactive list message (Twilio supports this via buttons)
 */
async function sendVendorList(to, intent, vendorOrderPairs) {
  // Twilio interactive messages work differently - send as structured message
  const vendorText = vendorOrderPairs.map(({ vendor, reference }, i) => {
    return `${i + 1}. ${vendor.name}\n   ₦${vendor.price.toLocaleString()} • ${vendor.location}\n   (Reply ${i + 1} to select)`;
  }).join('\n\n');

  const message = `🛒 Vendors for ${[intent.quantity, intent.item].filter(Boolean).join(' ')}${intent.location ? ` in ${intent.location}` : ''}:\n\n${vendorText}\n\nReply with the number to select.`;

  if (!client) {
    console.log('[TWILIO MOCK] Sending vendor list to', to);
    return { sid: 'MOCK_' + Date.now() };
  }

  return client.messages.create({
    body: message,
    from: from,
    to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
  });
}

/**
 * Send Quick Reply buttons (as text with numbered options for Twilio)
 */
async function sendQuickReplies(to, body, options) {
  const optionsText = options.map((opt, i) => `${i + 1}. ${opt.text}`).join('\n');
  const message = `${body}\n\n${optionsText}\n\nReply with a number.`;

  return sendText(to, message);
}

/**
 * Handle Twilio webhook - convert Twilio format to our internal format
 */
function parseTwilioMessage(body) {
  return {
    from: body.From?.replace('whatsapp:', ''),
    text: body.Body,
    type: 'text'
  };
}

// Twilio uses GET for webhook verification
function handleWebhookVerify(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
}

module.exports = {
  sendText,
  sendVendorList,
  sendQuickReplies,
  parseTwilioMessage,
  handleWebhookVerify,
  client
};