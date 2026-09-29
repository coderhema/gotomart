/**
 * Enhanced Router with Product Intelligence
 * Integrates JEV, Cerebras, and Tinyfish for unknown products
 */

const { makeDecision, delegateToCerebras, INTENT_TYPES } = require('./decisionService');
const { enrichProduct, isKnownProduct, getProductCategory } = require('./productIntelligence');

/**
 * Enhanced decision function with product intelligence
 * Falls back to Tinyfish when Cerebras returns UNKNOWN
 */
async function makeEnhancedDecision(text, session = null) {
  // Step 1: Run JEV classifier
  const decision = await makeDecision(text, session);
  
  // Step 2: If JEV thinks we need Cerebras or JEV confidence is medium
  if (decision.action.needsLLM || decision.jev.confidence < 0.85) {
    console.log('[ENHANCED_ROUTER] Delegating to Cerebras...');
    
    let result = await delegateToCerebras(text, decision);
    
    // Step 3: If Cerebras finds product, check if it's known
    if (result.item && !isKnownProduct(result.item)) {
      console.log(`[ENHANCED_ROUTER] Unknown product: "${result.item}" - enriching with Tinyfish`);
      
      // Step 4: Use Tinyfish to research the product
      const enriched = await enrichProduct(result.item, {
        userContext: text,
        location: result.location
      });
      
      if (enriched.found) {
        console.log(`[ENHANCED_ROUTER] Product enriched: ${enriched.category} (${enriched.confidence})`);
        
        // Merge enriched data with Cerebras result
        result = {
          ...result,
          category: enriched.category,
          subcategory: enriched.subcategory,
          enriched: true,
          confidence: enriched.confidence
        };
      } else {
        console.log(`[ENHANCED_ROUTER] Could not enrich product, treating as general merchandise`);
        result.category = 'general';
        result.subcategory = 'merchandise';
      }
      
      // Update intent if product is now understood
      if (result.intent === 'UNKNOWN' && enriched.searchable) {
        result.intent = 'BUY'; // Assume buy intent for products
      }
    }
    
    // Add to decision
    decision.enhancedResult = result;
    decision.finalDecision = result.intent || decision.intent;
  } else {
    // Use JEV direct response
    decision.finalDecision = decision.intent;
  }
  
  return decision;
}

/**
 * Quick product check for direct buy flows
 */
async function checkAndEnrichProduct(item) {
  if (isKnownProduct(item)) {
    return {
      known: true,
      category: getProductCategory(item)
    };
  }
  
  console.log(`[PRODUCT_CHECK] Unknown: "${item}" - researching...`);
  const enriched = await enrichProduct(item);
  return {
    known: false,
    enriched: enriched,
    searchable: enriched.searchable,
    category: enriched.category || 'general'
  };
}

/**
 * Get product info with caching suggestion
 */
async function getProductInfo(item) {
  const check = await checkAndEnrichProduct(item);
  
  if (check.known) {
    return {
      item: item,
      category: check.category,
      source: 'known_products',
      description: `${item} (${check.category})`
    };
  }
  
  if (check.enriched?.found) {
    return {
      item: item,
      category: check.category,
      subcategory: check.enriched.subcategory,
      source: check.enriched.source,
      confidence: check.enriched.confidence,
      description: `${item} (${check.category}: ${check.enriched.subcategory})`
    };
  }
  
  return {
    item: item,
    category: 'unknown',
    source: 'unrecognized',
    description: `${item} (category unknown - can still search)`
  };
}

module.exports = {
  makeEnhancedDecision,
  checkAndEnrichProduct,
  getProductInfo
};