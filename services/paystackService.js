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
  const { data } = await axios.post(
    `${BACHS_BASE_URL}/v1/checkout-sessions`,
    {
      product_cart: [
        {
          product_id: 'prod_gotomart_default', // For MVP: create this product in Bachs dashboard
          quantity: 1
        }
      ],
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
    },
    { headers: bachsHeaders() }
  );

  return data.data.url;
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

module.exports = { createCheckoutLink, verifyWebhookSignature, payoutToVendor, parseBankDetails };
