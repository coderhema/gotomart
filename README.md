# GoToMart — MVP Backend

A WhatsApp-native AI agent, not a browsable marketplace. One WhatsApp number
routes two different flows based on who's talking:

- **Buyers** ask for an item in plain text → get a top-3 vendor list →
  tap one → pay → receive a PIN.
- **Vendors** message in with intent to sell → GoToMart walks them through
  a short onboarding conversation → they're listed.
- When a buyer pays, GoToMart notifies the vendor with the buyer's contact
  details so they can arrange delivery, and gives the buyer a PIN to confirm
  handover.

## 1. Setup

```bash
npm install
cp .env.example .env   # fill in your real keys
npm run dev             # runs on http://localhost:3000
```

## 2. Airtable schema

Three tables in one base.

**Vendors**
| Field | Type |
|---|---|
| Name | Single line text |
| Item | Single line text |
| Location | Single line text |
| Price | Number |
| Rating | Number |
| Verified | Checkbox |
| Phone | Single line text |
| UID | Single line text |
| BankDetails | Long text |

Seed 5–8 rows manually before building anything else — you can't test
routing against an empty table.

**Sessions** (conversation state — replaces Redis for this MVP)
| Field | Type |
|---|---|
| Phone | Single line text |
| State | Single line text |
| Data | Long text (JSON) |
| UpdatedAt | Date |

**Orders**
| Field | Type |
|---|---|
| Reference | Single line text (also used as the Paystack reference) |
| BuyerPhone | Single line text |
| VendorId | Single line text |
| VendorPhone | Single line text |
| Item | Single line text |
| Quantity | Single line text |
| Price | Number |
| Pin | Single line text |
| Status | Single line text (`pending` / `paid`) |

## 3. Test locally without waiting on Meta

**Buyer text in:**
```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"entry":[{"changes":[{"value":{"messages":[{"from":"2348000000000","type":"text","text":{"body":"I need a 50kg bag of rice in Ikorodu"}}]}}]}]}'
```

**Vendor onboarding — send this a few times in sequence, same `from` number:**
```bash
curl -X POST http://localhost:3000/webhook -H "Content-Type: application/json" \
  -d '{"entry":[{"changes":[{"value":{"messages":[{"from":"2348011111111","type":"text","text":{"body":"I want to sell on GoToMart"}}]}}]}]}'
# then: "YES"
# then: "GTBank, 0123456789, Iya Basira Foods"
# then: "Iya Basira Foods, rice 50kg bag, 45000, Ikorodu"
```

**Vendor list tap in** (use a real `Reference` value from your Orders table):
```bash
curl -X POST http://localhost:3000/webhook -H "Content-Type: application/json" \
  -d '{"entry":[{"changes":[{"value":{"messages":[{"from":"2348000000000","type":"interactive","interactive":{"type":"list_reply","list_reply":{"id":"PASTE_REFERENCE_HERE"}}}]}}]}]}'
```

**Simulate a Paystack payment webhook:**
```bash
curl -X POST http://localhost:3000/paystack/webhook -H "Content-Type: application/json" \
  -H "x-paystack-signature: (you'll need a real one — test this against Paystack's own test dashboard instead)" \
  -d '{"event":"charge.success","data":{"reference":"PASTE_REFERENCE_HERE"}}'
```
Signature verification means you can't easily fake this one locally — the
fastest way to test the payment confirmation branch is a real test transaction
against Paystack's sandbox, with your Vercel URL + `/paystack/webhook`
registered as the webhook in your Paystack dashboard.

While iterating, comment out the `axios.post` calls in `whatsappService.js`
and `console.log` the payload instead — much faster than round-tripping
through Meta every time.

## 4. Deploy

```bash
npm i -g vercel
vercel --prod
```

- Meta App Dashboard → WhatsApp → Configuration: set webhook URL to
  `https://your-app.vercel.app/webhook`, same verify token as `.env`. Add
  your phone number as a test recipient.
- Paystack Dashboard → Settings → API Keys & Webhooks: set webhook URL to
  `https://your-app.vercel.app/paystack/webhook`.

## 5. Known MVP shortcuts / open questions (intentional)

- **Groups are out of scope for the demo.** WhatsApp's Cloud API groups
  support requires an Official Business Account, caps groups at 8
  participants, and has no endpoint to add the bot to a group (invite-link
  only). Unless you already have OBA status, build and demo the DM flow only.
- **Meta vs Twilio isn't resolved.** This is built against the Meta Cloud
  API directly. If you're actually using Twilio's WhatsApp Sandbox (as the
  architecture diagram suggests, to skip Meta approval), the webhook payload
  shape and `whatsappService.js` need to be rewritten for Twilio's format.
- **Vendor detection is keyword-based**, with a best-effort check for any
  business-profile-shaped field Meta happens to send (`utils/classify.js`).
  There's no reliable "this sender is a WhatsApp Business account" flag in
  the Cloud API webhook.
- **No real payout automation.** Vendor bank details are collected and
  stored, but GoToMart only *notifies* the vendor of payment and buyer
  contact info — it doesn't move money to their bank account. Real payouts
  (e.g. Paystack Transfers/subaccounts) are a clear next step, not required
  for the demo.

## 6. Suggested remaining build order

1. Airtable: create the 3 tables above, seed vendors.
2. Buyer flow end-to-end locally (curl → console.log instead of real sends).
3. Vendor onboarding flow end-to-end locally.
4. Deploy to Vercel, wire the real Meta webhook, first real WhatsApp message.
5. Wire Paystack (checkout + webhook), test one real payment end-to-end.
6. Error handling pass + a couple of realistic demo run-throughs.
7. Record a demo video as a backup in case live WhatsApp flakes during judging.
