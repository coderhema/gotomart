const axios = require('axios');

function baseUrl() {
  const table = process.env.AIRTABLE_ORDERS_TABLE || 'Orders';
  return `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`;
}

function headers() {
  return {
    Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Orders table fields: Reference (text, primary — the Paystack reference),
 * BuyerPhone, VendorId, VendorPhone, Item, Quantity, Price, Pin, Status ("pending"|"paid")
 */
async function createOrder(order) {
  const { data } = await axios.post(baseUrl(), { fields: order }, { headers: headers() });
  return data;
}

async function getOrderByReference(reference) {
  const { data } = await axios.get(baseUrl(), {
    headers: headers(),
    params: { filterByFormula: `{Reference} = "${reference}"`, maxRecords: 1 }
  });
  const record = data.records[0];
  return record ? { id: record.id, ...record.fields } : null;
}

async function markOrderPaid(recordId) {
  await axios.patch(`${baseUrl()}/${recordId}`, { fields: { Status: 'paid' } }, { headers: headers() });
}

module.exports = { createOrder, getOrderByReference, markOrderPaid };
