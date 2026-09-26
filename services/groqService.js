const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const INTENT_PROMPT = `You extract structured shopping intent from a buyer's WhatsApp message.
Return ONLY valid JSON, no prose, no markdown fences, matching this exact shape:
{"item": string, "quantity": string, "location": string}

- "item": the product being requested, simplified and singular (e.g. "rice", "tomatoes", "cooking gas").
- "quantity": the amount/unit as stated (e.g. "50kg bag", "2 crates"). If not stated, use "".
- "location": the delivery area/neighborhood mentioned (e.g. "Ikorodu", "Yaba"). If not stated, use "".

If the message is not a shopping request, return {"item": "", "quantity": "", "location": ""}.
Never include any text outside the JSON object.`;

const CATALOG_PROMPT = `You extract vendor listing info from a shop owner's WhatsApp message during onboarding.
Return ONLY valid JSON, no prose, no markdown fences, matching this exact shape:
{"shopName": string, "item": string, "price": number, "location": string}

- "shopName": the business/shop name mentioned. If not stated, use "".
- "item": the primary product being listed, simplified and singular.
- "price": the price as a plain number in Naira, no currency symbol or commas. If not stated, use 0.
- "location": the shop's area/neighborhood. If not stated, use "".
Never include any text outside the JSON object.`;

async function callJson(systemPrompt, userText) {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userText }
    ]
  });

  const raw = completion.choices?.[0]?.message?.content || '{}';
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error('Groq returned unparseable JSON:', raw);
    return null;
  }
}

async function parseIntent(text) {
  const parsed = await callJson(INTENT_PROMPT, text);
  if (!parsed) return null;
  return {
    item: (parsed.item || '').trim(),
    quantity: (parsed.quantity || '').trim(),
    location: (parsed.location || '').trim()
  };
}

async function parseVendorCatalog(text) {
  const parsed = await callJson(CATALOG_PROMPT, text);
  if (!parsed) return null;
  return {
    shopName: (parsed.shopName || '').trim(),
    item: (parsed.item || '').trim(),
    price: Number(parsed.price) || 0,
    location: (parsed.location || '').trim()
  };
}

module.exports = { parseIntent, parseVendorCatalog };
