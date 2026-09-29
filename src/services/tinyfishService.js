/**
 * TinyFish Search Service for GoToMart
 * 
 * Provides web search and content fetching capabilities using TinyFish MCP.
 * FREE: search and fetch_content require no credits
 * PAID: web automation requires credits
 */

const axios = require('axios');

const TINYFISH_API_URL = 'https://agent.tinyfish.ai/mcp';
const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY;

/**
 * Search the web for product/market information
 * FREE - no credits required
 */
async function searchWeb(query, options = {}) {
  try {
    const response = await axios.post(`${TINYFISH_API_URL}/search`, {
      query,
      numResults: options.numResults || 10,
      recencyDays: options.recencyDays,
      includeDomains: options.includeDomains,
      excludeDomains: options.excludeDomains
    }, {
      headers: {
        'Authorization': `Bearer ${TINYFISH_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    return {
      results: response.data.results || [],
      totalResults: response.data.totalResults || 0,
      query: response.data.query || query
    };
  } catch (err) {
    console.error('[TINYFISH_SEARCH] Error:', err.message);
    return { results: [], error: err.message };
  }
}

/**
 * Fetch full content from a URL
 * FREE - no credits required
 */
async function fetchContent(url, options = {}) {
  try {
    const response = await axios.post(`${TINYFISH_API_URL}/fetch_content`, {
      url,
      format: options.format || 'markdown',
      includeImages: options.includeImages || false,
      timeout: options.timeout || 30000
    }, {
      headers: {
        'Authorization': `Bearer ${TINYFISH_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    return {
      url: response.data.url,
      title: response.data.title,
      content: response.data.content,
      text: response.data.text,
      success: true
    };
  } catch (err) {
    console.error('[TINYFISH_FETCH] Error:', err.message);
    return { url, error: err.message, success: false };
  }
}

/**
 * Search for product/market prices
 * Useful for vendor price comparison and market research
 */
async function searchProductPrices(product, location) {
  const query = location 
    ? `${product} price in ${location} Nigeria market`
    : `${product} price Nigeria market wholesale`;
  
  return searchWeb(query, { numResults: 5, recencyDays: 30 });
}

/**
 * Search for competitor vendors
 * Find market competitors for a product
 */
async function searchCompetitors(product, location) {
  const query = location
    ? `${product} vendors ${location} Lagos Nigeria wholesale`
    : `${product} suppliers wholesale Nigeria`;
  
  return searchWeb(query, { numResults: 8, recencyDays: 60 });
}

/**
 * Get market trends for a product
 * Search for trending products and prices
 */
async function getMarketTrends(category) {
  const categories = {
    grains: 'rice beans garri Nigeria price trend 2024',
    produce: 'tomatoes pepper onions Lagos market price',
    oil: 'vegetable oil palm oil Nigeria wholesale price'
  };
  
  const query = categories[category.toLowerCase()] || `${category} Nigeria market price trend`;
  return searchWeb(query, { numResults: 5, recencyDays: 90 });
}

/**
 * Format search results for WhatsApp
 */
function formatSearchResultsForWhatsApp(results, maxResults = 5) {
  if (!results || results.length === 0) {
    return "No search results found.";
  }

  const limited = results.slice(0, maxResults);
  const formatted = limited.map((r, i) => {
    const title = r.title || 'No title';
    const snippet = r.snippet || r.description || '';
    const source = r.source || r.domain || '';
    return `${i + 1}. ${title}${source ? ` (${source})` : ''}\n   ${snippet.slice(0, 60)}${snippet.length > 60 ? '...' : ''}`;
  }).join('\n\n');

  return formatted;
}

module.exports = {
  // Free tools (no credits)
  searchWeb,
  fetchContent,
  
  // Market research helpers
  searchProductPrices,
  searchCompetitors,
  getMarketTrends,
  
  // Utility
  formatSearchResultsForWhatsApp,
  
  // Constants
  TINYFISH_API_URL
};
