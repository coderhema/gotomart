/**
 * WhatsApp Interactive Components
 * Reusable components for Baileys interactive messages
 *
 * Components:
 *   - ButtonMessage: Single-choice action buttons
 *   - ListMessage: Multi-item selection lists
 *   - TemplateMessage: Reusable message templates
 *
 * Usage:
 *   import { ButtonMessage, ListMessage } from './whatsappComponents';
 *   const btn = new ButtonMessage('Select:', [{ id: 'ok', text: 'OK' }]);
 *   btn.send(to);
 */

const {
  sendButtonMessage,
  sendListMessage,
  sendText
} = require('./twilioService');

// ============================================================================
// BUTTON MESSAGE COMPONENT
// ============================================================================

/**
 * Button Message Component
 * Displays 1-3 clickable buttons below a message
 *
 * WhatsApp Limits:
 *   - Max 3 buttons per message
 *   - Button text: max 20 characters
 *   - Button ID: max 256 characters
 */
class ButtonMessage {
  /**
   * @param {string} body - Main message text
   * @param {Array} buttons - Array of button objects
   * @param {string} [header] - Optional header text
   * @param {string} [footer] - Optional footer text
   */
  constructor(body, buttons = [], header = '', footer = '') {
    this.body = body;
    this.buttons = buttons.slice(0, 3); // WhatsApp max: 3 buttons
    this.header = header;
    this.footer = footer;
    this.type = 'button';
  }

  /**
   * Validate button configuration
   * @returns {Object} Validation result
   */
  validate() {
    const errors = [];

    if (!this.body || this.body.length === 0) {
      errors.push('Body text is required');
    }

    if (this.buttons.length === 0) {
      errors.push('At least 1 button is required');
    }

    if (this.buttons.length > 3) {
      errors.push('Maximum 3 buttons allowed');
    }

    this.buttons.forEach((btn, i) => {
      if (!btn.text || btn.text.length === 0) {
        errors.push(`Button ${i + 1}: Text is required`);
      }
      if (btn.text && btn.text.length > 20) {
        errors.push(`Button ${i + 1}: Text exceeds 20 chars (got ${btn.text.length})`);
      }
      if (!btn.id) {
        errors.push(`Button ${i + 1}: ID is required`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Send this button message
   * @param {string} to - Recipient JID or phone number
   * @returns {Promise<Object>} Send result
   */
  async send(to) {
    const validation = this.validate();
    if (!validation.valid) {
      throw new Error(`ButtonMessage validation failed: ${validation.errors.join(', ')}`);
    }

    const formattedButtons = this.buttons.map(btn => ({
      id: btn.id,
      text: btn.text
    }));

    return sendButtonMessage(to, this.body, formattedButtons);
  }

  /**
   * Add a button to this message
   * @param {Object} button - Button config
   * @returns {ButtonMessage} This instance (chainable)
   */
  addButton(button) {
    if (this.buttons.length < 3) {
      this.buttons.push(button);
    } else {
      console.warn('[ButtonMessage] Max 3 buttons, ignoring extra');
    }
    return this;
  }

  /**
   * Create a builder instance
   * @param {string} body - Body text
   * @returns {ButtonMessageBuilder} Builder for fluent API
   */
  static builder(body) {
    return new ButtonMessageBuilder(body);
  }

  /**
   * Factory: Create confirmation buttons
   * @param {string} actionId - Base ID for buttons
   * @returns {ButtonMessage}
   */
  static confirm(body, actionId) {
    return new ButtonMessage(body, [
      { id: `${actionId}_yes`, text: '✅ Yes' },
      { id: `${actionId}_no`, text: '❌ No' }
    ]);
  }

  /**
   * Factory: Create pay/cancel buttons
   * @param {number} amount - Price amount
   * @returns {ButtonMessage}
   */
  static payment(amount, currency = '₦') {
    const body = `Confirm payment of ${currency}${amount.toLocaleString()}?`;
    return new ButtonMessage(body, [
      { id: 'pay_now', text: '🛒 Pay Now' },
      { id: 'cancel', text: '↩️ Cancel' }
    ]);
  }
}

/**
 * Button Message Builder (Fluent API)
 */
class ButtonMessageBuilder {
  constructor(body) {
    this.message = new ButtonMessage(body, []);
  }

  header(text) {
    this.message.header = text;
    return this;
  }

  footer(text) {
    this.message.footer = text;
    return this;
  }

  button(id, text) {
    this.message.addButton({ id, text });
    return this;
  }

  build() {
    return this.message;
  }

  async send(to) {
    return this.message.send(to);
  }
}

// ============================================================================
// LIST MESSAGE COMPONENT
// ============================================================================

/**
 * List Message Component
 * Displays a scrollable list of selectable items
 *
 * WhatsApp Limits:
 *   - Max 10 list items per section
 *   - Max 1 section (for now, single section recommended)
 *   - Item title: max 24 characters
 *   - Item description: max 72 characters
 */
class ListMessage {
  /**
   * @param {string} title - List title (shown in preview)
   * @param {string} body - Main message text
   * @param {Array} sections - Array of section objects
   * @param {string} [buttonText] - Button text to open list (default: "Select")
   * @param {string} [footer] - Optional footer text
   */
  constructor(title, body, sections = [], buttonText = 'Select', footer = '') {
    this.title = title;
    this.body = body;
    this.sections = sections.map(s => ({
      title: s.title || 'Options',
      options: (s.options || s.items || []).slice(0, 10) // WhatsApp max: 10 items per section
    }));
    this.buttonText = buttonText;
    this.footer = footer;
    this.type = 'list';
  }

  /**
   * Validate list configuration
   * @returns {Object} Validation result
   */
  validate() {
    const errors = [];

    if (!this.body || this.body.length === 0) {
      errors.push('Body text is required');
    }

    if (this.sections.length === 0) {
      errors.push('At least 1 section is required');
    }

    if (this.sections.length > 1) {
      console.warn('[ListMessage] Multiple sections may not display correctly on all devices');
    }

    this.sections.forEach((section, si) => {
      if (!section.options || section.options.length === 0) {
        errors.push(`Section ${si + 1}: No options provided`);
      }

      section.options.forEach((opt, oi) => {
        if (!opt.text && !opt.title) {
          errors.push(`Section ${si + 1}, Item ${oi + 1}: Text/title is required`);
        }
        const title = opt.text || opt.title;
        if (title && title.length > 24) {
          errors.push(`Section ${si + 1}, Item ${oi + 1}: Title exceeds 24 chars (${title.length})`);
        }
        if (opt.description && opt.description.length > 72) {
          errors.push(`Section ${si + 1}, Item ${oi + 1}: Description exceeds 72 chars`);
        }
        if (!opt.id) {
          errors.push(`Section ${si + 1}, Item ${oi + 1}: ID is required`);
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Send this list message
   * @param {string} to - Recipient JID or phone number
   * @returns {Promise<Object>} Send result
   */
  async send(to) {
    const validation = this.validate();
    if (!validation.valid) {
      throw new Error(`ListMessage validation failed: ${validation.errors.join(', ')}`);
    }

    // Format for Baileys sendListMessage
    const formattedSections = this.sections.map(section => ({
      title: section.title || 'Options',
      options: section.options.map(opt => ({
        id: opt.id,
        text: opt.text || opt.title || 'Option',
        description: opt.description || opt.desc || ''
      }))
    }));

    return sendListMessage(to, this.title, this.body, formattedSections);
  }

  /**
   * Add a section to this list
   * @param {Object} section - Section config
   * @returns {ListMessage} This instance (chainable)
   */
  addSection(title, options = []) {
    this.sections.push({ title, options });
    return this;
  }

  /**
   * Add an item to the last section
   * @param {Object} item - Item config
   * @returns {ListMessage} This instance (chainable)
   */
  addItem(item) {
    if (this.sections.length === 0) {
      this.sections.push({ title: 'Options', options: [] });
    }
    const lastSection = this.sections[this.sections.length - 1];
    if (lastSection.options.length < 10) {
      lastSection.options.push(item);
    } else {
      console.warn('[ListMessage] Section full (max 10 items), ignoring extra');
    }
    return this;
  }

  /**
   * Create a builder instance
   * @param {string} title - List title
   * @param {string} body - Body text
   * @returns {ListMessageBuilder} Builder for fluent API
   */
  static builder(title, body) {
    return new ListMessageBuilder(title, body);
  }

  /**
   * Factory: Create vendor selection list
   * @param {Array} vendors - Array of vendor objects
   * @param {Object} intent - Search intent
   * @returns {ListMessage}
   */
  static vendorSelection(vendors, intent = {}) {
    const options = vendors.map((v, i) => ({
      id: `vendor_${v.reference || i}`,
      text: v.name?.slice(0, 24) || `Vendor ${i + 1}`,
      description: `₦${v.price} • ${v.location || 'N/A'}`.slice(0, 72)
    }));

    return new ListMessage(
      '🛒 Available Vendors',
      `Found ${vendors.length} vendors${intent.location ? ` in ${intent.location}` : ''}. Tap to select:`,
      [{ title: 'Select a Vendor', options }]
    );
  }

  /**
   * Factory: Create main menu
   * @returns {ListMessage}
   */
  static mainMenu(phone) {
    return new ListMessage(
      'GoToMart',
      'What would you like to do?',
      [{
        title: 'Main Menu',
        options: [
          { id: 'menu_buy', text: '🛒 Buy Products', description: 'Search for items to buy' },
          { id: 'menu_sell', text: '🏪 Sell Products', description: 'List your items for sale' },
          { id: 'menu_orders', text: '📦 My Orders', description: 'View your order history' },
          { id: 'menu_help', text: '❓ Help', description: 'Get assistance and FAQs' }
        ]
      }]
    );
  }
}

/**
 * List Message Builder (Fluent API)
 */
class ListMessageBuilder {
  constructor(title, body) {
    this.message = new ListMessage(title, body, []);
  }

  section(title) {
    this.message.sections.push({ title, options: [] });
    return this;
  }

  item(id, text, description = '') {
    this.message.addItem({ id, text, description });
    return this;
  }

  buttonText(text) {
    this.message.buttonText = text;
    return this;
  }

  footer(text) {
    this.message.footer = text;
    return this;
  }

  build() {
    return this.message;
  }

  async send(to) {
    return this.message.send(to);
  }
}

// ============================================================================
// COMPONENT UTILITIES
// ============================================================================

/**
 * Parse interactive response from Baileys message
 * Handles multiple possible message structures from Baileys
 * @param {Object} message - Baileys message object (from msg.message)
 * @returns {Object|null} Parsed response or null if not interactive
 */
function parseInteractiveResponse(message) {
  if (!message) return null;

  // Access the actual message content (could be nested)
  const msgContent = message.message || message;

  // Button response (from interactive buttons)
  if (msgContent.buttonsResponseMessage) {
    const btn = msgContent.buttonsResponseMessage;
    return {
      type: 'button',
      buttonId: btn.selectedButtonId,
      buttonText: btn.selectedDisplayText || btn.selectedButtonId
    };
  }

  // List response (from list messages)
  if (msgContent.listResponseMessage) {
    const list = msgContent.listResponseMessage;
    return {
      type: 'list',
      itemId: list.singleSelectReply?.selectedRowId || list.rowId,
      itemTitle: list.title,
      description: list.description
    };
  }

  // Template/Native button response (newer Baileys versions)
  if (msgContent.templateButtonReplyMessage) {
    const tmpl = msgContent.templateButtonReplyMessage;
    return {
      type: 'template',
      buttonId: tmpl.selectedId,
      buttonText: tmpl.selectedDisplayText || tmpl.selectedId
    };
  }

  // Fallback: check for buttonId directly in message
  if (msgContent.buttonId) {
    return {
      type: 'button',
      buttonId: msgContent.buttonId,
      buttonText: msgContent.buttonText || msgContent.buttonId
    };
  }

  // Check for response context (some versions wrap differently)
  if (msgContent.interactiveResponseMessage) {
    const interactive = msgContent.interactiveResponseMessage;
    if (interactive.buttonReplyMessage) {
      return {
        type: 'button',
        buttonId: interactive.buttonReplyMessage.selectedButtonId,
        buttonText: interactive.buttonReplyMessage.selectedDisplayText
      };
    }
    if (interactive.listReplyMessage) {
      return {
        type: 'list',
        itemId: interactive.listReplyMessage.selectedRowId,
        itemTitle: interactive.listReplyMessage.title,
        description: interactive.listReplyMessage.description
      };
    }
  }

  return null;
}

/**
 * Check if message is an interactive response
 * @param {Object} message - Baileys message
 * @returns {boolean}
 */
function isInteractiveResponse(message) {
  return !!parseInteractiveResponse(message);
}

/**
 * Component ID Constants
 * Prefix patterns for identifying component types
 */
const ComponentIds = {
  // Button IDs
  PAY: 'pay',
  CANCEL: 'cancel',
  CONFIRM: 'confirm',
  CONTACT: 'contact',
  SHOW_MENU: 'menu',

  // List Item IDs
  VENDOR_PREFIX: 'vendor_',
  ORDER_PREFIX: 'order_',
  MENU_PREFIX: 'menu_',

  // Action suffixes
  YES: '_yes',
  NO: '_no',
  LATER: '_later',

  /**
   * Extract base action from component ID
   * @param {string} id - Component ID
   * @returns {string} Base action
   */
  extractAction(id) {
    if (!id) return null;
    const parts = id.split('_');
    return parts[0] || id;
  },

  /**
   * Check if ID belongs to a category
   * @param {string} id - Component ID
   * @param {string} prefix - Prefix to check
   * @returns {boolean}
   */
  hasPrefix(id, prefix) {
    return id && id.startsWith(prefix);
  }
};

// ============================================================================
// EXPORT
// ============================================================================

module.exports = {
  // Components
  ButtonMessage,
  ListMessage,
  ButtonMessageBuilder,
  ListMessageBuilder,

  // Utilities
  parseInteractiveResponse,
  isInteractiveResponse,
  ComponentIds
};
