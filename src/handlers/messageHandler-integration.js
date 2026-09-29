/**
 * Integration example: Using Enhanced Router with Product Intelligence
 * 
 * Add this to your main message handler to enable Tinyfish-powered
 * product recognition for unknown items.
 */

const { makeEnhancedDecision, getProductInfo } = require('../services/enhancedRouter');

/**
 * Handle text messages with product intelligence
 * 
 * Example usage in your main handler:
 * 
 * const decision = await handleMessageWithIntelligence(userMessage, session);
 * 
 * if (decision.finalDecision === 'BUY') {
 *   // decision.enhancedResult.item is the product
 *   // decision.enhancedResult.category is from patterns or Tinyfish
 *   // decision.enhancedResult.enriched is true if Tinyfish was used
 * }
 */
async function handleMessageWithIntelligence(text, session = null) {
  console.log('[INTELLIGENCE] Processing message:', text);
  
  // Get enhanced decision with product intelligence
  const decision = await makeEnhancedDecision(text, session);
  
  // Log the result
  const result = decision.enhancedResult || {};
  console.log('[INTELLIGENCE] Result:', {
    intent: decision.finalDecision,
    item: result.item,
    category: result.category,
    enriched: result.enriched || false
  });
  
  return decision;
}

/**
 * Example: Pre-warm product info for common items
 */
async function prewarmProductCache(items) {
  console.log('[INTELLIGENCE] Prewarming cache for', items.length, 'items');
  
  const results = await Promise.allSettled(
    items.map(item => getProductInfo(item))
  );
  
  const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
  
  console.log('[INTELLIGENCE] Cached', successful.length, 'products');
  return successful;
}

module.exports = {
  handleMessageWithIntelligence,
  prewarmProductCache
};