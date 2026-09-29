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
 * Orders table fields in Airtable:
 * Reference (primary field), BuyerPhone, Vendor_ID, VendorPhone, 
 * Item, Quantity, Price, Pin, Status ("pending"|"paid")
 */
async function createOrder(order) {
  // Map JS field names to Airtable field names
  const fields = {
    Reference: order.Reference,
    BuyerPhone: order.BuyerPhone,
    'Vendor_ID': order.VendorId,       // Airtable uses Vendor_ID with underscore
    'Vendor_UID': order.VendorId,      // Try Vendor_UID if that exists
    'Vendor ID': order.VendorId,     // Or with space
    VendorPhone: order.VendorPhone,
    Item: order.Item,
    Quantity: order.Quantity,
    Price: order.Price,
    Pin: order.Pin,
    Status: order.Status
  };
  
  // Try creating with common field name variations
  const attempts = [
    { ...fields, 'Vendor_ID': order.VendorId },
    { ...fields, 'Vendor_UID': order.VendorId },
    { ...fields, 'VendorId': order.VendorId },
    { Reference: order.Reference, BuyerPhone: order.BuyerPhone, VendorPhone: order.VendorPhone, Item: order.Item, Quantity: order.Quantity, Price: order.Price, Pin: order.Pin, Status: order.Status }
  ];
  
  let lastError;
  for (const attemptFields of attempts) {
    try {
      // Remove undefined values
      const cleanFields = Object.fromEntries(
        Object.entries(attemptFields).filter(([_, v]) => v !== undefined)
      );
      const { data } = await axios.post(baseUrl(), { fields: cleanFields }, { headers: headers() });
      return data;
    } catch (err) {
      lastError = err;
      // If it's a field name error, try next
      if (err.response?.data?.error?.message?.includes('Unknown field name')) {
        console.log('[AIRTABLE] Field error, trying alternative:', err.response.data.error.message);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
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

async function getOrdersByPhone(phone) {
  const { data } = await axios.get(baseUrl(), {
    headers: headers(),
    params: { filterByFormula: `{BuyerPhone} = "${phone}"`, sort: [{ field: 'CreatedTime', direction: 'desc' }], maxRecords: 10 }
  });
  return data.records.map(record => ({ id: record.id, ...record.fields }));
}

module.exports = { createOrder, getOrderByReference, markOrderPaid, getOrdersByPhone };
