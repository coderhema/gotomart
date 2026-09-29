const axios = require('axios');
const { normalizePhone } = require('../utils/phone');

/**
 * Orders table fields (Airtable):
 * Reference, BuyerPhone, VendorId, VendorPhone, Item, Quantity (text),
 * Price, Pin, Status ("pending" | "awaiting_payment" | "paid" | "cancelled")
 */
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

function escapeFormula(str) {
  return String(str).replace(/"/g, '\\"');
}

function mapRecord(record) {
  return { id: record.id, ...record.fields };
}

async function createOrder(order) {
  const buyerPhone = normalizePhone(order.BuyerPhone || order.buyerPhone);
  const vendorPhone = normalizePhone(order.VendorPhone || order.vendorPhone) || (order.VendorPhone || '');

  const fields = {
    Reference: order.Reference,
    BuyerPhone: buyerPhone || order.BuyerPhone,
    VendorId: order.VendorId,
    VendorPhone: vendorPhone || order.VendorPhone,
    Item: order.Item,
    Quantity: order.Quantity == null ? undefined : String(order.Quantity),
    Price: order.Price,
    Pin: order.Pin == null ? undefined : String(order.Pin),
    Status: order.Status || 'pending'
  };

  const cleanFields = Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );

  const { data } = await axios.post(baseUrl(), { fields: cleanFields }, { headers: headers() });
  return data;
}

async function getOrderByReference(reference) {
  if (!reference) return null;
  const { data } = await axios.get(baseUrl(), {
    headers: headers(),
    params: {
      filterByFormula: `{Reference} = "${escapeFormula(reference)}"`,
      maxRecords: 1
    }
  });
  const record = data.records[0];
  return record ? mapRecord(record) : null;
}

async function updateOrderFields(recordId, fields) {
  if (!recordId) throw new Error('updateOrderFields requires recordId');
  const cleanFields = Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  const { data } = await axios.patch(
    `${baseUrl()}/${recordId}`,
    { fields: cleanFields },
    { headers: headers() }
  );
  return mapRecord(data);
}

async function updateOrderStatus(recordIdOrReference, status) {
  let recordId = recordIdOrReference;
  if (recordIdOrReference && !String(recordIdOrReference).startsWith('rec')) {
    const order = await getOrderByReference(recordIdOrReference);
    if (!order) throw new Error(`Order not found: ${recordIdOrReference}`);
    recordId = order.id;
  }
  return updateOrderFields(recordId, { Status: status });
}

async function markOrderPaid(recordId) {
  return updateOrderFields(recordId, { Status: 'paid' });
}

async function markOrderAwaitingPayment(recordId) {
  return updateOrderFields(recordId, { Status: 'awaiting_payment' });
}

async function getOrdersByPhone(phone, { maxRecords = 15 } = {}) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return [];

  const { data } = await axios.get(baseUrl(), {
    headers: headers(),
    params: {
      filterByFormula: `FIND("${escapeFormula(normalizedPhone)}", {BuyerPhone})`,
      maxRecords
    }
  });

  return data.records.map(mapRecord);
}

function formatOrdersForWhatsApp(orders) {
  if (!orders || orders.length === 0) {
    return "You don't have any orders yet. Send something like \"I need 50kg rice\" to find vendors!";
  }

  const statusEmoji = {
    pending: '⏳',
    awaiting_payment: '💳',
    paid: '✅',
    cancelled: '❌'
  };

  const lines = ['📦 *Your GoToMart Orders*', ''];

  orders.slice(0, 8).forEach((o, i) => {
    const emoji = statusEmoji[o.Status] || '•';
    const qty = o.Quantity ? `${o.Quantity} ` : '';
    const price = o.Price != null ? `₦${Number(o.Price).toLocaleString()}` : '';
    lines.push(`${i + 1}. ${emoji} *${o.Item || 'Item'}* (${qty}${price})`);
    lines.push('   Ref: `' + (o.Reference || o.id) + '` · ' + (o.Status || 'unknown'));
    if (o.Status === 'paid' && o.Pin) {
      lines.push(`   PIN: *${o.Pin}* (show to vendor on handover)`);
    }
    if (o.Status === 'pending' || o.Status === 'awaiting_payment') {
      lines.push('   Reply with this number or ref to continue payment');
    }
    lines.push('');
  });

  const paid = orders.filter((o) => o.Status === 'paid');
  if (paid.length) lines.push(`✅ Paid orders: ${paid.length}`);
  const open = orders.filter((o) => o.Status === 'pending' || o.Status === 'awaiting_payment');
  if (open.length) lines.push(`⏳ Open orders: ${open.length}`);

  return lines.join('\n').trim();
}

module.exports = {
  createOrder,
  getOrderByReference,
  updateOrderFields,
  updateOrderStatus,
  markOrderPaid,
  markOrderAwaitingPayment,
  getOrdersByPhone,
  formatOrdersForWhatsApp
};
