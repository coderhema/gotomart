const axios = require('axios');
const crypto = require('crypto');

function baseUrl() {
  const table = process.env.AIRTABLE_VENDORS_TABLE || 'Vendors';
  return `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`;
}

function headers() {
  return {
    Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json'
  };
}

function generateVendorUid(phone) {
  // Short, stable, non-guessable id tied to the vendor's phone number —
  // used as part of the payment reference so GoToMart can trace a payment
  // back to a vendor without a lookup table.
  return crypto.createHash('sha1').update(phone).digest('hex').slice(0, 10);
}

/**
 * Vendors table fields (in addition to the buyer-search fields already used
 * by airtableService.js — Name, Item, Location, Price, Rating, Verified):
 * Phone, UID, BankName, BankAccountNumber, BankAccountName
 */
async function createVendor(vendorPayload) {
  const { data } = await axios.post(baseUrl(), { fields: vendorPayload }, { headers: headers() });
  return data;
}

module.exports = { generateVendorUid, createVendor };
