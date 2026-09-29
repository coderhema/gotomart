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
  // Airtable Orders fields (verified):
  // Reference, BuyerPhone, VendorId, VendorPhone, Item, Quantity (text), Price, Pin, Status
  // Quantity must be a string (e.g. "1 bag", "50kg"), not a number.
  const fields = {
    Reference: order.Reference,
    BuyerPhone: order.BuyerPhone,
    VendorId: order.VendorId,
    VendorPhone: order.VendorPhone,
    Item: order.Item,
    Quantity: order.Quantity == null ? undefined : String(order.Quantity),
    Price: order.Price,
    Pin: order.Pin == null ? undefined : String(order.Pin),
    Status: order.Status || 'pending'
  };

  const cleanFields = Object.fromEntries(
    Object.entries(fields).filter(([_, v]) => v !== undefined && v !== null && v !== '')
  );

  const { data } = await axios.post(baseUrl(), { fields: cleanFields }, { headers: headers() });
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

async function getOrdersByPhone(phone) {
  // Normalize phone number - extract just the digits from JID format
  const normalizedPhone = phone.replace(/[@].*$/, '').replace(/^\d+:/, '');
  
  // Query by BuyerPhone using filterByFormula
  const { data } = await axios.get(baseUrl(), {
    headers: headers(),
    params: { 
      filterByFormula: `FIND("${normalizedPhone}", {BuyerPhone})`,
      maxRecords: 10 
    }
  });
  
  return data.records.map(record => ({ id: record.id, ...record.fields }));
}

module.exports = { createOrder, getOrderByReference, markOrderPaid, getOrdersByPhone };
