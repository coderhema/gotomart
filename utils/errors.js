/**
 * Enhanced error handling utilities for GoToMart
 */

/**
 * Error types for better categorization
 */
const ERROR_TYPES = {
  AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
  AIRTABLE_RATE_LIMIT: 'AIRTABLE_RATE_LIMIT',
  AIRTABLE_ERROR: 'AIRTABLE_ERROR',
  WHATSAPP_API_ERROR: 'WHATSAPP_API_ERROR',
  PAYMENT_SERVICE_ERROR: 'PAYMENT_SERVICE_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SESSION_ERROR: 'SESSION_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * Custom error class with type categorization
 */
class GoToMartError extends Error {
  constructor(message, type = ERROR_TYPES.UNKNOWN_ERROR, originalError = null) {
    super(message);
    this.name = 'GoToMartError';
    this.type = type;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Enhanced error logging with structured data
 */
function logError(error, context = {}) {
  const logData = {
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      type: error.type || ERROR_TYPES.UNKNOWN_ERROR,
      stack: error.stack
    },
    context,
    originalError: error.originalError ? {
      message: error.originalError.message,
      code: error.originalError.code,
      response: error.originalError.response?.data
    } : null
  };
  
  console.error('GoToMart Error:', JSON.stringify(logData, null, 2));
  
  // In production, you would send this to a logging service
  // Example: await sendToSentry(logData);
  
  return logData;
}

/**
 * Determine error type from error object
 */
function categorizeError(error) {
  if (!error) return ERROR_TYPES.UNKNOWN_ERROR;
  
  // Check for specific error patterns
  if (error.message?.includes('rate limit') || error.message?.includes('429')) {
    return ERROR_TYPES.AIRTABLE_RATE_LIMIT;
  }
  
  if (error.message?.includes('Cerebras') || error.message?.includes('AI') || error.message?.includes('GPT')) {
    return ERROR_TYPES.AI_SERVICE_UNAVAILABLE;
  }
  
  if (error.message?.includes('Airtable') || error.config?.url?.includes('airtable')) {
    return ERROR_TYPES.AIRTABLE_ERROR;
  }
  
  if (error.message?.includes('WhatsApp') || error.message?.includes('Meta') || error.config?.url?.includes('graph.facebook')) {
    return ERROR_TYPES.WHATSAPP_API_ERROR;
  }
  
  if (error.message?.includes('Bachs') || error.message?.includes('payment') || error.config?.url?.includes('bachs')) {
    return ERROR_TYPES.PAYMENT_SERVICE_ERROR;
  }
  
  return ERROR_TYPES.UNKNOWN_ERROR;
}

/**
 * Get user-friendly error message based on error type
 */
function getUserFriendlyMessage(errorType, originalError = null) {
  const messages = {
    [ERROR_TYPES.AIRTABLE_RATE_LIMIT]: "We're getting a lot of requests right now. Please try again in 30 seconds.",
    [ERROR_TYPES.AI_SERVICE_UNAVAILABLE]: "Our AI service is temporarily unavailable. Please try again in a few minutes.",
    [ERROR_TYPES.AIRTABLE_ERROR]: "We're having trouble accessing our database. Please try again shortly.",
    [ERROR_TYPES.WHATSAPP_API_ERROR]: "We're experiencing issues with WhatsApp messaging. Please try again.",
    [ERROR_TYPES.PAYMENT_SERVICE_ERROR]: "Our payment service is having issues. Please try the payment link again.",
    [ERROR_TYPES.VALIDATION_ERROR]: "There was an issue with your request. Please check and try again.",
    [ERROR_TYPES.SESSION_ERROR]: "There was an issue with your session. Please start over.",
    [ERROR_TYPES.UNKNOWN_ERROR]: "Sorry, we encountered an issue. Please try again or message 'help' for support."
  };
  
  return messages[errorType] || messages[ERROR_TYPES.UNKNOWN_ERROR];
}

/**
 * Create a structured error response for API/webhook responses
 */
function createErrorResponse(error, context = {}) {
  const errorType = categorizeError(error);
  const userMessage = getUserFriendlyMessage(errorType, error);
  
  return {
    success: false,
    error: {
      type: errorType,
      message: userMessage,
      internalMessage: error.message,
      timestamp: new Date().toISOString()
    },
    context,
    suggestion: getRecoverySuggestion(errorType)
  };
}

/**
 * Get recovery suggestions based on error type
 */
function getRecoverySuggestion(errorType) {
  const suggestions = {
    [ERROR_TYPES.AIRTABLE_RATE_LIMIT]: "Wait a moment and retry your request.",
    [ERROR_TYPES.AI_SERVICE_UNAVAILABLE]: "Try rephrasing your request or try again later.",
    [ERROR_TYPES.AIRTABLE_ERROR]: "This is usually temporary. Please wait and retry.",
    [ERROR_TYPES.WHATSAPP_API_ERROR]: "Check your internet connection and try again.",
    [ERROR_TYPES.PAYMENT_SERVICE_ERROR]: "Use the payment link again or contact support.",
    [ERROR_TYPES.UNKNOWN_ERROR]: "Contact support if the issue persists."
  };
  
  return suggestions[errorType] || "Please try again.";
}

/**
 * Wrapper for async functions with enhanced error handling
 */
async function withEnhancedErrorHandling(fn, context = {}) {
  try {
    return await fn();
  } catch (error) {
    const errorType = categorizeError(error);
    const enhancedError = new GoToMartError(
      error.message || 'Unknown error occurred',
      errorType,
      error
    );
    
    logError(enhancedError, context);
    
    // Re-throw the enhanced error
    throw enhancedError;
  }
}

module.exports = {
  ERROR_TYPES,
  GoToMartError,
  logError,
  categorizeError,
  getUserFriendlyMessage,
  createErrorResponse,
  getRecoverySuggestion,
  withEnhancedErrorHandling
};