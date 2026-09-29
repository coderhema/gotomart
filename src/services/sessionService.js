const axios = require('axios');
const { normalizePhone } = require('../utils/phone');

/**
 * Conversation state in Airtable "Sessions" table (one row per phone).
 * Fields: Phone (text), State (text), Data (long text JSON), UpdatedAt (date)
 */
function baseUrl() {
  const table = process.env.AIRTABLE_SESSIONS_TABLE || 'Sessions';
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

async function getSession(phoneOrJid) {
  const normalized = normalizePhone(phoneOrJid);
  if (!normalized) {
    return { phone: '', jid: phoneOrJid || '', state: 'idle', data: {}, recordId: null };
  }

  const formula = `OR({Phone} = "${escapeFormula(normalized)}", FIND("${escapeFormula(normalized)}", {Phone}))`;

  const { data } = await axios.get(baseUrl(), {
    headers: headers(),
    params: { filterByFormula: formula, maxRecords: 1 }
  });

  const record = data.records[0];
  if (!record) {
    return {
      phone: normalized,
      jid: String(phoneOrJid || ''),
      state: 'idle',
      data: {},
      recordId: null
    };
  }

  let parsedData = {};
  try {
    parsedData = JSON.parse(record.fields.Data || '{}');
  } catch {
    parsedData = {};
  }

  return {
    phone: normalized,
    jid: parsedData.jid || String(phoneOrJid || ''),
    state: record.fields.State || 'idle',
    data: parsedData,
    recordId: record.id,
    lastVendors: parsedData.lastVendors || null,
    lastIntent: parsedData.lastIntent || null,
    orderRef: parsedData.orderRef || null,
    paymentStep: parsedData.paymentStep || null,
    selectedVendorId: parsedData.selectedVendorId || null
  };
}

/**
 * setSession(session) or setSession(phone, partialSession)
 */
async function setSession(phoneOrSession, maybeSession) {
  let incoming;
  if (typeof phoneOrSession === 'string') {
    incoming = { ...(maybeSession || {}), phone: phoneOrSession };
  } else {
    incoming = phoneOrSession || {};
  }

  const phone = normalizePhone(incoming.phone || incoming.from || '');
  if (!phone) {
    throw new Error('setSession requires a phone');
  }

  let recordId = incoming.recordId || null;
  let existingData = {};
  try {
    const existing = await getSession(phone);
    if (!recordId) recordId = existing.recordId;
    existingData = existing.data || {};
  } catch {
    existingData = {};
  }

  const trackingKeys = [
    'jid', 'lastVendors', 'lastIntent', 'orderRef', 'paymentStep',
    'selectedVendorId', 'selectedVendorUid', 'vendorSearchTime',
    'lastItem', 'lastLocation', 'bankDetails', 'catalog'
  ];

  const mergedData = {
    ...existingData,
    ...(incoming.data && typeof incoming.data === 'object' ? incoming.data : {})
  };

  for (const key of trackingKeys) {
    if (incoming[key] !== undefined) {
      mergedData[key] = incoming[key];
    }
  }

  if (incoming.jid) mergedData.jid = incoming.jid;
  else if (incoming.phone && String(incoming.phone).includes('@')) {
    mergedData.jid = incoming.phone;
  }

  const state = incoming.state != null ? incoming.state : 'idle';

  const fields = {
    Phone: phone,
    State: state,
    Data: JSON.stringify(mergedData),
    UpdatedAt: new Date().toISOString()
  };

  if (recordId) {
    await axios.patch(`${baseUrl()}/${recordId}`, { fields }, { headers: headers() });
    return { phone, state, data: mergedData, recordId };
  }

  const { data } = await axios.post(baseUrl(), { fields }, { headers: headers() });
  return { phone, state, data: mergedData, recordId: data.id };
}

async function clearSession(sessionOrPhone) {
  if (typeof sessionOrPhone === 'string') {
    return setSession({ phone: sessionOrPhone, state: 'idle', data: {} });
  }
  return setSession({
    ...sessionOrPhone,
    state: 'idle',
    data: {},
    lastVendors: null,
    lastIntent: null,
    orderRef: null,
    paymentStep: null
  });
}

module.exports = { getSession, setSession, clearSession };
