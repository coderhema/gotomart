/**
 * Product Intelligence Service for GoToMart
 * Uses Tinyfish API to understand unknown products and categories
 * Expands beyond produce to all supermarket items
 */

const { searchWeb } = require('./tinyfishService');
const { containsProductReference, detectCategory } = require('./productPatterns');

// Extended product categories for supermarkets
const PRODUCT_CATEGORIES = {
  // Food & Produce
  produce: ['rice', 'beans', 'garri', 'tomatoes', 'pepper', 'onions', 'yam', 'plantain'],
  grains: ['rice', 'beans', 'garri', 'semo', 'wheat', 'oat', 'corn'],
  
  // Proteins
  protein: ['chicken', 'beef', 'goat', 'fish', 'egg', 'turkey', 'meat'],
  
  // Oils & Condiments  
  oils: ['vegetable oil', 'palm oil', 'olive oil', 'groundnut oil', 'coconut oil'],
  condiments: ['salt', 'sugar', 'seasoning', 'maggi', 'crayfish', 'spice'],
  
  // Beverages
  beverages: ['water', 'juice', 'soft drink', 'malt', 'wine', 'alcohol'],
  dairy: ['milk', 'yoghurt', 'cheese', 'butter', 'cream'],
  
  // Household
  cleaning: ['detergent', 'soap', 'bleach', 'disinfectant', 'air freshener'],
  paper: ['toilet paper', 'tissue', 'napkin', 'kitchen towel'],
  
  // Personal Care
  beauty: ['shampoo', 'cream', 'lotion', 'perfume', 'deodorant', 'soap'],
  health: ['vitamin', 'supplement', 'medicine', 'first aid'],
  
  // Baby & Kids
  baby: ['diaper', 'baby food', 'wipes', 'formula', 'baby oil'],
  
  // Electronics & Appliances
  electronics: ['phone', 'charger', 'earphone', 'usb', 'battery'],
  appliances: ['iron', 'kettle', 'blender', 'fan', 'bulb'],
  
  // Clothing & Fashion
  clothing: ['shirt', 'trouser', 'dress', 'skirt', 'fabric', 'material'],
  accessories: ['bag', 'shoe', 'belt', 'jewelry', 'watch', 'cap'],
  
  // Stationery & Office
  stationery: ['pen', 'pencil', 'book', 'paper', 'file', 'envelope'],
  
  // Hardware & Tools
  hardware: ['nail', 'screw', 'wire', 'cement', 'paint', 'tools'],
  
  // Miscellaneous
  miscellaneous: ['battery', 'candle', 'matches', 'lighter', 'rope']
};

// Flatten all known products for quick lookup
const ALL_KNOWN_PRODUCTS = Object.values(PRODUCT_CATEGORIES).flat();

/**
 * Check if a product is known
 * Uses both category list AND pattern matching for comprehensive coverage
 */
function isKnownProduct(item) {
  const normalized = item.toLowerCase().trim();
  
  // Check in known products list
  const inCategories = ALL_KNOWN_PRODUCTS.some(product => 
    normalized.includes(product) || product.includes(normalized)
  );
  
  // Also check pattern matching
  if (!inCategories) {
    return containsProductReference(item);
  }
  
  return true;
}

/**
 * Get product category
 * Checks categories first, then falls back to pattern detection
 */
function getProductCategory(item) {
  const normalized = item.toLowerCase().trim();
  
  // Check in defined categories
  for (const [category, products] of Object.entries(PRODUCT_CATEGORIES)) {
    if (products.some(p => normalized.includes(p) || p.includes(normalized))) {
      return category;
    }
  }
  
  // Fall back to pattern detection
  const patternCategory = detectCategory(item);
  if (patternCategory !== 'general') {
    return patternCategory;
  }
  
  return 'unknown';
}

/**
 * Enrich product data using Tinyfish
 * Called when JEV/Cerebras can't identify a product
 */
async function enrichProduct(item, context = {}) {
  console.log(`[PRODUCT_INTEL] Enriching: "${item}"`);
  
  try {
    // Search for product information
    const searchQuery = `${item} product category supermarket Nigeria`;
    const searchResults = await searchWeb(searchQuery, { 
      numResults: 3, 
      recencyDays: 365 
    });
    
    if (searchResults.results?.length > 0) {
      // Extract category hints from search results
      const hints = extractCategoryHints(searchResults.results, item);
      
      return {
        item: item,
        category: hints.category || 'general',
        subcategory: hints.subcategory || 'supermarket',
        found: true,
        searchable: true,
        confidence: hints.confidence || 0.6,
        source: 'tinyfish_research',
        related: hints.related || []
      };
    }
    
    // Fallback: treat as general merchandise
    return {
      item: item,
      category: 'general',
      subcategory: 'merchandise',
      found: false,
      searchable: true,
      confidence: 0.3,
      source: 'fallback',
      related: []
    };
    
  } catch (err) {
    console.error('[PRODUCT_INTEL] Error:', err.message);
    return {
      item: item,
      category: 'unknown',
      found: false,
      searchable: false,
      confidence: 0,
      error: err.message
    };
  }
}

/**
 * Extract category hints from search results
 */
function extractCategoryHints(results, item) {
  const text = results.map(r => `${r.title} ${r.snippet || r.description || ''}`).join(' ').toLowerCase();
  
  const categoryScores = {};
  
  for (const [category, products] of Object.entries(PRODUCT_CATEGORIES)) {
    let score = 0;
    
    // Check for category keywords in results
    for (const product of products) {
      if (text.includes(product)) {
        score += 1;
      }
    }
    
    // Check for the item itself
    if (text.toLowerCase().includes(item.toLowerCase())) {
      score += 2;
    }
    
    if (score > 0) {
      categoryScores[category] = score;
    }
  }
  
  // Get best matching category
  const bestCategory = Object.entries(categoryScores)
    .sort((a, b) => b[1] - a[1])[0];
  
  return {
    category: bestCategory ? bestCategory[0] : 'general',
    subcategory: bestCategory ? getSubcategoryForCategory(bestCategory[0]) : 'merchandise',
    confidence: bestCategory ? Math.min(bestCategory[1] / 3, 1) : 0.3,
    related: Object.keys(categoryScores).slice(0, 3)
  };
}

/**
 * Get subcategory for a category
 */
function getSubcategoryForCategory(category) {
  const subcategories = {
    produce: 'fresh_groceries',
    grains: 'dry_goods',
    protein: 'meat_seafood',
    oils: 'cooking_essentials',
    condiments: 'seasonings',
    beverages: 'drinks',
    dairy: 'refrigerated',
    cleaning: 'household',
    paper: 'household',
    beauty: 'personal_care',
    health: 'wellness',
    baby: 'baby_care',
    electronics: 'gadgets',
    appliances: 'home_appliances',
    clothing: 'fashion',
    accessories: 'fashion_accessories',
    stationery: 'office_supplies',
    hardware: 'hardware_tools',
    miscellaneous: 'general'
  };
  
  return subcategories[category] || 'merchandise';
}

/**
 * Validate if a search makes sense for this product
 */
function isValidProductQuery(item) {
  // Reject obvious non-products
  const invalidPatterns = [
    /^\d+$/, // Just numbers
    /^\s*test\s*$/i, // Test strings
    /^\s*hello\s*$/i, // Greetings
    /^(hi|hey|yes|no|ok)\s*$/i // Common words
  ];
  
  return !invalidPatterns.some(pattern => pattern.test(item));
}

/**
 * Get price range for a product category
 */
function getPriceRangeForCategory(category) {
  const ranges = {
    produce: { min: 1000, max: 50000, unit: 'per bag/kg' },
    grains: { min: 2000, max: 60000, unit: 'per bag' },
    protein: { min: 500, max: 30000, unit: 'per kg/pack' },
    oils: { min: 1500, max: 25000, unit: 'per bottle/litre' },
    electronics: { min: 5000, max: 500000, unit: 'per unit' },
    appliances: { min: 5000, max: 200000, unit: 'per unit' },
    clothing: { min: 1000, max: 50000, unit: 'per piece' },
    default: { min: 500, max: 50000, unit: 'per unit' }
  };
  
  return ranges[category] || ranges.default;
}

/**
 * Pre-process user input to extract potential products
 */
function extractPotentialProducts(text) {
  // Remove common filler words
  const fillers = /\b(i need|i want|looking for|search for|find|buy|get)\b/gi;
  const cleaned = text.replace(fillers, '').trim();
  
  // Split by common separators
  const candidates = cleaned
    .split(/[,;\d\+\-₦]/)
    .map(s => s.trim())
    .filter(s => s.length > 2 && isValidProductQuery(s));
  
  return candidates;
}

module.exports = {
  // Product detection
  isKnownProduct,
  getProductCategory,
  extractPotentialProducts,
  
  // Product enrichment
  enrichProduct,
  
  // Utility
  getPriceRangeForCategory,
  isValidProductQuery,
  
  // Constants
  PRODUCT_CATEGORIES,
  ALL_KNOWN_PRODUCTS
};