const axios = require('axios');

function baseUrl() {
  const table = process.env.AIRTABLE_VENDORS_TABLE || 'Vendors';
  return `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`;
}

function escapeFormula(str) {
  return String(str).replace(/"/g, '\\"');
}

/**
 * Vendors table fields: Name, Item, Location, Price, Rating, Verified,
 * Phone, UID, BankName, BankAccountNumber, BankAccountName
 */
async function findVendors({ item, location }) {
  const filters = [];
  if (item) filters.push(`FIND(LOWER("${escapeFormula(item)}"), LOWER({Item}))`);
  if (location) filters.push(`FIND(LOWER("${escapeFormula(location)}"), LOWER({Location}))`);

  const formula = filters.length > 1 ? `AND(${filters.join(',')})` : (filters[0] || '');

  const { data } = await axios.get(baseUrl(), {
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` },
    params: {
      ...(formula ? { filterByFormula: formula } : {}),
      maxRecords: 20
    }
  });

  const vendors = data.records.map(r => ({
    id: r.id,
    name: r.fields.Name || 'Unnamed vendor',
    phone: r.fields.Phone || '',
    uid: r.fields.UID || '',
    price: Number(r.fields.Price) || 0,
    rating: Number(r.fields.Rating) || 0,
    verified: !!r.fields.Verified,
    item: r.fields.Item || '',
    location: r.fields.Location || ''
  }));

  // Rank: verified first, then cheapest, then highest rated
  vendors.sort((a, b) => {
    if (b.verified !== a.verified) return Number(b.verified) - Number(a.verified);
    if (a.price !== b.price) return a.price - b.price;
    return b.rating - a.rating;
  });

  return vendors.slice(0, 3);
}

module.exports = { findVendors };
