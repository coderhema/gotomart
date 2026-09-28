const axios = require('axios');

function graphUrl() {
  return `https://graph.facebook.com/v19.0/${process.env.META_PHONE_NUMBER_ID}/messages`;
}

function headers() {
  return {
    Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  };
}

async function sendText(to, body) {
  return axios.post(graphUrl(), {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body }
  }, { headers: headers() });
}

/**
 * `vendors` here are pre-paired with a created Order record, so each row_id
 * is just that order's Reference — the Orders table (Airtable) is the
 * source of truth, not the row_id payload itself.
 */
async function sendVendorList(to, intent, vendorOrderPairs) {
  const rows = vendorOrderPairs.map(({ vendor, reference }) => ({
    id: reference,
    title: vendor.name.slice(0, 24),
    description: `₦${vendor.price.toLocaleString()} • ${vendor.rating || '—'}★${vendor.verified ? ' • Verified' : ''}`.slice(0, 72)
  }));

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: 'Vendors found' },
      body: {
        text: `Here's what I found for ${[intent.quantity, intent.item].filter(Boolean).join(' ')}${intent.location ? ` in ${intent.location}` : ''}:`
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

module.exports = { sendText, sendVendorList };
