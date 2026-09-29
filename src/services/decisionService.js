/**
 * JEV + CEREBRAS HYBRID DECISION LAYER for GoToMart
 * 
 * Architecture Pattern:
 *     JEV DECIDES  →  CODE CONTROLS  →  CEREBRAS REASONS
 */

const { parseUserIntent } = require('./cerebrasService');
const { containsProductReference, detectCategory } = require('./productPatterns');
const { enrichProduct, isKnownProduct } = require('./productIntelligence');

// ============================================
// DECISION PRIMITIVES (Jev's three types)
// ============================================

const INTENT_TYPES = {
  GREETING: 'GREETING',
  HELP: 'HELP',
  BUY: 'BUY',
  SELL: 'SELL',
  ORDER_STATUS: 'ORDER_STATUS',
  VENDOR_SELECTION: 'VENDOR_SELECTION',
  UNKNOWN: 'UNKNOWN'
};

// Confidence thresholds
const THRESHOLDS = {
  DIRECT_RESPONSE: 0.85,  // Act immediately, no LLM
  LLM_ENHANCE: 0.45,    // Use Cerebras to confirm/enhance
  LLM_REQUIRED: 0.20    // Must use Cerebras
};

// ============================================
// INTENT CLASSIFIERS (Jev Choice pattern)
// ============================================

const INTENT_PATTERNS = {
  [INTENT_TYPES.GREETING]: {
    patterns: [
      /^(hi|hello|hey|yo|hola)\b/i,
      /^(good\s+(morning|afternoon|evening))\b/i,
      /^\s*(gm|how are you|what'?s up)\b/i
    ],
    weight: 0.95,
    priority: 10
  },
  [INTENT_TYPES.HELP]: {
    patterns: [
      /\b(help|menu|commands|what can you do|how does this work)\b/i,
      /\b(options|show me how|guide me)\b/i,
      /^\?+$/
    ],
    weight: 0.90,
    priority: 9
  },
  [INTENT_TYPES.SELL]: {
    patterns: [
      /\b(sell|selling|become a vendor|register (as|my)|list (my|as))\b/i,
      /\b(vendor|seller|merchant|i have a shop|i have a store)\b/i,
      /\b(onboard my business|add my shop|add my business)\b/i,
      /\bi (want|would like) to sell\b/i,
      /\bsell \w+\s+(for|at)\s*₦?\d+/i
    ],
    weight: 0.92,
    priority: 8
  },
  [INTENT_TYPES.ORDER_STATUS]: {
    patterns: [
      /\b(check my order|order status|track my|where is my)\b/i,
      /\b(show my orders|my orders|pending orders)\b/i
    ],
    weight: 0.88,
    priority: 7
  },
  [INTENT_TYPES.BUY]: {
    patterns: [
      /\b(need|want|looking for|find me|get me|buy(ing)?)\b/i,
      /\b(where can i (find|get|buy)|any\w* selling)\b/i,
      /\b(show me|recommend)\b/i
    ],
    weight: 0.85,
    priority: 6
  },
  [INTENT_TYPES.VENDOR_SELECTION]: {
    patterns: [
      /^\s*[1-9]\d*\s*$/
    ],
    weight: 0.80,
    priority: 5
  }
};

// ============================================
// SCORING RUBRICS (Jev Score pattern)
// ============================================

function scoreMessage(text) {
  const scores = {};
  
  // Clarity score - using expanded product patterns
  let clarity = 0;
  if (containsProductReference(text)) {
    clarity = 0.7;
    if (/\d+\s*(kg|g|bag|bottle|litre|unit|piece|pack|pair|set)/i.test(text) || 
        /\bin\s+\w+/.test(text) || 
        /for\s*₦?\d+/.test(text)) {
      clarity = 1.0;
    }
  }
  scores.clarity = clarity;
  
  // Urgency score
  let urgency = 0.5;
  if (/\b(asap|urgent|emergency|now|quickly|immediately)\b/i.test(text) || /!{2,}/.test(text)) {
    urgency = 1.0;
  }
  scores.urgency = urgency;
  
  return scores;
}

// ============================================
// NOUL VALIDATORS (Jev Noul pattern)
// ============================================

const validationChecks = {
  hasPrice: (text) => /₦?\d{3,}/.test(text) || /\d+\s*(naira|ngn|₦)/i.test(text),
  hasLocation: (text) => /\b(in|at|around)\s+([A-Z][a-z]+)/i.test(text),
  hasQuantity: (text) => /\b(\d+\s*(kg|g|bags?|crates?|litres?|bottles?|boxes?|packs?|pairs?|sets?|pieces?))\b/i.test(text),
  isGreeting: (text) => /^(hi|hello|hey|yo)\b/i.test(text.trim()),
  isHelpRequest: (text) => /\b(help|what can you do|what do you sell)\b/i.test(text),
  isSimpleBuy: (text) => /\b(need|want|looking for|find me|help me get|buy)\b/i.test(text) && containsProductReference(text),
  isVendorIntent: (text) => /\b(sell|become a vendor|list my|add my (shop|business|store))\b/i.test(text),
  hasProduct: (text) => containsProductReference(text)
};

function validateMessage(text) {
  const validations = {};
  for (const [name, validator] of Object.entries(validationChecks)) {
    validations[name] = validator(text) ? 0.95 : 0.05;
  }
  return validations;
}

// ============================================
// CHOICE CLASSIFIER
// ============================================

function classifyIntent(text) {
  const probabilities = {};
  let bestChoice = INTENT_TYPES.UNKNOWN;
  let maxScore = 0;
  
  for (const [intent, config] of Object.entries(INTENT_PATTERNS)) {
    let matches = 0;
    
    for (const pattern of config.patterns) {
      if (pattern.test(text)) {
        matches++;
      }
    }
    
    if (matches > 0) {
      const score = (config.weight * (1 + Math.min(matches * 0.1, 0.25))) * config.priority / 10;
      probabilities[intent] = Math.min(score, 1.0);
      
      if (score > maxScore) {
        maxScore = score;
        bestChoice = intent;
      }
    }
  }
  
  // Calculate confidence
  const probValues = Object.values(probabilities);
  const confidence = probValues.length > 0 
    ? Math.max(...probValues) / (probValues.reduce((a, b) => a + b, 0) || 1)
    : 0.5;
  
  // Normalize
  const total = probValues.reduce((a, b) => a + b, 0) || 1;
  const normalized = {};
  for (const [k, v] of Object.entries(probabilities)) {
    normalized[k] = v / total;
  }
  
  return {
    choice: bestChoice,
    confidence: Math.min(confidence, 1.0),
    probabilities: normalized
  };
}

// ============================================
// GATEKEEPER
// ============================================

function determineAction(jevResult) {
  const { choice, confidence } = jevResult;
  
  if (confidence >= THRESHOLDS.DIRECT_RESPONSE) {
    return {
      action: 'DIRECT_RESPONSE',
      needsLLM: false,
      reason: `High confidence (${confidence.toFixed(2)})`
    };
  } else if (confidence >= THRESHOLDS.LLM_ENHANCE) {
    return {
      action: 'LLM_ENHANCE',
      needsLLM: true,
      reason: `Medium confidence (${confidence.toFixed(2)})`
    };
  } else {
    return {
      action: 'LLM_REQUIRED',
      needsLLM: true,
      reason: `Low confidence (${confidence.toFixed(2)})`
    };
  }
}

// ============================================
// PARAMETER EXTRACTION
// ============================================

function extractBuyParams(text) {
  const params = { item: '', quantity: '', location: '' };
  
  const itemMatch = text.match(/\b(rice|beans|garri|tomatoes|pepper|onions|oil|flour|sugar|yam|plantain|meat|fish|chicken|eggs)\b/i);
  if (itemMatch) params.item = itemMatch[1].toLowerCase();
  
  const qtyMatch = text.match(/(\d+\s*(kg|g|bags?|crates?|litres?))/i);
  if (qtyMatch) params.quantity = qtyMatch[1];
  
  const locMatch = text.match(/\b(in|at|around)\s+([A-Z][a-zA-Z]+)/i) ||
                   text.match(/\b(Ikorodu|Yaba|Lagos|Ikeja|Ikoyi|Lekki|Surulere)\b/i);
  if (locMatch) params.location = locMatch[2] || locMatch[0];
  
  return params;
}

// ============================================
// MAIN DECISION FUNCTION
// ============================================

async function makeDecision(text, session = null) {
  // Step 1: JEV DECIDES (System One)
  const choiceResult = classifyIntent(text);
  const scores = scoreMessage(text);
  const validations = validateMessage(text);
  
  // Step 2: CODE CONTROLS (Gatekeeper)
  const action = determineAction(choiceResult);
  
  // Step 3: Determine extracted params
  let extractedParams = null;
  if (choiceResult.choice === INTENT_TYPES.BUY && action.action === 'DIRECT_RESPONSE') {
    extractedParams = extractBuyParams(text);
  }
  
  // Step 4: Session override
  if (session?.state && session.state !== 'idle') {
    choiceResult.choice = INTENT_TYPES.SELL;
    action.action = 'DIRECT_RESPONSE';
    action.needsLLM = false;
  }
  
  const decision = {
    intent: choiceResult.choice,
    jev: {
      ...choiceResult,
      scores,
      validations
    },
    action,
    extractedParams,
    timestamp: new Date().toISOString()
  };
  
  console.log('[JEV]', JSON.stringify({
    intent: decision.intent,
    conf: decision.jev.confidence.toFixed(2),
    action: decision.action.type,
    needsLLM: decision.action.needsLLM
  }));
  
  return decision;
}

// ============================================
// CEREBRAS INTEGRATION
// ============================================

async function delegateToCerebras(text, decision) {
  try {
    console.log(`[CEREBRAS] Delegating: intent=${decision.intent}, conf=${decision.jev.confidence.toFixed(2)}`);
    
    const parsed = await parseUserIntent(text);
    
    return {
      intent: parsed.intent,
      item: parsed.item,
      quantity: parsed.quantity,
      location: parsed.location,
      price: parsed.price,
      shopName: parsed.shopName,
      source: 'cerebras',
      jevConfidence: decision.jev.confidence
    };
  } catch (err) {
    console.error('[CEREBRAS] Error:', err.message);
    return { intent: 'UNKNOWN', error: err.message };
  }
}

// ============================================
// RESPONSE VALIDATION
// ============================================

function validateResponse(responseText, decision) {
  const checks = {
    answersQuestion: false,
    noPII: true,
    toneOk: true
  };
  
  if (decision.intent === INTENT_TYPES.BUY && /\b(vendor|price)\b/i.test(responseText)) {
    checks.answersQuestion = true;
  } else if (decision.intent === INTENT_TYPES.GREETING && /\b(hello|hi)\b/i.test(responseText)) {
    checks.answersQuestion = true;
  }
  
  const emailPattern = /\b[\w.-]+@[\w.-]+\.\w+\b/;
  const phonePattern = /\b\d{11,}\b/;
  if (emailPattern.test(responseText) || phonePattern.test(responseText)) {
    checks.noPII = false;
  }
  
  const rudeWords = /\b(stupid|dumb|idiot)\b/i;
  if (rudeWords.test(responseText)) {
    checks.toneOk = false;
  }
  
  return checks;
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  makeDecision,
  delegateToCerebras,
  validateResponse,
  INTENT_TYPES,
  THRESHOLDS
};
