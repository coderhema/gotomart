/**
 * Extended Product Patterns for Supermarket Items
 * Expands recognition beyond produce to clothing, electronics, etc.
 */

// Food & Groceries
const FOOD_PATTERNS = [
  /\b(rice|beans|garri|tomatoes|pepper|onions|oil|flour|sugar|yam|plantain|meat|fish|chicken|eggs)\b/i,
  /\b(semo|wheat|oat|corn|millet|sorghum|fonio)\b/i,
  /\b(turkey|beef|goat|pork|liver|kidney|tripe|bush\s*meat|snail)\b/i,
  /\b(wine|juice|water|milk|malt|soft\s*drink|soda|beer|spirit)\b/i,
  /\b(biscuit|crackers|chips|popcorn|nuts|groundnut|cashew|almond)\b/i,
  /\b(bread|bun|cake|pie|donut|cookie|snack)\b/i,
  /\b(noodles|indomie|spaghetti|macaroni|pasta|couscous)\b/i,
  /\b(cereal|oats|milo|bournvita|cerelac|nutri\s*milk|three\s*crowns)\b/i,
  /\b(fruit|apple|orange|banana|mango|pineapple|watermelon|papaya|pawpaw)\b/i,
  /\b(vegetable|cabbage|lettuce|cucumber|okra|spinach|ugwu|efo|gboma)\b/i
];

// Oils & Condiments
const CONDIMENT_PATTERNS = [
  /\b(vegetable\s*oil|palm\s*oil|olive\s*oil|groundnut\s*oil|coconut\s*oil)\b/i,
  /\b(salt|sugar|maggi|knorr|cube|seasoning|crayfish|spice|curry|thyme)\b/i,
  /\b(tomato\s*paste|tomato\s*sauce|ketchup|mayonnaise|butter|margarine)\b/i,
  /\b(vinegar|stock|granules|bouillon|broth)\b/i
];

// Household & Cleaning
const HOUSEHOLD_PATTERNS = [
  /\b(soap|detergent|bleach|disinfectant|spray)\b/i,
  /\b(insecticide|air\s*freshener|insect\s*repellent)\b/i,
  /\b(toilet\s*paper|tissue|serviette|napkin|paper\s*towel)\b/i,
  /\b(broom|mop|brush|sponge|scouring\s*pad|duster)\b/i,
  /\b(bucket|jug|basin|container|cooler)\b/i,
  /\b(nylon|bag|wrap|foil|plastic|packaging)\b/i
];

// Kitchen & Cookware
const KITCHEN_PATTERNS = [
  /\b(plate|cup|bowl|spoon|fork|knife|cutlery|utensil)\b/i,
  /\b(pot|pan|kettle|stove|gas|cooker|burner)\b/i,
  /\b(blender|mixer|grinder|processor|juicer)\b/i,
  /\b(thermos|flask|cooler|fridge|freezer)\b/i
];

// Personal Care & Beauty
const PERSONAL_CARE_PATTERNS = [
  /\b(shampoo|conditioner|relaxer|weave|wig|attachment|braid)\b/i,
  /\b(cream|lotion|body\s*lotion|face\s*cream|pomade)\b/i,
  /\b(perfume|deo|roll\s*on|spray|talcum\s*powder|powder)\b/i,
  /\b(toothpaste|toothbrush|mouthwash|dental)\b/i,
  /\b(soap|body\s*wash|shower\s*gel|bathing\s*soap)\b/i,
  /\b(make\s*up|lipstick|eyeliner|mascara|foundation|concealer|blush)\b/i
];

// Baby & Kids
const BABY_PATTERNS = [
  /\b(diaper|nappy|pampers|huggies|molfix|wipes|baby\s*wipe)\b/i,
  /\b(baby\s*food|formula|infant\s*milk|cerelac|cereal)\b/i,
  /\b(baby\s*oil|baby\s*lotion|baby\s*powder|baby\s*soap|baby\s*shampoo)\b/i,
  /\b(feeding\s*bottle|sippy\s*cup|bib|pacifier)\b/i
];

// Clothing & Fashion
const CLOTHING_PATTERNS = [
  /\b(shirt|trouser|pant|jeans|dress|skirt|gown|blouse)\b/i,
  /\b(material|fabric|lace|ankara|aso\s*oke|gele|wrapper)\b/i,
  /\b(bag|handbag|backpack|sling\s*bag|purse|clutch)\b/i,
  /\b(shoe|slipper|sandal|sneaker|boot|heel|flat)\b/i,
  /\b(watch|jewelry|earring|necklace|ring|bracelet|bangle)\b/i,
  /\b(belt|tie|scarf|cap|hat|head\s*wrap|turban)\b/i,
  /\b(wallet|card\s*holder|pouch|small\s*bag)\b/i
];

// Electronics & Appliances
const ELECTRONICS_PATTERNS = [
  /\b(phone|mobile|smartphone|iphone|samsung|tecno|infinix|itel)\b/i,
  /\b(charger|cable|usb|earphone|headphone|earbud|bluetooth)\b/i,
  /\b(power\s*bank|battery|mouse|keyboard|laptop|computer)\b/i,
  /\b(television|tv|radio|speaker|home\s*theatre|sound\s*system)\b/i,
  /\b(tablet|ipad|kindle|e-reader)\b/i
];

// Home Appliances
const APPLIANCE_PATTERNS = [
  /\b(iron|pressing\s*iron|steam\s*iron|dry\s*iron)\b/i,
  /\b(kettle|electric\s*kettle|water\s*heater)\b/i,
  /\b(fan|standing\s*fan|ceiling\s*fan|table\s*fan)\b/i,
  /\b(bulb|light|lamp|torch|flashlight|lantern)\b/i,
  /\b(blender|mixer|grinder|toaster|microwave)\b/i
];

// Stationery & Office
const STATIONERY_PATTERNS = [
  /\b(book|notebook|exercise\s*book|textbook|note)\b/i,
  /\b(pen|pencil|biro|marker|highlighter|eraser|ruler)\b/i,
  /\b(file|folder|envelope|paper|cardboard)\b/i,
  /\b(stapler|pin|clip|glue|tape|scissors|cutter)\b/i,
  /\b(calculator|diary|agenda|planner|calendar)\b/i
];

// Health & Wellness
const HEALTH_PATTERNS = [
  /\b(vitamin|supplement|immune|boost|energy)\b/i,
  /\b(paracetamol|panadol|ibu|profen|cough|cold|pain|relief)\b/i,
  /\b(first\s*aid|bandage|plaster|cotton|wool|gauze)\b/i,
  /\b(thermometer|blood\s*pressure|glucometer)\b/i,
  /\b(sanitary\s*pad|tampon|menstrual|panty\s*liner)\b/i
];

// Hardware & Tools
const HARDWARE_PATTERNS = [
  /\b(nail|screw|bolt|nut|washer|hinge|lock|key)\b/i,
  /\b(wire|cable|fuse|socket|switch|bulb\s*holder)\b/i,
  /\b(cement|paint|varnish|thinner|brush|roller)\b/i,
  /\b(tool|hammer|screwdriver|spanner|wrench|plier|cutter)\b/i,
  /\b(rope|string|twine|cord|bungee)\b/i
];

// Combine all product patterns
const ALL_PRODUCT_PATTERNS = [
  ...FOOD_PATTERNS,
  ...CONDIMENT_PATTERNS,
  ...HOUSEHOLD_PATTERNS,
  ...KITCHEN_PATTERNS,
  ...PERSONAL_CARE_PATTERNS,
  ...BABY_PATTERNS,
  ...CLOTHING_PATTERNS,
  ...ELECTRONICS_PATTERNS,
  ...APPLIANCE_PATTERNS,
  ...STATIONERY_PATTERNS,
  ...HEALTH_PATTERNS,
  ...HARDWARE_PATTERNS
];

// Category mapping for detected items
const CATEGORY_MAP = {
  // Food & Groceries
  'rice': 'grains', 'beans': 'grains', 'garri': 'grains', 'semo': 'grains',
  'tomatoes': 'produce', 'pepper': 'produce', 'onions': 'produce', 'yam': 'produce',
  'plantain': 'produce', 'vegetable': 'produce', 'fruit': 'produce',
  'chicken': 'protein', 'beef': 'protein', 'goat': 'protein', 'fish': 'protein',
  'turkey': 'protein', 'meat': 'protein', 'eggs': 'protein',
  
  // Beverages
  'water': 'beverages', 'juice': 'beverages', 'milk': 'dairy', 'wine': 'beverages',
  'beer': 'beverages', 'malt': 'beverages', 'soft drink': 'beverages',
  
  // Household
  'soap': 'household', 'detergent': 'household', 'bleach': 'household',
  'toilet paper': 'household', 'tissue': 'household', 'broom': 'household',
  'mop': 'household', 'bucket': 'household',
  
  // Personal Care
  'shampoo': 'beauty', 'cream': 'beauty', 'lotion': 'beauty', 'perfume': 'beauty',
  'deodorant': 'beauty', 'soap': 'beauty', 'make up': 'beauty',
  
  // Baby
  'diaper': 'baby', 'pampers': 'baby', 'wipes': 'baby', 'baby food': 'baby',
  'formula': 'baby',
  
  // Clothing
  'shirt': 'clothing', 'trouser': 'clothing', 'dress': 'clothing', 'skirt': 'clothing',
  'fabric': 'clothing', 'ankara': 'clothing', 'lace': 'clothing', 'aso-oke': 'clothing',
  'shoe': 'accessories', 'bag': 'accessories', 'jewelry': 'accessories',
  
  // Electronics
  'phone': 'electronics', 'charger': 'electronics', 'earphone': 'electronics',
  'laptop': 'electronics', 'television': 'electronics',
  
  // Appliances
  'iron': 'appliances', 'kettle': 'appliances', 'fan': 'appliances', 'bulb': 'appliances',
  'blender': 'appliances',
  
  // Stationery
  'book': 'stationery', 'pen': 'stationery', 'paper': 'stationery',
  
  // Health
  'vitamin': 'health', 'medicine': 'health', 'paracetamol': 'health',
  
  // Hardware
  'nail': 'hardware', 'screw': 'hardware', 'wire': 'hardware', 'paint': 'hardware'
};

/**
 * Check if text contains any product keywords
 */
function containsProductReference(text) {
  return ALL_PRODUCT_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Get category from detected keywords
 */
function detectCategory(text) {
  const normalized = text.toLowerCase();
  
  for (const [keyword, category] of Object.entries(CATEGORY_MAP)) {
    if (normalized.includes(keyword)) {
      return category;
    }
  }
  
  // Check pattern groups
  if (FOOD_PATTERNS.some(p => p.test(text))) return 'food';
  if (CLOTHING_PATTERNS.some(p => p.test(text))) return 'fashion';
  if (ELECTRONICS_PATTERNS.some(p => p.test(text))) return 'electronics';
  if (HOUSEHOLD_PATTERNS.some(p => p.test(text))) return 'household';
  if (PERSONAL_CARE_PATTERNS.some(p => p.test(text))) return 'personal_care';
  if (BABY_PATTERNS.some(p => p.test(text))) return 'baby';
  if (HEALTH_PATTERNS.some(p => p.test(text))) return 'health';
  if (HARDWARE_PATTERNS.some(p => p.test(text))) return 'hardware';
  
  return 'general';
}

module.exports = {
  containsProductReference,
  detectCategory,
  ALL_PRODUCT_PATTERNS,
  CATEGORY_MAP
};