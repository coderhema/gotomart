/**
 * GoToMart Commerce Engine
 * Seamless BUY/SELL State Machine with JEV routing + Cerebras conversation
 * 
 * Architecture:
 *   JEV (Router) → Decision → Cerebras (Conversation) → Actions
 * 
 * States:
 *   IDLE → INTENT_DETECTED → [BUY_FLOW | SELL_FLOW]
 *   
 * BUY_FLOW:
 *   SEARCHING → VENDOR_FOUND → SELECTION → CHECKOUT → PAYMENT → CONFIRMED
 *   
 * SELL_FLOW:
 *   ONBOARDING → SHOP_DETAILS → PRODUCT_INFO → PRICING → VERIFICATION → LISTED
 */

const crypto = require('crypto');

// ============================================================================
// COMMERCE STATES
// ============================================================================

const CommerceStates = {
  // Common states
  IDLE: 'idle',
  INTENT_DETECTED: 'intent_detected',
  ERROR: 'error',
  
  // Buy flow
  BUY_SEARCHING: 'buy_searching',
  BUY_VENDOR_FOUND: 'buy_vendor_found',
  BUY_SELECTING: 'buy_selecting',
  BUY_CHECKOUT: 'buy_checkout',
  BUY_PAYMENT: 'buy_payment',
  BUY_CONFIRMED: 'buy_confirmed',
  BUY_FULFILLED: 'buy_fulfilled',
  
  // Sell flow
  SELL_ONBOARDING: 'sell_onboarding',
  SELL_SHOP_DETAILS: 'sell_shop_details',
  SELL_PRODUCT_INFO: 'sell_product_info',
  SELL_PRICING: 'sell_pricing',
  SELL_VERIFICATION: 'sell_verification',
  SELL_LISTED: 'sell_listed',
  
  // Order states
  ORDER_PENDING: 'order_pending',
  ORDER_PAID: 'order_paid',
  ORDER_COMPLETED: 'order_completed',
  ORDER_CANCELLED: 'order_cancelled'
};

// ============================================================================
// STATE MACHINE
// ============================================================================

class CommerceStateMachine {
  constructor(phone) {
    this.phone = phone;
    this.state = CommerceStates.IDLE;
    this.data = {
      intent: null,
      item: null,
      quantity: null,
      location: null,
      price: null,
      vendor: null,
      orderReference: null,
      vendorsFound: [],
      selectedVendorIndex: null,
      paymentLink: null,
      // Seller data
      shopName: null,
      sellerLocation: null,
      productName: null,
      productPrice: null,
      // Metadata
      startedAt: new Date().toISOString(),
      lastActivity: Date.now()
    };
    this.history = []; // State transition history
  }

  /**
   * Transition to new state
   */
  transition(newState, context = {}) {
    const oldState = this.state;
    this.state = newState;
    this.data.lastActivity = Date.now();
    
    this.history.push({
      from: oldState,
      to: newState,
      timestamp: new Date().toISOString(),
      context
    });
    
    console.log(`[COMMERCE] ${this.phone}: ${oldState} → ${newState}`);
    return this;
  }

  /**
   * Update data fields
   */
  update(updates) {
    Object.assign(this.data, updates);
    this.data.lastActivity = Date.now();
    return this;
  }

  /**
   * Get current state context for JEV routing
   */
  getContext() {
    return {
      state: this.state,
      intent: this.data.intent,
      hasItem: !!this.data.item,
      hasLocation: !!this.data.location,
      hasVendor: !!this.data.vendor,
      hasPaymentLink: !!this.data.paymentLink,
      data: this.data
    };
  }

  /**
   * Check if in buying flow
   */
  isBuying() {
    return [
      CommerceStates.BUY_SEARCHING,
      CommerceStates.BUY_VENDOR_FOUND,
      CommerceStates.BUY_SELECTING,
      CommerceStates.BUY_CHECKOUT,
      CommerceStates.BUY_PAYMENT,
      CommerceStates.BUY_CONFIRMED
    ].includes(this.state);
  }

  /**
   * Check if in selling flow
   */
  isSelling() {
    return [
      CommerceStates.SELL_ONBOARDING,
      CommerceStates.SELL_SHOP_DETAILS,
      CommerceStates.SELL_PRODUCT_INFO,
      CommerceStates.SELL_PRICING,
      CommerceStates.SELL_VERIFICATION,
      CommerceStates.SELL_LISTED
    ].includes(this.state);
  }

  /**
   * Reset to idle state
   */
  reset() {
    this.history.push({
      from: this.state,
      to: CommerceStates.IDLE,
      timestamp: new Date().toISOString(),
      context: { action: 'reset' }
    });
    this.state = CommerceStates.IDLE;
    this.data = {
      intent: null,
      item: null,
      quantity: null,
      location: null,
      price: null,
      vendor: null,
      orderReference: null,
      vendorsFound: [],
      selectedVendorIndex: null,
      paymentLink: null,
      shopName: null,
      sellerLocation: null,
      productName: null,
      productPrice: null,
      startedAt: this.data.startedAt,
      lastActivity: Date.now()
    };
    return this;
  }

  /**
   * Get next expected input type for conversation
   */
  getExpectedInput() {
    const expectations = {
      [CommerceStates.IDLE]: 'greeting_or_intent',
      [CommerceStates.INTENT_DETECTED]: 'clarification',
      [CommerceStates.BUY_SEARCHING]: 'wait', // System searching
      [CommerceStates.BUY_VENDOR_FOUND]: 'vendor_selection',
      [CommerceStates.BUY_SELECTING]: 'confirm_or_change',
      [CommerceStates.BUY_CHECKOUT]: 'payment_decision',
      [CommerceStates.BUY_PAYMENT]: 'wait', // External payment
      [CommerceStates.SELL_ONBOARDING]: 'shop_name',
      [CommerceStates.SELL_SHOP_DETAILS]: 'location',
      [CommerceStates.SELL_PRODUCT_INFO]: 'product_name',
      [CommerceStates.SELL_PRICING]: 'price',
      [CommerceStates.SELL_VERIFICATION]: 'confirm_details'
    };
    return expectations[this.state] || 'any';
  }

  /**
   * Serialize for storage
   */
  toJSON() {
    return {
      phone: this.phone,
      state: this.state,
      data: this.data,
      history: this.history.slice(-10) // Keep last 10 transitions
    };
  }

  /**
   * Load from storage
   */
  static fromJSON(json) {
    const sm = new CommerceStateMachine(json.phone);
    sm.state = json.state;
    sm.data = { ...sm.data, ...json.data };
    sm.history = json.history || [];
    return sm;
  }
}

// ============================================================================
// COMMERCE ENGINE
// ============================================================================

class CommerceEngine {
  constructor() {
    this.sessions = new Map();
  }

  /**
   * Get or create session for phone
   */
  getSession(phone) {
    if (!this.sessions.has(phone)) {
      this.sessions.set(phone, new CommerceStateMachine(phone));
    }
    return this.sessions.get(phone);
  }

  /**
   * Start BUY flow
   */
  async startBuyFlow(phone, intentData) {
    const session = this.getSession(phone);
    session
      .transition(CommerceStates.INTENT_DETECTED, { intent: 'BUY' })
      .update({
        intent: 'BUY',
        item: intentData.item,
        quantity: intentData.quantity,
        location: intentData.location
      })
      .transition(CommerceStates.BUY_SEARCHING);
    
    return session;
  }

  /**
   * Start SELL flow
   */
  async startSellFlow(phone) {
    const session = this.getSession(phone);
    session
      .transition(CommerceStates.INTENT_DETECTED, { intent: 'SELL' })
      .update({ intent: ' SELL' })
      .transition(CommerceStates.SELL_ONBOARDING);
    
    return session;
  }

  /**
   * Handle vendor selection in BUY flow
   */
  selectVendor(phone, vendorIndex, vendorData) {
    const session = this.getSession(phone);
    session
      .transition(CommerceStates.BUY_SELECTING, { vendorIndex })
      .update({
        selectedVendorIndex: vendorIndex,
        vendor: vendorData,
        orderReference: crypto.randomUUID().slice(0, 8).toUpperCase()
      })
      .transition(CommerceStates.BUY_CHECKOUT);
    
    return session;
  }

  /**
   * Move to payment state
   */
  initiatePayment(phone, paymentLink) {
    const session = this.getSession(phone);
    session
      .transition(CommerceStates.BUY_PAYMENT, { paymentLink })
      .update({ paymentLink });
    
    return session;
  }

  /**
   * Confirm payment received
   */
  confirmPayment(phone) {
    const session = this.getSession(phone);
    session
      .transition(CommerceStates.BUY_CONFIRMED)
      .update({
        pin: this.generatePIN()
      });
    
    return session;
  }

  /**
   * Generate pickup PIN
   */
  generatePIN() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  /**
   * Collect seller shop name
   */
  collectShopName(phone, shopName) {
    const session = this.getSession(phone);
    session
      .transition(CommerceStates.SELL_SHOP_DETAILS, { shopName })
      .update({ shopName });
    
    return session;
  }

  /**
   * Collect seller location
   */
  collectSellerLocation(phone, location) {
    const session = this.getSession(phone);
    session.update({ sellerLocation: location });
    return session;
  }

  /**
   * Collect product info
   */
  collectProductInfo(phone, productName, price) {
    const session = this.getSession(phone);
    session
      .transition(CommerceStates.SELL_PRICING, { productName, price })
      .update({
        productName,
        productPrice: price
      });
    
    return session;
  }

  /**
   * Verify and list product
   */
  verifyAndList(phone) {
    const session = this.getSession(phone);
    session
      .transition(CommerceStates.SELL_VERIFICATION)
      .transition(CommerceStates.SELL_LISTED);
    
    return session;
  }

  /**
   * Get conversation prompt based on state
   * This feeds into Cerebras for natural language generation
   */
  getConversationPrompt(phone) {
    const session = this.getSession(phone);
    const ctx = session.getContext();
    
    const prompts = {
      [CommerceStates.IDLE]: {
        context: 'User just started or reset',
        goal: 'Greet and understand intent',
        expectedInput: 'Greeting or buy/sell intent'
      },
      [CommerceStates.BUY_SEARCHING]: {
        context: `Searching for ${ctx.data.quantity} ${ctx.data.item} in ${ctx.data.location}`,
        goal: 'Inform user and show results',
        expectedInput: 'Vendor selection number'
      },
      [CommerceStates.BUY_VENDOR_FOUND]: {
        context: `Found ${ctx.data.vendorsFound.length} vendors for ${ctx.data.item}`,
        goal: 'Present options and await selection',
        expectedInput: 'Number 1-N to select vendor'
      },
      [CommerceStates.BUY_SELECTING]: {
        context: `User selected vendor ${ctx.data.selectedVendorIndex}`,
        goal: 'Confirm selection and proceed to payment',
        expectedInput: 'Confirmation to proceed'
      },
      [CommerceStates.BUY_CHECKOUT]: {
        context: `Checkout for ${ctx.data.quantity} ${ctx.data.item} at ₦${ctx.data.vendor?.price}`,
        goal: 'Present payment link and instructions',
        expectedInput: 'Payment completion'
      },
      [CommerceStates.SELL_ONBOARDING]: {
        context: 'New vendor onboarding started',
        goal: 'Collect shop name',
        expectedInput: 'Shop or business name'
      },
      [CommerceStates.SELL_SHOP_DETAILS]: {
        context: `Shop name: ${ctx.data.shopName}`,
        goal: 'Collect location',
        expectedInput: 'Area or neighborhood'
      },
      [CommerceStates.SELL_PRODUCT_INFO]: {
        context: 'Need product details',
        goal: 'Collect what they sell and price',
        expectedInput: 'Product name and price'
      },
      [CommerceStates.SELL_PRICING]: {
        context: `Product: ${ctx.data.productName}, Price: ₦${ctx.data.productPrice}`,
        goal: 'Verify details before listing',
        expectedInput: 'Confirmation'
      }
    };
    
    return prompts[session.state] || prompts[CommerceStates.IDLE];
  }

  /**
   * Clear stale sessions (inactive >30 min)
   */
  cleanup() {
    const THIRTY_MIN = 30 * 60 * 1000;
    const now = Date.now();
    let cleared = 0;
    
    for (const [phone, session] of this.sessions) {
      if (now - session.data.lastActivity > THIRTY_MIN) {
        this.sessions.delete(phone);
        cleared++;
      }
    }
    
    if (cleared > 0) {
      console.log(`[COMMERCE] Cleaned up ${cleared} stale sessions`);
    }
  }

  /**
   * Get stats
   */
  getStats() {
    const states = {};
    for (const session of this.sessions.values()) {
      states[session.state] = (states[session.state] || 0) + 1;
    }
    return {
      activeSessions: this.sessions.size,
      byState: states
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const commerceEngine = new CommerceEngine();

// Cleanup every 10 minutes
setInterval(() => commerceEngine.cleanup(), 10 * 60 * 1000);

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  CommerceStates,
  CommerceStateMachine,
  CommerceEngine,
  commerceEngine
};