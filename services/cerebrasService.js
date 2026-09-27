const Cerebras = require('@cerebras/cerebras_cloud_sdk');

// Initialize Cerebras client
const cerebras = new Cerebras({
  apiKey: process.env.CEREBRAS_API_KEY,
});

/**
 * Router System Prompt
 * Classifies user intent into BUY or SELL and extracts relevant parameters
 */
const ROUTER_PROMPT = `You are the routing agent for GoToMart, a WhatsApp marketplace for Nigeria.

Analyze the user's message and classify their intent into one of two categories: "BUY" or "SELL".

If "BUY":
- Extract 'item' (what they want to buy, simplified, e.g., "rice", "tomatoes")
- Extract 'quantity' (amount/unit if mentioned, e.g., "50kg bag", "2 crates")
- Extract 'location' (Nigerian area/neighborhood, e.g., "Ikorodu", "Yaba")

If "SELL":
- Extract 'item' (what they want to sell)
- Extract 'price' (numeric value in Naira, no comma)
- Extract 'location' (their shop location)
- Extract 'shopName' (shop/business name if mentioned)

If unclear or greeting, return intent "UNKNOWN".

Respond ONLY in valid JSON format. Example outputs:
{"intent": "BUY", "item": "rice", "quantity": "50kg bag", "location": "Ikorodu"}
{"intent": "SELL", "item": "rice", "price": 45000, "location": "Ikorodu", "shopName": "Iya Basira Foods"}
{"intent": "UNKNOWN"}`;

/**
 * Parse vendor catalog text (for onboarding step)
 * Used when vendor provides item details in plain text
 */
const CATALOG_PROMPT = `You extract vendor listing info from a shop owner's WhatsApp message.
Return ONLY valid JSON, no prose, no markdown fences, matching this exact shape:
{"shopName": string, "item": string, "price": number, "location": string}

- "shopName": the business/shop name mentioned. If not stated, use "".
- "item": the primary product being listed, simplified and singular.
- "price": the price as a plain number in Naira, no currency symbol or commas. If not stated, use 0.
- "location": the shop's area/neighborhood. If not stated, use "".

Never include any text outside the JSON object.`;

/**
 * Call Cerebras with system prompt and user text
 * Returns parsed JSON response
 */
async function callJson(systemPrompt, userText) {
  try {
    const response = await cerebras.chat.completions.create({
      model: 'llama3.1-70b', // Standard Cerebras model
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText }
      ],
      response_format: { type: 'json_object' },
      temperature: 0
    });

    const raw = response.choices?.[0]?.message?.content || '{}';
    return JSON.parse(raw);
  } catch (err) {
    console.error('Cerebras parsing error:', err.message);
    return { intent: 'UNKNOWN' };
  }
}

/**
 * Main intent parser - classifies BUY vs SELL and extracts parameters
 * Returns structured data for routing
 */
async function parseUserIntent(userText) {
  const parsed = await callJson(ROUTER_PROMPT, userText);
  
  // Normalize and sanitize
  return {
    intent: (parsed.intent || 'UNKNOWN').toUpperCase(),
    item: (parsed.item || '').trim().toLowerCase(),
    quantity: (parsed.quantity || '').trim(),
    location: (parsed.location || '').trim(),
    price: Number(parsed.price) || 0,
    shopName: (parsed.shopName || '').trim()
  };
}

/**
 * Parse vendor catalog submission
 * Used during onboarding when vendor sends shop details
 */
async function parseVendorCatalog(text) {
  const parsed = await callJson(CATALOG_PROMPT, text);
  if (!parsed) return null;
  
  return {
    shopName: (parsed.shopName || '').trim(),
    item: (parsed.item || '').trim().toLowerCase(),
    price: Number(parsed.price) || 0,
    location: (parsed.location || '').trim()
  };
}

/**
 * Legacy parser for backward compatibility
 * Maintains same interface as original parseIntent
 */
async function parseIntent(text) {
  const result = await parseUserIntent(text);
  
  if (result.intent === 'BUY') {
    return {
      item: result.item,
      quantity: result.quantity,
      location: result.location
    };
  }
  
  // For non-buy intent, return empty structure
  return { item: '', quantity: '', location: '' };
}

module.exports = {
  parseUserIntent,    // New: Returns {intent, item, quantity, location, price, shopName}
  parseIntent,        // Legacy: Returns {item, quantity, location}
  parseVendorCatalog  // Same as before
};
