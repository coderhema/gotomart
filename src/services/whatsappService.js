const axios = require('axios');

/**
 * WhatsApp Business API Service
 * Handles sending messages via Meta's WhatsApp Business API
 *
 * Environment Variables Required:
 *   - META_PHONE_NUMBER_ID: Your WhatsApp Business phone number ID
 *   - META_ACCESS_TOKEN: Meta Graph API access token
 */

/**
 * Get the WhatsApp Graph API URL
 * @returns {string} The WhatsApp API endpoint URL
 */
function graphUrl() {
  return `https://graph.facebook.com/v19.0/${process.env.META_PHONE_NUMBER_ID}/messages`;
}

/**
 * Get request headers for WhatsApp API
 * @returns {Object} Headers object with authorization
 */
function headers() {
  return {
    Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Send a simple text message
 * @param {string} to - Recipient WhatsApp number in international format
 * @param {string} body - Message text content
 * @returns {Promise<Object>} API response
 */
async function sendText(to, body) {
  return axios.post(
    graphUrl(),
    {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body }
    },
    { headers: headers() }
  );
}

/**
 * Send an interactive vendor list message
 * Vendors are pre-paired with Order records; each row ID is the order reference.
 * The Orders table (Airtable) is the source of truth.
 *
 * @param {string} to - Recipient WhatsApp number
 * @param {Object} intent - User's search intent
 * @param {string} intent.quantity - Quantity requested
 * @param {string} intent.item - Item name
 * @param {string} intent.location - Location preference
 * @param {Array} vendorOrderPairs - Array of { vendor, reference } objects
 * @returns {Promise<Object>} API response
 */
async function sendVendorList(to, intent, vendorOrderPairs) {
  // Build list rows from vendor data
  const rows = vendorOrderPairs.map(({ vendor, reference }) => {
    const rating = vendor.rating || '—';
    const verified = vendor.verified ? ' • Verified' : '';
    const price = `₦${vendor.price.toLocaleString()}`;

    return {
      id: reference,
      title: vendor.name.slice(0, 24), // WhatsApp limit: 24 chars
      description: `${price} • ${rating}★${verified}`.slice(0, 72) // WhatsApp limit: 72 chars
    };
  });

  // Build search query text from intent
  const itemText = [intent.quantity, intent.item].filter(Boolean).join(' ');
  const locationText = intent.location ? ` in ${intent.location}` : '';

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: 'Vendors found' },
      body: {
        text: `Here's what I found for ${itemText}${locationText}:`
      },
      footer: { text: 'Tap to select and pay' },
      action: {
        button: 'View Vendors',
        sections: [{ title: 'Available now', rows }]
      }
    }
  };

  return axios.post(graphUrl(), payload, { headers: headers() });
}

/**
 * Exported functions
 */
module.exports = {
  sendText,
  sendVendorList
};
