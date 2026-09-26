const axios = require('axios');
const crypto = require('crypto');

/**
 * order: { reference, vendorUid, item, quantity, price }
 * `reference` is our own Orders record reference, passed through to Paystack
 * so the payment webhook can look the order back up without extra state.
 */
async function createCheckoutLink(buyerPhone, order) {
  const amountKobo = Math.round(order.price * 100);

  const { data } = await axios.post(
    'https://api.paystack.co/transaction/initialize',
    {
      email: `${buyerPhone}@gotomart.buyer`,
      amount: amountKobo,
      currency: 'NGN',
      reference: order.reference,
      metadata: {
        buyerPhone,
        vendorUid: order.vendorUid,
        item: order.item,
        quantity: order.quantity
      }
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return data.data.authorization_url;
}

/** Verifies the x-paystack-signature header on incoming webhook calls. */
function verifyWebhookSignature(rawBody, signatureHeader) {
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest('hex');
  return hash === signatureHeader;
}

module.exports = { createCheckoutLink, verifyWebhookSignature };
