const axios = require('axios');

/**
 * Lightweight conversation state, kept in an Airtable "Sessions" table
 * instead of Redis — one row per phone number. This is what makes
 * multi-turn vendor onboarding possible on Vercel's stateless functions
 * without adding new infra.
 *
 * Sessions table fields: Phone (text, primary), State (text), Data (long text, JSON), UpdatedAt (date)
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

async function getSession(phone) {
  const { data } = await axios.get(baseUrl(), {
    headers: headers(),
    params: { filterByFormula: `{Phone} = "${phone}"`, maxRecords: 1 }
  });
  const record = data.records[0];
  if (!record) return { phone, state: 'idle', data: {}, recordId: null };

  let parsedData = {};
  try { parsedData = JSON.parse(record.fields.Data || '{}'); } catch { /* ignore */ }

  return {
    phone,
    state: record.fields.State || 'idle',
    data: parsedData,
    recordId: record.id
  };
}

async function setSession(session) {
  const fields = {
    Phone: session.phone,
    State: session.state,
    Data: JSON.stringify(session.data || {}),
    UpdatedAt: new Date().toISOString()
  };

  if (session.recordId) {
    await axios.patch(`${baseUrl()}/${session.recordId}`, { fields }, { headers: headers() });
  } else {
    await axios.post(baseUrl(), { fields }, { headers: headers() });
  }
}

async function clearSession(session) {
  return setSession({ ...session, state: 'idle', data: {} });
}

module.exports = { getSession, setSession, clearSession };
