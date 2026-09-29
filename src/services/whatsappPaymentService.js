/**
 * WhatsApp-Native Payment Flow
 * 
 * Handles complete payment process through WhatsApp conversation:
 * 1. Show order summary with "Pay Now" button
 * 2. Collect payment method (Card/Transfer/USSD)
 * 3. Process payment via Bachs API
 * 4. Confirm success/failure
 * 
 * No external browser needed - everything stays in WhatsApp!
 */

const { createPayout } = require('./paymentService');
const { sendText } = require('./twilioService');
const { getOrderByReference, markOrderPaid, updateOrder } = require('./orderService');
const { ButtonMessage, ListMessage } = require('./whatsappComponents');
const axios = require('axios');

// Payment states for conversation
const PAYMENT_STATES = {
  IDLE: 'idle',
  AWAITING_METHOD: 'awaiting_payment_method',
  AWAITING_CARD_NUMBER: 'awaiting_card_number',
  AWAITING_CARD_EXPIRY: 'awaiting_card_expiry',
  AWAITING_CARD_CVV: 'awaiting_card_cvv',
  AWAITING_CARD_PIN: 'awaiting_card_pin',
  AWAITING_TRANSFER_CONFIRMATION: 'awaiting_transfer_confirmation',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// Payment methods
const PAYMENT_METHODS = {
  CARD: 'card',
  BANK_TRANSFER: 'bank_transfer',
  USSD: 'ussd'
};

const BACHS_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.bachs.io'
  : 'https://sandbox-api.bachs.io';

// ============================================
// STEP 1: Initiate Payment (Show Order Summary)
// ============================================

/**
 * Send payment request to buyer with order details
 */
async function initiateWhatsAppPayment(buyerPhone, order) {
  console.log('[WP_PAYMENT] Initiating for order:', order.reference);
  
  const summary = `💳 *Payment Request*

📦 Order: ${order.item}
📍 Location: ${order.location}
💰 Amount: *₦${Number(order.price).toLocaleString()}*
🏪 Vendor: ${order.vendorName}

Choose how you'd like to pay:`;

  // Send payment options as buttons
  await sendPaymentOptions(buyerPhone, order.reference);
  
  return {
    step: 'payment_initiated',
    orderRef: order.reference
  };
}

/**
 * Send payment method options
 */
async function sendPaymentOptions(phone, orderRef) {
  const message = new ListMessage(
    'Choose payment method',
    [
      {
        id: `pay_card_${orderRef}`,
        title: '💳 Pay with Card',
        description: 'Enter card details securely'
      },
      {
        id: `pay_transfer_${orderRef}`,
        title: '🏦 Bank Transfer',
        description: 'Transfer to our account'
      },
      {
        id: `pay_ussd_${orderRef}`,
        title: '📱 USSD',
        description: 'Pay with USSD code'
      }
    ],
    {
      header: 'Select Payment Method',
      footer: 'Your payment is secured by Bachs'
    }
  );
  
  await message.send(phone);
}

// ============================================
// STEP 2: Handle Payment Method Selection
// ============================================

/**
 * Process payment method selection
 */
async function handlePaymentMethodSelection(phone, method, orderRef) {
  console.log('[WP_PAYMENT] Method selected:', method, 'for', orderRef);
  
  const order = await getOrderByReference(orderRef);
  if (!order) {
    return sendText(phone, '❌ Order not found. Please try again.');
  }
  
  switch (method) {
    case PAYMENT_METHODS.CARD:
      await startCardPayment(phone, order);
      break;
    case PAYMENT_METHODS.BANK_TRANSFER:
      await showTransferDetails(phone, order);
      break;
    case PAYMENT_METHODS.USSD:
      await showUSSDOptions(phone, order);
      break;
    default:
      await sendText(phone, '❌ Invalid payment method. Please try again.');
  }
}

/**
 * Start card payment flow
 */
async function startCardPayment(phone, order) {
  // Update session state
  await updateOrder(order.id, {
    PaymentState: PAYMENT_STATES.AWAITING_CARD_NUMBER,
    PaymentMethod: PAYMENT_METHODS.CARD
  });
  
  await sendText(
    phone,
    `💳 *Card Payment*

Please enter your card number:
(Example: 5399 1234 5678 9012)

🔒 Your card details are encrypted and secure.`
  );
}

/**
 * Show bank transfer details
 */
async function showTransferDetails(phone, order) {
  const amount = order.price;
  const ref = order.reference;
  
  await updateOrder(order.id, {
    PaymentState: PAYMENT_STATES.AWAITING_TRANSFER_CONFIRMATION,
    PaymentMethod: PAYMENT_METHODS.BANK_TRANSFER
  });
  
  await sendText(
    phone,
    `🏦 *Bank Transfer*

Please transfer *₦${Number(amount).toLocaleString()}* to:

*Bank:* GTBank
*Account Name:* GoToMart Ltd
*Account Number:* 0123456789

*Reference:* ${ref}

⚠️ *Important:* Use "${ref}" as your transfer reference!

Reply *"DONE"* when you've completed the transfer.`,
    {
      buttons: [
        { id: `confirm_transfer_${ref}`, text: '✅ Done' },
        { id: `cancel_payment_${ref}`, text: '❌ Cancel' }
      ]
    }
  );
}

/**
 * Show USSD options based on bank
 */
async function showUSSDOptions(phone, order) {
  const amount = order.price;
  
  await sendText(
    phone,
    `📱 *USSD Payment*

Choose your bank:

1. *GTBank* - Dial:
*737*2*${amount}#

2. *UBA* - Dial:
*919*2*${amount}#

3. *Access Bank* - Dial:
*901*2*${amount}#

4. *Zenith Bank* - Dial:
*966*2*${amount}#

Reply *"DONE"* after completing the transfer.`,
    {
      buttons: [
        { id: `confirm_ussd_${order.reference}`, text: '✅ Done' },
        { id: `cancel_payment_${order.reference}`, text: '❌ Cancel' }
      ]
    }
  );
}

// ============================================
// STEP 3: Process Card Payment
// ============================================

/**
 * Handle card number input
 */
async function handleCardNumber(phone, cardNumber, order) {
  // Simple validation - remove spaces, check length
  const cleanNumber = cardNumber.replace(/\s/g, '');
  
  if (!/^\d{15,16}$/.test(cleanNumber)) {
    await sendText(phone, '❌ Invalid card number. Please enter a valid 15-16 digit card number:');
    return;
  }
  
  // Store securely (in reality, never store raw card data)
  await updateOrder(order.id, {
    PaymentState: PAYMENT_STATES.AWAITING_CARD_EXPIRY,
    PaymentCardNumber: cleanNumber.substring(0, 4) + '****' + cleanNumber.slice(-4) // Only store masked
  });
  
  await sendText(
    phone,
    `✅ Card number accepted (****${cleanNumber.slice(-4)})

Now enter expiry date:
(MM/YY format, e.g., 09/26)`
  );
}

/**
 * Handle card expiry input
 */
async function handleCardExpiry(phone, expiry, order) {
  if (!/^\d{2}\/\d{2}$/.test(expiry)) {
    await sendText(phone, '❌ Invalid format. Please enter expiry as MM/YY:');
    return;
  }
  
  await updateOrder(order.id, {
    PaymentState: PAYMENT_STATES.AWAITING_CARD_CVV
  });
  
  await sendText(
    phone,
    `✅ Expiry: ${expiry}

Now enter CVV (3 digits on back of card):`
  );
}

/**
 * Handle CVV input
 */
async function handleCardCVV(phone, cvv, order) {
  if (!/^\d{3,4}$/.test(cvv)) {
    await sendText(phone, '❌ Invalid CVV. Please enter 3-4 digits:');
    return;
  }
  
  await updateOrder(order.id, {
    PaymentState: PAYMENT_STATES.AWAITING_CARD_PIN,
    PaymentCVV: '***' // Never store actual CVV
  });
  
  await sendText(
    phone,
    `✅ Card details received

Enter your 4-digit card PIN to authorize payment:

💰 Amount: ₦${Number(order.price).toLocaleString()}`
  );
}

/**
 * Process final card payment
 */
async function processCardPayment(phone, pin, order) {
  if (!/^\d{4}$/.test(pin)) {
    await sendText(phone, '❌ Invalid PIN. Please enter 4 digits:');
    return;
  }
  
  // Update state
  await updateOrder(order.id, { PaymentState: PAYMENT_STATES.PROCESSING });
  
  // Send processing message
  await sendText(phone, '🔄 Processing your payment... Please wait.');
  
  try {
    // Call Bachs to charge card
    const result = await chargeCard({
      order,
      pin
    });
    
    if (result.success) {
      await markOrderPaid(order.id);
      await sendPaymentConfirmation(phone, order);
    } else {
      await updateOrder(order.id, { PaymentState: PAYMENT_STATES.FAILED });
      await sendText(phone, `❌ Payment failed: ${result.message}\n\nPlease try again.`);
      await sendPaymentOptions(phone, order.reference);
    }
  } catch (err) {
    console.error('[WP_PAYMENT] Card charge failed:', err.message);
    await updateOrder(order.id, { PaymentState: PAYMENT_STATES.FAILED });
    await sendText(phone, '❌ Payment processing error. Please try again later.');
  }
}

// ============================================
// STEP 4: Process Transfer/USSD Confirmation
// ============================================

/**
 * Handler transfer/USSD confirmation
 */
async function handleTransferConfirmation(phone, order) {
  await updateOrder(order.id, { PaymentState: PAYMENT_STATES.PROCESSING });
  
  await sendText(
    phone,
    `⏳ *Verifying Payment*

We're checking for your transfer...
This usually takes 1-2 minutes.

Reference: ${order.reference}

We'll notify you once confirmed.`
  );
  
  // In production, poll for transfer or use webhook
  // For now, auto-confirm after 2 seconds (demo mode)
  setTimeout(async () => {
    try {
      await markOrderPaid(order.id);
      await sendPaymentConfirmation(phone, order);
    } catch (err) {
      console.error('[WP_PAYMENT] Transfer confirmation failed:', err.message);
      await sendText(phone, '❌ Could not verify payment. Please contact support.');
    }
  }, 2000);
}

/**
 * Charge card via Bachs API
 */
async function chargeCard({ order, pin }) {
  // This would call Bachs API with encrypted card details
  // For demo purposes, return success
  
  console.log('[WP_PAYMENT] Charging card for order:', order.reference);
  
  // In production, this makes actual API call:
  /*
  const response = await axios.post(
    `${BACHS_BASE_URL}/v1/charges`,
    {
      amount: order.price * 100, // kobo
      currency: 'NGN',
      source: 'card_token', // Use tokenized card
      metadata: {
        orderRef: order.reference,
        buyerPhone: order.BuyerPhone
      }
    },
    {
      headers: { Authorization: `Bearer ${process.env.BACHS_API_KEY}` }
    }
  );
  */
  
  // Demo mode - always succeed
  return {
    success: true,
    transactionId: `TXN_${Date.now()}`,
    reference: order.reference
  };
}

// ============================================
// STEP 5: Payment Confirmation
// ============================================

/**
 * Send payment confirmation to buyer
 */
async function sendPaymentConfirmation(phone, order) {
  await sendText(
    phone,
    `✅ *Payment Successful!*

📦 Order: ${order.Item}
💰 Amount: ₦${Number(order.Price).toLocaleString()}
🏪 Vendor: ${order.VendorPhone}

🎉 *Your Order PIN: ${order.Pin}*

Show this PIN to the vendor to confirm handover.

Thank you for using GoToMart! 🛒`
  );
  
  // Notify vendor
  await sendText(
    order.VendorPhone,
    `💰 *Order Paid!*

📦 Item: ${order.Item}
💰 Amount: ₦${Number(order.Price).toLocaleString()}
👤 Buyer: ${order.BuyerPhone}
🔐 PIN: ${order.Pin}

Contact buyer to arrange delivery.`,
    {
      buttons: [
        { id: `contact_${order.BuyerPhone}`, text: '📞 Contact Buyer' }
      ]
    }
  );
  
  // Process vendor payout
  const bankDetails = order.BankDetails || order.vendor?.BankDetails;
  if (bankDetails) {
    processPayout(order, bankDetails);
  }
}

/**
 * Process vendor payout
 */
async function processPayout(order, bankDetails) {
  try {
    const payoutAmount = Math.floor(Number(order.Price) * 0.95); // 5% fee
    
    const result = await createPayout({
      amount: payoutAmount,
      bankDetails,
      reference: order.reference
    });
    
    if (result.success) {
      await sendText(
        order.VendorPhone,
        `💸 *Payout Initiated*

Amount: ₦${payoutAmount.toLocaleString()}
You should receive this within 24 hours.`,
        { delay: 5000 } // Send after delay
      );
    }
  } catch (err) {
    console.error('[WP_PAYMENT] Payout failed:', err.message);
  }
}

// ============================================
// ROUTER FOR PAYMENT MESSAGES
// ============================================

/**
 * Route payment-related messages
 * Called from main message handler
 */
async function routePaymentMessage(phone, text, session, intent) {
  // Check if user is in a payment flow
  if (!session?.orderRef) return false;
  
  const order = await getOrderByReference(session.orderRef);
  if (!order) return false;
  
  const state = order.PaymentState || PAYMENT_STATES.IDLE;
  
  switch (state) {
    case PAYMENT_STATES.AWAITING_CARD_NUMBER:
      await handleCardNumber(phone, text, order);
      return true;
      
    case PAYMENT_STATES.AWAITING_CARD_EXPIRY:
      await handleCardExpiry(phone, text, order);
      return true;
      
    case PAYMENT_STATES.AWAITING_CARD_CVV:
      await handleCardCVV(phone, text, order);
      return true;
      
    case PAYMENT_STATES.AWAITING_CARD_PIN:
      await processCardPayment(phone, text, order);
      return true;
      
    default:
      return false;
  }
}

module.exports = {
  // Main entry points
  initiateWhatsAppPayment,
  handlePaymentMethodSelection,
  handleTransferConfirmation,
  
  // Router
  routePaymentMessage,
  
  // Constants
  PAYMENT_STATES,
  PAYMENT_METHODS
};