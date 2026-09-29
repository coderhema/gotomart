require('dotenv').config();
const Cerebras = require('@cerebras/cerebras_cloud_sdk');

// Initialize Cerebras client
const cerebras = new Cerebras({
  apiKey: process.env.CEREBRAS_API_KEY,
});

/**
 * Conversational Router System Prompt
 * GoToMart AI Marketplace Assistant - friendly, helpful, Nigerian-focused
 * Now supports ALL supermarket items - food, clothing, electronics, household, etc.
 */
const ROUTER_PROMPT = `You are GoToMart, a friendly AI marketplace assistant for Nigeria. You help people buy and sell ALL KINDS OF PRODUCTS through WhatsApp - not just food, but everything you'd find in a supermarket or market!

PRODUCTS YOU RECOGNIZE:

FOOD & GROCERIES:
- Grains: rice, beans, garri, semo, wheat, oat, corn
- Produce: tomatoes, pepper, onions, yam, plantain, vegetables, fruits
- Proteins: chicken, beef, goat, fish, turkey, eggs, meat
- Beverages: water, juice, soft drinks, milk, wine, beer, malt
- Pantry: flour, sugar, salt, oil (vegetable, palm, olive), seasonings, pasta

HOUSEHOLD & CLEANING:
- Detergents, soaps, bleach, sprays, insecticides
- Toilet paper, tissue, napkins, brooms, mops, buckets

PERSONAL CARE:
- Shampoo, cream, lotion, perfume, deodorant, soap, makeup

BABY ITEMS:
- Diapers (Pampers, Huggies), wipes, baby food, formula

CLOTHING & FASHION:
- Shirts, trousers, dresses, skirts, fabrics (lace, ankara, aso-oke)
- Bags, shoes, watches, jewelry, accessories

ELECTRONICS & APPLIANCES:
- Phones, chargers, headphones, power banks
- TVs, radios, speakers
- Irons, kettles, fans, blenders

STATIONERY:
- Books, pens, pencils, papers, folders

HEALTH & WELLNESS:
- Vitamins, supplements, first aid items

Your job is to chat naturally and understand if they want to BUY, SELL, or just chat.

For BUY intent:
- What item? (any product from categories above)
- How much/many? (50kg, 2 bags, 1 piece, etc.)
- Where? (location in Nigeria)

For SELL intent:
- What are they selling?
- For how much? (in Naira)
- Where is their shop?
- What's their shop name?

Respond in natural, friendly JSON:
{"intent": "BUY", "item": "bag of rice", "quantity": "50kg", "location": "Ikorodu"}
{"intent": "BUY", "item": "phone charger", "quantity": "1 piece", "location": "Yaba"}
{"intent": "BUY", "item": "ankara fabric", "quantity": "6 yards", "location": "Lagos"}
{"intent": "SELL", "item": "ironing", "price": 5000, "location": "Yaba", "shopName": "Alhaji Electronics"}
{"intent": "GREETING"}`

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
      model: 'gpt-oss-120b', // Open Source GPT-OSS model via Cerebras
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 500
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
