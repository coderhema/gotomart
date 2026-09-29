/**
 * Enhanced WhatsApp Service with Catalog Forward & Interactive Components
 * Supports WhatsApp Business Catalog forwards, quick replies, list messages
 *
 * Features:
 *   - Basic text messages
 *   - Interactive quick reply buttons
 *   - List messages for vendor selection
 *   - Catalog forward acknowledgments
 *   - Template messages for confirmations
 *   - Rich welcome messages
 *
 * Environment Variables Required:
 *   - META_PHONE_NUMBER_ID: Your WhatsApp Business phone number ID
 *   - META_ACCESS_TOKEN: Meta Graph API access token
 */

const axios = require('axios');

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
 * Send interactive Quick Reply buttons
 * WhatsApp allows maximum 3 quick reply buttons per message
 *
 * @param {string} to - Recipient WhatsApp number
 * @param {string} body - Main message body text
 * @param {Array<Object>} options - Array of button options
 * @param {string} options[].text - Button text (supports emoji)
 * @param {string} [title='Choose an option'] - Header title
 * @returns {Promise<Object>} API response
 */
async function sendQuickReplies(to, body, options, title = 'Choose an option') {
  // Map options to WhatsApp button format
  // Note: WhatsApp displays max 3 buttons, additional options are ignored
  const buttons = options.slice(0, 3).map((option) => ({
    type: 'reply',
    reply: {
      id: option.id || option.text.slice(0, 256),
      title: option.text.slice(0, 20) // WhatsApp button text limit: 20 chars
    }
  }));

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: { type: 'text', text: title },
      body: { text: body },
      action: { buttons }
    }
  };

  return axios.post(graphUrl(), payload, { headers: headers() });
}

/**
 * Send vendor onboarding options when vendor says "I want to sell"
 * Presents 3 ways to list products: forward catalog, type manually, or upload image
 *
 * @param {string} to - Vendor's WhatsApp number
 * @returns {Promise<Object>} API response
 */
async function sendVendorOnboardingOptions(to) {
  const options = [
    { text: '📱 Forward catalog item', id: 'catalog_forward' },
    { text: '✍️ Type manually', id: 'type_manual' },
    { text: '🖼️ Upload image + details', id: 'upload_image' }
  ];

  const messageBody = [
    'To list your products:',
    '',
    '1️⃣ Open WhatsApp Business Catalog and Forward item',
    '2️⃣ Or reply: "rice 50kg, ₦45,000, Ikorodu"',
    '',
    'Choose your preferred method:'
  ].join('\n');

  return sendQuickReplies(
    to,
    messageBody,
    options,
    '📦 List Your Products'
  );
}

/**
 * Send acknowledgment when vendor forwards product from WhatsApp Business Catalog
 * Prompts vendor to complete registration with bank details
 *
 * @param {string} to - Vendor's WhatsApp number
 * @param {string} productTitle - Title of forwarded catalog item
 * @returns {Promise<Object>} API response
 */
async function sendCatalogForwardAcknowledgment(to, productTitle) {
  const rows = [
    {
      id: 'bank_details',
      title: '📝 Add bank info',
      description: 'Where to receive payments'
    },
    {
      id: 'confirm_listing',
      title: '✅ Confirm listing',
      description: 'Review & publish now'
    }
  ];

  const bodyText = [
    'I see you forwarded:',
    productTitle,
    '',
    'Almost ready! Next, reply with:',
    '🏦 Bank name, account number, account name'
  ].join('\n');

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: '✅ Catalog Item Received' },
      body: { text: bodyText },
      footer: { text: 'Complete registration to go live' },
      action: {
        button: 'Next Steps',
        sections: [{ title: 'Complete Registration', rows }]
      }
    }
  };

  return axios.post(graphUrl(), payload, { headers: headers() });
}

/**
 * Send Airtable listing confirmation using template message
 * Notifies vendor their listing is live
 *
 * @param {string} to - Vendor's WhatsApp number
 * @param {Object} vendorData - Vendor listing data
 * @param {string} vendorData.item - Product name
 * @param {number} vendorData.price - Product price
 * @param {string} vendorData.location - Vendor location
 * @param {string} vendorData.shopName - Shop/business name
 * @returns {Promise<Object>} API response
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
            { type: 'text', text: "🎉 You're Live!" }
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
 * Send enhanced vendor list for buyer flow
 * Displays vendors with prices, locations, and verification badges
 *
 * @param {string} to - Buyer's WhatsApp number
 * @param {Object} intent - Buyer's search intent
 * @param {string} intent.item - Item being searched for
 * @param {string} intent.location - Location preference
 * @param {Array} vendorOrderPairs - Array of { vendor, reference } objects
 * @returns {Promise<Object>} API response
 */
async function sendEnhancedVendorList(to, intent, vendorOrderPairs) {
  // Build list rows with vendor info
  const rows = vendorOrderPairs.map(({ vendor, reference }) => ({
    id: reference,
    title: `${vendor.name.slice(0, 20)}${vendor.verified ? ' ✅' : ''}`,
    description: `₦${vendor.price.toLocaleString()} • ${vendor.location}`.slice(0, 72)
  }));

  const locationText = intent.location ? ` in ${intent.location}` : '';

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: '🛒 Available Vendors' },
      body: {
        text: `Found ${vendorOrderPairs.length} vendors for:\n${intent.item}${locationText}`
      },
      footer: { text: 'Tap to select • Use 👆🏻 to scroll' },
      action: {
        button: 'Browse Vendors',
        sections: [{ title: 'Available Now', rows }]
      }
    }
  };

  return axios.post(graphUrl(), payload, { headers: headers() });
}

/**
 * Send welcome message for new users
 * Presents options to buy, sell, or get help
 *
 * @param {string} to - User's WhatsApp number
 * @returns {Promise<Object>} API response
 */
async function sendWelcomeMessage(to) {
  const rows = [
    {
      id: 'buy_intent',
      title: '🛒 Buy Something',
      description: 'Find local vendors near you'
    },
    {
      id: 'sell_intent',
      title: '🏪 Sell on GoToMart',
      description: 'List your products for sale'
    },
    {
      id: 'help',
      title: '❓ Need Help?',
      description: 'Learn how GoToMart works'
    }
  ];

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: 'Welcome to GoToMart! 🛍️' },
      body: { text: 'Need something or want to sell? I can help either way!' },
      footer: { text: 'Choose an option to get started' },
      action: {
        button: 'Start Shopping/Listing',
        sections: [{ title: 'What would you like to do?', rows }]
      }
    }
  };

  return axios.post(graphUrl(), payload, { headers: headers() });
}

/**
 * Exported functions
 */
module.exports = {
  // Basic messaging
  sendText,
  
  // Interactive components
  sendQuickReplies,
  sendEnhancedVendorList,
  sendWelcomeMessage,
  
  // Vendor onboarding flow
  sendVendorOnboardingOptions,
  sendCatalogForwardAcknowledgment,
  sendListingConfirmation
};
