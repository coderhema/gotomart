const axios = require('axios');
const crypto = require('crypto');

const BACHS_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.bachs.io' 
  : 'https://sandbox-api.bachs.io';

function bachsHeaders() {
  return {
    Authorization: `Bearer ${process.env.BACHS_API_KEY}`,
    'Content-Type': 'application/json'
  };
}

/**
 * order: { reference, vendorUid, item, quantity, price }
 * `reference` is our own Orders record reference, passed through to Bachs
 * so the payment webhook can look the order back up without extra state.
 */
async function createCheckoutLink(buyerPhone, order) {
  const productId = process.env.BACHS_PRODUCT_ID || 'prod_1208ae9a19954901bf40';
  const amount = Number(order.price || 0);
  const amountStr = amount.toFixed(2);

  // Prefer product_cart when a catalog product exists; fall back to ad-hoc pricing
  // so marketplace orders with dynamic prices still get a checkout URL.
  const payload = {
    customer: {
      email: `${buyerPhone}@gotomart.buyer`,
      phone: buyerPhone
    },
    metadata: {
      buyerPhone,
      vendorUid: order.vendorUid,
      item: order.item,
      quantity: order.quantity,
      price: order.price,
      reference: order.reference
    },
    return_url: `${process.env.BASE_URL || 'https://gotomart.com'}/success`,
    cancel_url: `${process.env.BASE_URL || 'https://gotomart.com'}/cancelled`
  };

  if (productId) {
    payload.product_cart = [{ product_id: productId, quantity: 1 }];
  } else {
    payload.pricing = { amount: amountStr, currency: 'NGN' };
  }

  try {
    const { data } = await axios.post(
      `${BACHS_BASE_URL}/v1/checkout-sessions`,
      payload,
      { headers: bachsHeaders() }
    );
    return data?.checkout_url || data?.data?.checkout_url || data?.data?.url || data?.url || null;
  } catch (err) {
    // If fixed product price mismatches order amount, retry with dynamic pricing
    const detail = err.response?.data?.detail || err.message;
    console.warn('[BACHS] product_cart checkout failed, retrying pricing:', detail);
    const retryPayload = {
      ...payload,
      product_cart: undefined,
      pricing: { amount: amountStr, currency: 'NGN' }
    };
    delete retryPayload.product_cart;
    const { data } = await axios.post(
      `${BACHS_BASE_URL}/v1/checkout-sessions`,
      retryPayload,
      { headers: bachsHeaders() }
    );
    return data?.checkout_url || data?.data?.checkout_url || data?.data?.url || data?.url || null;
  }
}

/**
 * Parse bank details string into components
 * Format: "BankName, AccountNumber, AccountName"
 * e.g., "GTBank, 0123456789, Iya Basira Foods"
 */
function parseBankDetails(bankDetailsString) {
  if (!bankDetailsString) return null;
  
  const parts = bankDetailsString.split(',').map(p => p.trim());
  if (parts.length < 3) return null;
  
  return {
    bankName: parts[0],
    accountNumber: parts[1],
    accountName: parts[2]
  };
}

/**
 * Known Nigerian bank codes (sample - add more as needed)
 */
const BANK_CODES = {
  'gtbank': '058',
  'access bank': '044',
  'zenith bank': '057',
  'first bank': '011',
  'uba': '032',
  'fidelity': '070',
  'sterling': '232',
  'ecobank': '050',
  'guaranty trust': '058',
  'guaranty trust bank': '058'
};

function getBankCode(bankName) {
  const lower = bankName.toLowerCase();
  return BANK_CODES[lower] || '058'; // Default to GTBank if not found
}

/**
 * Pay out to vendor after successful payment
 * @param {string} amount - Amount in NGN (decimal string, e.g., "45000.00")
 * @param {string} vendorBankDetails - "BankName, AccountNumber, AccountName"
 * @param {string} reference - Unique payout reference
 */
async function payoutToVendor(amount, vendorBankDetails, reference) {
  const bankInfo = parseBankDetails(vendorBankDetails);
  if (!bankInfo) {
    console.error('Invalid bank details:', vendorBankDetails);
    return null;
  }

  const bankCode = getBankCode(bankInfo.bankName);
  
  try {
    // First, create a payout destination
    const destination = await axios.post(
      `${BACHS_BASE_URL}/v1/payouts/destinations`,
      {
        destination_type: 'bank_account',
        currency: 'NGN',
        label: `vendor_${reference}`,
        account_number: bankInfo.accountNumber,
        bank_code: bankCode,
        account_name: bankInfo.accountName
      },
      { headers: bachsHeaders() }
    );

    const destinationId = destination.data.data.id;

    // Then, create the withdrawal/payout
    const payout = await axios.post(
      `${BACHS_BASE_URL}/v1/payouts/withdrawals`,
      {
        from_currency: 'NGN',
        to_currency: 'NGN',
        amount: amount,
        payment_method: 'BANK_TRANSFER',
        reference: `payout_${reference}`,
        email: 'payouts@gotomart.com',
        payout_destination_id: destinationId
      },
      { headers: bachsHeaders() }
    );

    return payout.data.data;
  } catch (err) {
    console.error('Payout error:', err?.response?.data || err.message);
    return null;
  }
}

/**
 * Verifies the x-bachs-signature header on incoming webhook calls.
 */
function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!signatureHeader) return false;
  
  const hash = crypto
    .createHmac('sha256', process.env.BACHS_WEBHOOK_SECRET || process.env.BACHS_API_KEY)
    .update(rawBody)
    .digest('hex');
  
  return hash === signatureHeader;
}



/**
 * Normalize BACHs (or legacy) webhook payloads into a common shape.
 */
function parseWebhookEvent(body = {}) {
  const data = body.data || body.payload || {};
  const type = body.event || body.type || data.status || data.event || '';
  const reference =
    data.reference ||
    data.metadata?.reference ||
    body.reference ||
    body.metadata?.reference ||
    null;
  return {
    type,
    reference,
    data,
    raw: body
  };
}

function isSuccessfulPayment(event = {}) {
  const type = String(event.type || event.event || event.raw?.event || '').toLowerCase();
  const status = String(event.data?.status || event.raw?.data?.status || '').toLowerCase();
  return (
    type.includes('success') ||
    type === 'checkout.completed' ||
    type.includes('checkout.completed') ||
    status === 'success' ||
    status === 'completed' ||
    status === 'paid'
  );
}

/** Alias used by older call sites */
async function createPaymentLink(buyerPhone, order) {
  // Support both (phone, order) and legacy single-arg shapes
  if (order && typeof order === 'object') {
    return createCheckoutLink(buyerPhone, order);
  }
  return createCheckoutLink(buyerPhone, order || {});
}

const WebhookEvents = {
  CHECKOUT_COMPLETED: 'checkout.completed',
  PAYMENT_SUCCESS: 'payment.success'
};

async function createPayout(amount, vendorBankDetails, reference) {
  return payoutToVendor(amount, vendorBankDetails, reference);
}

module.exports = {
  createCheckoutLink,
  createPaymentLink,
  verifyWebhookSignature,
  payoutToVendor,
  createPayout,
  parseBankDetails,
  parseWebhookEvent,
  isSuccessfulPayment,
  WebhookEvents
};

