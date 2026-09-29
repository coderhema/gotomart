/**
 * Conversation Router Service
 * Manages conversation flow, detects off-topic messages, and redirects users
 * Session-aware with conversation memory and context tracking
 */

const { parseIntent } = require('./cerebrasService');

// ============================================================================
// CONVERSATION STATE & TOPIC TRACKING
// ============================================================================

/**
 * Conversation Topics
 */
const TOPICS = {
  BUYING: 'buying',
  SELLING: 'selling',
  ONBOARDING: 'onboarding',
  PAYMENT: 'payment',
  ORDERS: 'orders',
  GREETING: 'greeting',
  HELP: 'help',
  OFF_TOPIC: 'off_topic',
  UNKNOWN: 'unknown'
};

/**
 * Conversation States
 */
const STATES = {
  IDLE: 'idle',
  AWAITING_ITEM: 'awaiting_item',
  AWAITING_LOCATION: 'awaiting_location',
  SHOWING_VENDORS: 'showing_vendors',
  AWAITING_VENDOR_SELECTION: 'awaiting_vendor_selection',
  AWAITING_PAYMENT: 'awaiting_payment',
  VENDOR_ONBOARDING: 'vendor_onboarding',
  AWAITING_VENDOR_DETAILS: 'awaiting_vendor_details',
  CONFIRMATION: 'confirmation',
  CHATTING: 'chatting'
};

/**
 * Off-topic keywords/patterns
 * Detects when user is no longer discussing buying/selling
 */
const OFF_TOPIC_PATTERNS = {
  // Personal questions
  personal: [
    /how are you/i, /what['\s]?s up/i, /how['\s]?s it going/i,
    /your name/i, /who are you/i, /are you (a|an|the)/i,
    /do you have (a|any)/i, /are you (human|real|ai|bot)/i,
    /what do you (like|love|hate)/i, /your favorite/i,
    /tell me about yourself/i, /where are you from/i,
    /how old are you/i, /birthday/i, /created/i
  ],
  // Generic chat
  generic: [
    /^(hi|hello|hey|yo|hola)$/i, /good (morning|afternoon|evening|night)/i,
    /^(ok|okay|cool|nice|great|awesome|thanks|thank you)$/i,
    /see you/i, /bye/i, /goodbye/i, /talk later/i,
    /weather/i, /news/i, /joke/i, /funny/i,
    / bored$/i, /funny/i, /entertain/i
  ],
  // Non-commerce questions
  unrelated: [
    /(?:can you|could you) (?:help|tell|explain|do)/i,
    /(?:what is|what['\s]?s) (?:a|an|the)/i,
    /(?:how to|how do i|how does)/i,
    /explain/i, /define/i, /meaning of/i,
    /recipe/i, /cook/i, /make.*at home/i,
    /advice/i, /suggestion/i, /recommend/i
  ],
  // Emotional/Overtime
  emotional: [
    /frustrated/i, /angry/i, /sad/i, /happy/i,
    /tired/i, /stressed/i, /worried/i, /excited/i,
    /thank/i, /appreciate/i, /sorry/i, /please/i
  ]
};

// ============================================================================
// CONVERSATION CONTEXT MANAGER
// ============================================================================

class ConversationContext {
  constructor(phone) {
    this.phone = phone;
    this.messages = [];           // Message history
    this.currentTopic = null;     // Current topic
    this.previousTopic = null;    // Previous topic
    this.state = STATES.IDLE;     // Current state
    this.contextData = {};        // Session-specific data
    this.lastActivity = Date.now(); // Last message timestamp
    this.offTopicCount = 0;       // Consecutive off-topic messages
    this.buyingIntent = null;     // Stored buying intent
    this.sellingIntent = null;    // Stored selling intent
  }

  /**
   * Add message to history
   * @param {string} role - 'user' or 'agent'
   * @param {string} text - Message text
   * @param {string} topic - Detected topic
   */
  addMessage(role, text, topic = null) {
    this.messages.push({
      role,
      text,
      topic,
      timestamp: Date.now()
    });

    // Keep only last 20 messages to prevent memory bloat
    if (this.messages.length > 20) {
      this.messages = this.messages.slice(-20);
    }

    if (topic) {
      this.previousTopic = this.currentTopic;
      this.currentTopic = topic;
    }

    this.lastActivity = Date.now();
  }

  /**
   * Get recent conversation context
   * @param {number} count - Number of messages to return
   * @returns {Array} Recent messages
   */
  getRecentContext(count = 5) {
    return this.messages.slice(-count);
  }

  /**
   * Store buying intent for later
   * @param {Object} intent - Parsed intent
   */
  storeBuyingIntent(intent) {
    this.buyingIntent = {
      ...intent,
      storedAt: Date.now()
    };
  }

  /**
   * Store selling intent
   * @param {Object} intent - Parsed intent
   */
  storeSellingIntent(intent) {
    this.sellingIntent = {
      ...intent,
      storedAt: Date.now()    };
  }

  /**
   * Check if we were in the middle of a buying flow
   * @returns {Object|null}
   */
  getInProgressBuyingIntent() {
    if (!this.buyingIntent) return null;
    // Stale after 10 minutes
    if (Date.now() - this.buyingIntent.storedAt > 10 * 60 * 1000) {
      this.buyingIntent = null;
      return null;
    }
    return this.buyingIntent;
  }

  /**
   * Reset the conversation flow
   */
  resetFlow() {
    this.state = STATES.IDLE;
    this.buyingIntent = null;
    this.sellingIntent = null;
    this.offTopicCount = 0;
  }
}

// ============================================================================
// OFF-TOPIC DETECTION
// ============================================================================

/**
 * Analyze message for off-topic content
 * @param {string} text - User message
 * @param {ConversationContext} context - Session context
 * @returns {Object} Analysis result
 */
function analyzeMessage(text, context) {
  const lowerText = text.toLowerCase().trim();

  // Check for off-topic patterns
  const matches = {
    personal: OFF_TOPIC_PATTERNS.personal.some(p => p.test(lowerText)),
    generic: OFF_TOPIC_PATTERNS.generic.some(p => p.test(lowerText)),
    unrelated: OFF_TOPIC_PATTERNS.unrelated.some(p => p.test(lowerText)),
    emotional: OFF_TOPIC_PATTERNS.emotional.some(p => p.test(lowerText))
  };

  const isOffTopic = matches.personal || matches.unrelated ||
                     (matches.generic && context.offTopicCount > 2);

  // Determine severity
  let severity = 'none';
  if (isOffTopic) {
    if (matches.personal) severity = 'high';
    else if (matches.unrelated) severity = 'medium';
    else severity = 'low';
  }

  return {
    isOffTopic,
    matches,
    severity,
    suggestedTopic: detectSuggestedTopic(text)
  };
}

/**
 * Detect if user is trying to get back on topic
 * @param {string} text - User message
 * @returns {string|null} Suggested topic
 */
function detectSuggestedTopic(text) {
  const lower = text.toLowerCase();

  // Buying signals
  if (/\b(buy|need|want|looking for|get|purchase|order)\b/i.test(lower)) {
    return TOPICS.BUYING;
  }
  // Selling signals
  if (/\b(sell|selling|list|vendor|price|cost)\b/i.test(lower)) {
    return TOPICS.SELLING;
  }
  // Payment signals
  if (/\b(pay|paid|payment|checkout|complete)\b/i.test(lower)) {
    return TOPICS.PAYMENT;
  }
  // Order signals
  if (/\b(order|orders|status|track|delivery)\b/i.test(lower)) {
    return TOPICS.ORDERS;
  }

  return null;
}

// ============================================================================
// REDIRECTION RESPONSES
// ============================================================================

/**
 * Generate contextual redirection response
 * @param {ConversationContext} context - Session context
 * @param {Object} analysis - Analysis result
 * @returns {string} Redirection message
 */
function generateRedirection(context, analysis) {
  const responses = REDIRECTION_RESPONSES[analysis.severity];
  const baseText = responses[Math.floor(Math.random() * responses.length)];

  // Add context-aware continuation
  const inProgressBuy = context.getInProgressBuyingIntent();
  if (inProgressBuy) {
    return `${baseText}\n\n${CONTINUATION_PROMPTS.buying(inProgressBuy)}`;
  }

  if (context.sellingIntent) {
    return `${baseText}\n\n${CONTINUATION_PROMPTS.selling}`;
  }

  return `${baseText}\n\n${CONTINUATION_PROMPTS.general}`;
}

/**
 * Redirection response templates by severity
 */
const REDIRECTION_RESPONSES = {
  // Light redirection - acknowledge + divert to selling
  low: [
    "Got it! By the way, are you selling anything? I can get you buyers fast! 🏪",
    "Alright! 😊 While you're here, want to list any products for sale?",
    "I hear you! Speaking of which - got anything to sell? I'm great at finding buyers! 💪",
    "Thanks for sharing! want to make some money? Tell me what you're selling! 🏪"
  ],

  // Medium redirection - stronger sell pitch
  medium: [
    "I'm not sure about that, but I can definitely help you sell your products! 🏪 List an item in seconds.",
    "Interesting! Though I'm really good at helping vendors find buyers. Want to list something?",
    "Hmm, I'm all about marketplace stuff! Speaking of which, got anything to sell? I'll find buyers for you! 💪",
    "I wish I could help more with that! But you know what I AM great at? Getting your products sold fast! 🚀"
  ],

  // Strong redirection - direct selling proposition
  high: [
    "I'm GoToMart! 🏪 I help vendors like you reach buyers instantly. What are you selling today?",
    "Let's make you some money! 💰 List your products and I'll connect you with ready buyers. What do you sell?",
    "I'm your marketplace partner! 🛍️ Thousands of buyers are waiting - tell me what you're selling!",
    "Skip the small talk, let's sell! 🏪 What products do you have? I'll get you buyers right now!"
  ]
};

/**
 * Context-aware continuation prompts
 * NOTE: All redirects now steer toward SELLING flow
 */
const CONTINUATION_PROMPTS = {
  buying: (intent) => `Were you still looking for ${intent.quantity || ''} ${intent.item}${intent.location ? ` in ${intent.location}` : ''}?\n\nOr maybe you'd like to ${buildSellPrompt()}`,
  selling: "I can help you list your products and reach thousands of buyers! 🏪",
  general: "Want to start selling? ${buildSellPrompt()}"
};

/**
 * Build a compelling sell prompt
 * @returns {string} Selling call-to-action
 */
function buildSellPrompt() {
  const prompts = [
    "Reply with: \"[Item], [Price], [Location]\" to list instantly!",
    "Just tell me what you're selling and your price!",
    "List your products in seconds - what's your best item?",
    "Ready to sell? Share what you have and I'll get you buyers!"
  ];
  return prompts[Math.floor(Math.random() * prompts.length)];
}

// ============================================================================
// SESSION CONTEXT STORE
// ============================================================================

const contextStore = new Map();

/**
 * Get or create conversation context for user
 * @param {string} phone - User's phone number
 * @returns {ConversationContext}
 */
function getContext(phone) {
  if (!contextStore.has(phone)) {
    contextStore.set(phone, new ConversationContext(phone));
  }
  return contextStore.get(phone);
}

/**
 * Clear stale contexts (inactive for 1 hour)
 */
function cleanupStaleContexts() {
  const oneHour = 60 * 60 * 1000;
  const now = Date.now();

  for (const [phone, context] of contextStore.entries()) {
    if (now - context.lastActivity > oneHour) {
      contextStore.delete(phone);
    }
  }
}

// Run cleanup every 30 minutes
setInterval(cleanupStaleContexts, 30 * 60 * 1000);

// ============================================================================
// MAIN ROUTER FUNCTION
// ============================================================================

/**
 * Route conversation and handle off-topic detection
 * @param {string} from - User's phone
 * @param {string} text - User's message
 * @param {Object} decision - Jev/Cerebras decision
 * @returns {Object} Routing result
 */
async function routeConversation(from, text, decision) {
  const context = getContext(from);

  // Analyze the message
  const analysis = analyzeMessage(text, context);

  // If off-topic, generate redirection
  if (analysis.isOffTopic) {
    context.offTopicCount++;

    // After 3 off-topic messages, show main menu
    if (context.offTopicCount >= 3) {
      context.resetFlow();
      return {
        shouldRedirect: true,
        showMenu: true,
        message: `${generateRedirection(context, analysis)}\n\nLet me show you what I can do:`,
        topic: TOPICS.OFF_TOPIC
      };
    }

    // Regular redirection
    return {
      shouldRedirect: true,
      showMenu: false,
      message: generateRedirection(context, analysis),
      topic: TOPICS.OFF_TOPIC
    };
  }

  // Not off-topic, reset counter
  context.offTopicCount = 0;

  // Add message to context
  const topic = analysis.suggestedTopic || decision?.intent || TOPICS.UNKNOWN;
  context.addMessage('user', text, topic);

  return {
    shouldRedirect: false,
    context,
    topic,
    state: context.state
  };
}

/**
 * Check if user is returning to topic
 * @param {string} text - User message
 * @returns {boolean}
 */
function isReturningToTopic(text) {
  const lower = text.toLowerCase();

  // Explicit topic switches
  const topicKeywords = [
    /\b(yes|yeah|sure|ok|okay)\b/i,  // Agreement to continue
    /\banyway|back to|about the|regarding\b/i,  // Topic steering
    /\b(sell|buy|need|want|looking|order|pay)\b/i  // Commerce keywords
  ];

  return topicKeywords.some(k => k.test(lower));
}

/**
 * Check if conversation is in specific state
 * @param {string} from - User's phone
 * @param {string} state - Expected state
 * @returns {boolean}
 */
function isInState(from, state) {
  const context = getContext(from);
  return context.state === state;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Classes
  ConversationContext,

  // Functions
  routeConversation,
  analyzeMessage,
  detectSuggestedTopic,
  generateRedirection,
  isReturningToTopic,
  isInState,
  getContext,

  // Constants
  TOPICS,
  STATES,
  OFF_TOPIC_PATTERNS,
  REDIRECTION_RESPONSES,
  CONTINUATION_PROMPTS
};
