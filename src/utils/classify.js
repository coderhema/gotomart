/**
 * Best-effort routing between "this is a vendor wanting to list" and
 * "this is a buyer looking for an item". Meta's Cloud API webhook does not
 * reliably expose an "is this sender a WhatsApp Business account" flag on
 * the message itself, so keyword intent is the primary signal. Any
 * business-profile-looking field Meta does send is used as a secondary
 * boost, but never relied on alone.
 */
const VENDOR_KEYWORDS = [
  'sell', 'selling', 'vendor', 'become a vendor',
  'list my', 'list my business', 'list my shop', 'list my store',
  'register my shop', 'register my business', 'register as a vendor',
  'add my business', 'add my shop', 'onboard my', 'i own a shop',
  'i have a shop', 'i have a store'
];

function isVendorIntent(text = '') {
  const lower = text.toLowerCase();
  return VENDOR_KEYWORDS.some(kw => lower.includes(kw));
}

/**
 * Defensive check for any business-profile-shaped data Meta might include
 * on the webhook payload. Not guaranteed to be present — treat as a hint,
 * not a source of truth.
 */
function hasBusinessProfileSignal(value) {
  const contact = value?.contacts?.[0];
  return Boolean(contact?.profile?.business || contact?.profile?.category);
}

module.exports = { isVendorIntent, hasBusinessProfileSignal };
