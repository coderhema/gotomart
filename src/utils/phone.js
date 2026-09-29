/**
 * Normalize WhatsApp JIDs / phone strings for Airtable storage and lookups.
 * Examples:
 *   "2348012345678@s.whatsapp.net" → "2348012345678"
 *   "123:2348012345678@lid" → "2348012345678"
 *   "+234 801 234 5678" → "2348012345678"
 */
function normalizePhone(phone) {
  if (phone == null) return '';
  let value = String(phone).trim();
  value = value.replace(/@.*$/, '');
  value = value.replace(/^\d+:/, '');
  value = value.replace(/[^\d]/g, '');
  return value;
}

/**
 * Build a WhatsApp JID for outbound sends when only digits are known.
 */
function toWhatsAppJid(phoneOrJid) {
  if (!phoneOrJid) return '';
  const raw = String(phoneOrJid).trim();
  if (raw.includes('@')) return raw;
  const digits = normalizePhone(raw);
  return digits ? `${digits}@s.whatsapp.net` : '';
}

module.exports = { normalizePhone, toWhatsAppJid };
