/**
 * TypeSafe JEV Service
 * Provides type-safe AI outputs with validation for faster, reliable computations
 * Uses TypeSafe SDK pattern with Zod-like validation
 */

require('dotenv').config();
const Cerebras = require('@cerebras/cerebras_cloud_sdk');

const cerebras = new Cerebras({
  apiKey: process.env.CEREBRAS_API_KEY,
});

// Type definitions for structured outputs
const IntentSchema = {
  type: 'object',
  properties: {
    intent: { type: 'string', enum: ['BUY', 'SELL', 'UNKNOWN'] },
    item: { type: 'string' },
    quantity: { type: 'string' },
    location: { type: 'string' },
    price: { type: 'number' },
    shopName: { type: 'string' }
  },
  required: ['intent', 'item', 'location', 'price', 'shopName']
};

const CatalogSchema = {
  type: 'object',
  properties: {
    shopName: { type: 'string' },
    item: { type: 'string' },
    price: { type: 'number' },
    location: { type: 'string' }
  },
  required: ['shopName', 'item', 'price', 'location']
};

const SearchQuerySchema = {
  type: 'object',
  properties: {
    item: { type: 'string' },
    normalizedItem: { type: 'string' },
    location: { type: 'string' },
    normalizedLocation: { type: 'string' },
    searchTerms: { type: 'array', items: { type: 'string' } }
  },
  required: ['item', 'normalizedItem', 'location']
};

/**
 * Call TypeSafe JEV with structured output
 * Returns validated JSON matching the schema
 */
async function callTypeSafe(systemPrompt, userText, schema, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await cerebras.chat.completions.create({
        model: 'gpt-oss-120b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userText }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'structured_output',
            schema: schema
          }
        },
        temperature: 0,
        max_tokens: 500
      });

      const raw = response.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(raw);
      
      // Validate required fields
      const required = schema.required || [];
      const missing = required.filter(field => {
        const value = parsed[field];
        return value === undefined || value === null || value === '';
      });
      
      if (missing.length > 0 && attempt < retries) {
        console.warn(`TypeSafe validation: missing fields ${missing.join(', ')}, retrying...`);
        continue;
      }
      
      return parsed;
    } catch (err) {
      console.error(`TypeSafe JEV error (attempt ${attempt + 1}):`, err.message);
      if (attempt === retries) {
        return createDefaultResponse(schema);
      }
    }
  }
}

function createDefaultResponse(schema) {
  const defaults = {
    'intent': 'UNKNOWN',
    'item': '',
    'quantity': '',
    'location': '',
    'price': 0,
    'shopName': '',
    'normalizedItem': '',
    'normalizedLocation': '',
    'searchTerms': []
  };
  
  const result = {};
  for (const field of schema.required || []) {
    result[field] = defaults[field] ?? '';
  }
  return result;
}

// Prompts for structured extraction
const INTENT_PROMPT = `You are the routing agent for GoToMart, a WhatsApp marketplace for Nigeria.

Analyze the user's message and classify into: BUY, SELL, or UNKNOWN.

BUY: User wants to purchase something. Extract item, quantity, location.
SELL: User wants to list products. Extract item, price, location, shopName.
UNKNOWN: Greeting, help request, or unclear intent.

Return ONLY valid JSON with all fields populated (use empty strings/zeros if not mentioned).`;

const CATALOG_PROMPT = `Extract vendor listing details from the message.
Return shopName, item, price (number), location.
All fields required - infer if not explicitly stated.`;

const SEARCH_QUERY_PROMPT = `Normalize and expand a search query for Nigerian marketplace.

Given a buyer's request like "50kg rice in Ikorodu", extract:
- normalizedItem: standardized product name (e.g., "rice", "tomatoes")
- normalizedLocation: area/neighborhood (e.g., "ikorodu", "yaba")
- searchTerms: array of related terms for fuzzy matching (e.g., ["rice", "long grain rice", "mama's pride rice"])

Return structured JSON with normalized values for database search optimization.`;

/**
 * Faster intent parsing with TypeSafe structured outputs
 */
async function parseIntentTypeSafe(userText) {
  const result = await callTypeSafe(INTENT_PROMPT, userText, IntentSchema);
  
  return {
    intent: (result.intent || 'UNKNOWN').toUpperCase(),
    item: (result.item || '').trim().toLowerCase(),
    quantity: (result.quantity || '').trim(),
    location: (result.location || '').trim().toLowerCase(),
    price: Number(result.price) || 0,
    shopName: (result.shopName || '').trim()
  };
}

/**
 * Parse vendor catalog with type-safe validation
 */
async function parseCatalogTypeSafe(text) {
  const result = await callTypeSafe(CATALOG_PROMPT, text, CatalogSchema);
  
  return {
    shopName: (result.shopName || '').trim(),
    item: (result.item || '').trim().toLowerCase(),
    price: Number(result.price) || 0,
    location: (result.location || '').trim()
  };
}

/**
 * Enhanced search query normalization for faster lookups
 * Pre-computes search terms for fuzzy matching
 */
async function normalizeSearchQuery(userText) {
  const result = await callTypeSafe(SEARCH_QUERY_PROMPT, userText, SearchQuerySchema);
  
  return {
    item: (result.item || '').trim().toLowerCase(),
    normalizedItem: (result.normalizedItem || result.item || '').trim().toLowerCase(),
    location: (result.location || '').trim().toLowerCase(),
    normalizedLocation: (result.normalizedLocation || result.location || '').trim().toLowerCase(),
    searchTerms: (result.searchTerms || []).map(t => t.toLowerCase())
  };
}

/**
 * Batch process multiple queries efficiently
 * Uses Promise.all for parallel processing
 */
async function batchParseIntents(texts) {
  const promises = texts.map(text => parseIntentTypeSafe(text));
  return await Promise.all(promises);
}

/**
 * Compute vendor relevance score for ranking
 * Type-safe computation for better performance
 */
function computeVendorScore(vendor, searchQuery, weights = {}) {
  const {
    verifiedWeight = 10,
    priceWeight = 0.01,
    ratingWeight = 2,
    locationMatchWeight = 5
  } = weights;
  
  let score = 0;
  
  // Verified vendors get boost
  if (vendor.verified) score += verifiedWeight;
  
  // Lower price is better (inverse)
  score += (100000 - vendor.price) * priceWeight;
  
  // Higher rating is better
  score += vendor.rating * ratingWeight;
  
  // Location match bonus
  if (searchQuery.normalizedLocation && 
      vendor.location.toLowerCase().includes(searchQuery.normalizedLocation)) {
    score += locationMatchWeight;
  }
  
  return score;
}

/**
 * Fast vendor ranking with computed scores
 */
function rankVendors(vendors, searchQuery, limit = 3) {
  const scored = vendors.map(v => ({
    ...v,
    score: computeVendorScore(v, searchQuery)
  }));
  
  scored.sort((a, b) => b.score - a.score);
  
  return scored.slice(0, limit);
}

module.exports = {
  parseIntentTypeSafe,
  parseCatalogTypeSafe,
  normalizeSearchQuery,
  batchParseIntents,
  computeVendorScore,
  rankVendors,
  // Legacy compatibility names
  parseIntent: parseIntentTypeSafe,
  parseVendorCatalog: parseCatalogTypeSafe,
  parseUserIntent: parseIntentTypeSafe
};
