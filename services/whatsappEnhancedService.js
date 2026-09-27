/**
 * Enhanced WhatsApp Service with Catalog Forward & Interactive Components
 * Supports WhatsApp Business Catalog forwards, quick replies, list messages
 */

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

/**
 * Send basic text message
 */
async function sendText(to, body) {
  return axios.post(graphUrl(), {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body }
  }, { headers: headers() });
}

/**
 * Send interactive Quick Reply buttons
 */
async function sendQuickReplies(to, body, options, title = 'Choose an option') {
  const quickReplies = options.map((option, index) => ({
    type: 'text',
    text: option.text,
    // WhatsApp shows first 3 options as buttons
    // Emoji support for better UX
  }));

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: { type: 'text', text: title },
      body: { text: body },
      action: {
        buttons: quickReplies.slice(0, 3) // WhatsApp allows max 3 quick replies
      }
    }
  };

  return axios.post(graphUrl(), payload, { headers: headers() });
}

/**
 * Send vendor listing options when someone says "I want to sell"
 */
async function sendVendorOnboardingOptions(to) {
  const options = [
    {
      text: "📱 Forward catalog item",
      description: "Send from WhatsApp Business Catalog"
    },
    {
      text: "✍️ Type manually",
      description: "Item name, price, location"
    },
    {
      text: "🖼️ Upload image + details",
      description: "Send photo with description"
    }
  ];

  return sendQuickReplies(
    to,
    `To list your products:\n1️⃣ Open WhatsApp Business Catalog and Forward item\n2️⃣ Or reply: "rice 50kg, ₦45,000, Ikorodu"\n\nChoose your preferred method:`,
    options,
    "📦 List Your Products"
  );
}

/**
 * Handle catalog forward message (when vendor forwards product from catalog)
 */
async function sendCatalogForwardAcknowledgment(to, productTitle) {
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: '✅ Catalog Item Received' },
      body: {
        text: `I see you forwarded:\n${productTitle}\n\nAlmost ready! Next, reply with:\n🏦 Bank name, account number, account name`
      },
      footer: { text: 'Complete registration to go live' },
      action: {
        button: 'Next Steps',
        sections: [{
          title: 'Complete Registration',
          rows: [
            { id: 'bank_details', title: '📝 Add bank info', description: 'Where to receive payments' },
            { id: 'confirm_listing', title: '✅ Confirm listing', description: 'Review & publish now' }
          ]
        }]
      }
    }
  };

  return axios.post(graphUrl(), payload, { headers: headers() });
}

/**
 * Send Airtable listing confirmation with rich preview
 */
async function sendListingConfirmation(to, vendorData) {
  const { item, price, location, shopName } = vendorData;
  
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: 'vendor_live_notification',
      language: { code: 'en_US' },
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: 'text',
              text: '🎉 You\'re Live!'
            }
          ]
        },
        {
          type: 'body',
          parameters: [
            { type: 'text', text: shopName || 'Your Shop' },
            { type: 'text', text: item || 'product' },
            { type: 'text', text: `₦${Number(price).toLocaleString()}` },
            { type: 'text', text: location || 'your area' }
          ]
        },
        {
          type: 'button',
          sub_type: 'quick_reply',
          index: 0,
          parameters: [
            { type: 'payload', payload: 'add_another_item' }
          ]
        },
        {
          type: 'button',
          sub_type: 'quick_reply',
          index: 1,
          parameters: [
            { type: 'payload', payload: 'view_dashboard' }
          ]
        }
      ]
    }
  };

  return axios.post(graphUrl(), payload, { headers: headers() });
}

/**
 * Buyer flow - optimized vendor list with rich components
 */
async function sendEnhancedVendorList(to, intent, vendorOrderPairs) {
  const rows = vendorOrderPairs.map(({ vendor, reference }) => ({
    id: reference,
    title: `${vendor.name.slice(0, 20)}${vendor.verified ? ' ✅' : ''}`,
    description: `₦${vendor.price.toLocaleString()} • ${vendor.location}`,
    // WhatsApp List Messages can have emoji in description
  }));

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: '🛒 Available Vendors' },
      body: {
        text: `Found ${vendorOrderPairs.length} vendors for:\n${intent.item}${intent.location ? ` in ${intent.location}` : ''}`
      },
      footer: { text: 'Tap to select • Use 👆🏻 to scroll' },
      action: {
        button: 'Browse Vendors',
        sections: [{
          title: 'Available Now',
          rows
        }]
      }
    }
  };

  return axios.post(graphUrl(), payload, { headers: headers() });
}

/**
 * Welcome message for new users
 */
async function sendWelcomeMessage(to) {
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: 'Welcome to GoToMart! 🛍️' },
      body: {
        text: 'Need something or want to sell? I can help either way!'
      },
      footer: { text: 'Choose an option to get started' },
      action: {
        button: 'Start Shopping/Listing',
        sections: [{
          title: 'What would you like to do?',
          rows: [
            { id: 'buy_intent', title: '🛒 Buy Something', description: 'Find local vendors near you' },
            { id: 'sell_intent', title: '🏪 Sell on GoToMart', description: 'List your products for sale' },
            { id: 'help', title: '❓ Need Help?', description: 'Learn how GoToMart works' }
          ]
        }]
      }
    }
  };

  return axios.post(graphUrl(), payload, { headers: headers() });
}

module.exports = {
  sendText,
  sendQuickReplies,
  sendVendorOnboardingOptions,
  sendCatalogForwardAcknowledgment,
  sendListingConfirmation,
  sendEnhancedVendorList,
  sendWelcomeMessage
};
