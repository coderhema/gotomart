/**
 * WhatsApp Services Index
 * Centralized exports for all WhatsApp messaging services
 *
 * Usage:
 *   const whatsapp = require('./services');
 *   await whatsapp.sendText(to, body);
 *   await whatsapp.sendVendorList(to, intent, vendors);
 *   await whatsapp.ButtonMessage.confirm('OK?').send(to);
 */

// Core WhatsApp service
const {
  sendText,
  sendVendorList
} = require('./whatsappService');

// Enhanced WhatsApp service with interactive components
const {
  sendText: sendTextEnhanced,
  sendQuickReplies,
  sendVendorOnboardingOptions,
  sendCatalogForwardAcknowledgment,
  sendListingConfirmation,
  sendEnhancedVendorList,
  sendWelcomeMessage
} = require('./whatsappEnhancedService');

// Interactive Components (Baileys)
const {
  ButtonMessage,
  ListMessage,
  ButtonMessageBuilder,
  ListMessageBuilder,
  parseInteractiveResponse,
  isInteractiveResponse,
  ComponentIds
} = require('./whatsappComponents');

// Conversation Router (NLP + Session Context)
const {
  ConversationContext,
  routeConversation,
  analyzeMessage,
  isReturningToTopic,
  TOPICS,
  STATES
} = require('./conversationService');

/**
 * Re-export all WhatsApp messaging functions
 *
 * Basic messaging:
 *   - sendText: Send plain text messages
 *
 * Interactive components:
 *   - sendQuickReplies: Send button-based quick replies
 *   - sendEnhancedVendorList: Send vendor list with prices and locations
 *   - sendWelcomeMessage: Send welcome message with action options
 *
 * Vendor onboarding:
 *   - sendVendorOnboardingOptions: Onboarding flow for new vendors
 *   - sendCatalogForwardAcknowledgment: Acknowledge catalog forwards
 *   - sendListingConfirmation: Confirm vendor listing is live
 *
 * Buyer flow:
 *   - sendVendorList: Send list of vendors for buyer search
 */
module.exports = {
  // From whatsappService.js
  sendText,
  sendVendorList,

  // From whatsappEnhancedService.js
  sendQuickReplies,
  sendVendorOnboardingOptions,
  sendCatalogForwardAcknowledgment,
  sendListingConfirmation,
  sendEnhancedVendorList,
  sendWelcomeMessage,

  // Interactive Components
  ButtonMessage,
  ListMessage,
  ButtonMessageBuilder,
  ListMessageBuilder,
  parseInteractiveResponse,
  isInteractiveResponse,
  ComponentIds,

  // Conversation Router (NLP + Session Context)
  ConversationContext,
  routeConversation,
  analyzeMessage,
  isReturningToTopic,
  TOPICS,
  STATES,

  // Legacy: sendTextEnhanced (same as sendText, for backward compatibility)
  sendTextEnhanced
};
