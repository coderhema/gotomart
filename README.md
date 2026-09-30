# GoToMart

<img width="1600" height="898" alt="gtm-hero" src="https://github.com/user-attachments/assets/4443f2db-b7a2-4d76-8a40-a90811964e8b" />

A WhatsApp-native Agent marketplace connecting buyers with local vendors.

## System architecture

GoToMart is a WhatsApp-native commerce bot. Buyers chat to find local vendors, select one, pay via BACHs, and receive a handover PIN. Vendors can onboard through the same chat. Airtable is the system of record; Baileys keeps a live WhatsApp Web socket (primary channel).

```text
                    +------------------+
                    |  Buyer WhatsApp  |
                    +--------+---------+
                             |
                             | messages
                             v
               +-------------+--------------+
               | Baileys socket             |
               | src/services/twilioService |
               +-------------+--------------+
                             |
                             v
               +-------------+--------------+
               | Express app src/index.js   |
               | handleTextMessage          |
               +--+------+------+------+----+
                  |      |      |      |
         +--------+  +---+  +---+  +---+--------+
         |           |      |      |            |
         v           v      v      v            v
  decisionService  conversation  commerce   payment /
  + cerebras       Service       Engine     whatsappPayment
         |           |      |      |            |
         +-----+-----+------+------+------------+
               |
               v
    +----------+-----------+        +------------------+
    | Airtable             |        | BACHs            |
    | Vendors / Sessions / |        | checkout_url     |
    | Orders               |        | webhooks /payout |
    +----------------------+        +--------+---------+
                                             |
                                             v
                                    POST /webhook
                                    mark order paid
                                    send PIN via WhatsApp
```

### Buy flow (runtime)

1. Inbound WhatsApp text (or interactive button/list) hits Baileys.
2. `handleTextMessage` routes via conversation + decision services (JEV) and optional Cerebras.
3. Buy intent with item + location -> `airtableService.findVendors`.
4. Vendor shortlist sent (text and/or interactive list).
5. User selects vendor (`1` or list row) -> `orderService.createOrder` (Status `pending`, PIN).
6. `paymentService.createCheckoutLink` returns BACHs `checkout_url`.
7. Buyer pays; BACHs calls `POST /webhook` (or `/paystack/webhook`).
8. Order marked `paid`; buyer (and vendor when possible) get PIN via WhatsApp.

### Sell flow (runtime)

1. Seller intent (`I want to sell`) enters onboarding.
2. Collect shop / product / price / location / bank details over chat.
3. Vendor row written via `vendorService` into Airtable Vendors.

### Core components

| Layer | Path | Role |
|-------|------|------|
| HTTP + webhooks | `src/index.js` | Express, Meta verify, BACHs webhooks, Baileys bootstrap, message handler |
| WhatsApp transport | `src/services/twilioService.js` | Baileys connect, `sendText`, vendor lists |
| UI components | `src/services/whatsappComponents.js` | Buttons, lists, interactive parse |
| Routing | `src/services/decisionService.js`, `conversationService.js`, `commerceEngine.js` | Intent, state, buy/sell machine |
| AI | `src/services/cerebrasService.js` | Intent / conversation assist |
| Data | `airtableService.js`, `orderService.js`, `sessionService.js`, `vendorService.js` | Vendors, orders, sessions |
| Payments | `paymentService.js`, `whatsappPaymentService.js` | Checkout, signature verify, payouts, in-chat pay UX |
| Product intel | `productIntelligence.js`, `tinyfishService.js` | Optional price/market helpers |
| Landing | `landing/` | Marketing site (Vite/React), deployable separately |

### Data stores (Airtable)

**Vendors:** Name, Item, Location, Price, Rating, Verified, Phone, UID, BankDetails (optional).

**Orders:** Reference, BuyerPhone, VendorId, VendorPhone, Item, Quantity (**text**), Price, Pin, Status (`pending` | `paid`).

**Sessions:** multi-turn chat state per phone.

### HTTP surface

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Health |
| GET | `/webhook` | Meta subscription verify |
| POST | `/webhook` | BACHs payment events |
| POST | `/paystack/webhook` | Legacy alias -> same paid handler |
| POST | `/test/simulate-message` | Dev only if `ENABLE_LIVE_TEST=1` |

### Design notes

- **Primary WhatsApp path is Baileys** (linked device). Meta/Twilio env vars remain for backup or hybrid setups.
- Baileys needs an **always-on Node process** and durable `baileys_auth/` (gitignored). Pure serverless is a poor fit for the socket.
- Vendor match is keyword/location text in Airtable (no live GPS in MVP).
- BACHs checkout uses `BACHS_PRODUCT_ID` and returns `checkout_url`.

---

## Deployment

### Prerequisites

- Node.js 18+
- Airtable base (Vendors, Sessions, Orders)
- BACHs API key + webhook secret + product id
- Cerebras API key
- Spare WhatsApp number recommended for the bot
- Always-on host for the bot (VPS, Railway, Render, Fly, etc.)
- Optional: Vercel (or static host) for `landing/` only

### 1. Configure environment

```bash
git clone https://github.com/coderhema/gotomart.git
cd gotomart
cp .env.example .env
npm install
```

Fill at least:

| Variable | Purpose |
|----------|---------|
| `AIRTABLE_BASE_ID` / `AIRTABLE_API_KEY` | Data plane |
| `AIRTABLE_*_TABLE` | Table names (defaults Vendors/Sessions/Orders) |
| `BACHS_API_KEY` / `BACHS_WEBHOOK_SECRET` | Payments + webhook HMAC |
| `BACHS_PRODUCT_ID` | Checkout product in BACHs |
| `CEREBRAS_API_KEY` | AI routing / replies |
| `BASE_URL` | Public https origin (return URLs + webhook base) |
| `PORT` | Default `3000` |
| `META_*` / `TWILIO_*` | Optional alternate channels |

Create a BACHs product once (sandbox example):

```bash
curl -X POST "https://sandbox-api.bachs.io/v1/products" \
  -H "Authorization: Bearer $BACHS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"GoToMart Default","description":"Marketplace checkout","price":{"amount":45000,"currency":"NGN"}}'
```

Set `BACHS_PRODUCT_ID` to the returned `id`.

### 2. Run the bot (local)

```bash
npm start
# or
npm run dev
```

1. Scan Baileys QR: WhatsApp -> Settings -> Linked Devices -> Link a Device.
2. Health: `curl http://localhost:3000/`
3. Message the linked number: `I need rice in Ikorodu` then `1`.

### 3. Production bot host

```bash
npm install --omit=dev
# set production .env on the server only (never commit)
npm start
# or pm2:
# pm2 start src/index.js --name gotomart && pm2 save && pm2 startup
```

- Put nginx/Caddy TLS in front of `PORT`.
- Set `BASE_URL=https://api.yourdomain.com`.
- Persist and back up `baileys_auth/` privately.
- One bot instance per WhatsApp number (avoid multi-host Baileys conflict).

### 4. Webhooks

In BACHs dashboard:

```text
https://api.yourdomain.com/webhook
```

Use the same secret as `BACHS_WEBHOOK_SECRET`. Accepted headers: `x-bachs-signature`, `x-webhook-signature`.

Local webhook testing needs a tunnel (e.g. ngrok) and matching `BASE_URL`.

### 5. Landing page (optional)

```bash
npm run build:landing
# or deploy the landing/ workspace to Vercel
```

Keep the **bot** on always-on Node; the landing site can be static.

### 6. Verify after deploy

```bash
# purchase path (Airtable + BACHs)
npm run test:purchase

# greeting / help / paid webhook (dev inject)
npm run start:live-test   # ENABLE_LIVE_TEST=1
# other terminal:
npm run test:live-golden
```

Phone checklist: [TESTING_WHATSAPP.md](./TESTING_WHATSAPP.md)  
Full runbook: [WHATSAPP_DEPLOYMENT.md](./WHATSAPP_DEPLOYMENT.md)  
Release history: [RELEASE_NOTES.md](./RELEASE_NOTES.md)

**Production:** do not leave `ENABLE_LIVE_TEST=1` enabled on a public host without protection.

### 7. Post-deploy checklist

- [ ] `GET /` healthy
- [ ] Baileys connected (no QR loop)
- [ ] Buyer search returns Airtable vendors
- [ ] Order row `pending` + PIN
- [ ] Checkout URL opens BACHs
- [ ] Webhook marks order `paid`
- [ ] `npm run test:purchase` green against intended env
- [ ] Secrets and `baileys_auth/` not in git

---

## Project Structure

```
gotomart/
├── src/                          # Backend API source code
│   ├── index.js                  # Main Express server & webhooks
│   ├── services/                 # Business logic services
│   │   ├── airtableService.js    # Database operations
│   │   ├── cerebrasService.js    # AI/LLM integration
│   │   ├── orderService.js       # Order management
│   │   ├── paymentService.js    # Payment processing
│   │   ├── sessionService.js     # User session state
│   │   ├── vendorService.js      # Vendor onboarding
│   │   ├── whatsappService.js    # Meta WhatsApp API
│   │   └── ...
│   └── utils/                    # Utility functions
│       ├── classify.js           # Intent classification
│       ├── errors.js             # Error handling
│       └── pin.js                # PIN generation
│
├── tests/                        # Test files
│   ├── test_integration.js
│   ├── test_webhook.js
│   └── ...
│
├── landing/                      # React + Vite + Tailwind landing page
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── main.jsx              # Entry point
│       ├── App.jsx               # Main app component
│       ├── index.css             # Global styles + Tailwind
│       └── components/           # React components
│           ├── Navigation.jsx
│           ├── Hero.jsx
│           ├── ChatDemo.jsx
│           ├── Features.jsx
│           ├── HowItWorks.jsx
│           ├── ForVendors.jsx
│           ├── ForBuyers.jsx
│           └── Footer.jsx
│
├── package.json                  # Root package.json
├── .env                          # Environment variables
├── .env.example                  # Environment template
└── README.md
```

## Quick Start

### Backend API

```bash
# Install dependencies
npm install

# Run in development mode (with auto-reload)
npm run dev

# Run in production mode
npm start
```

### Landing Page

```bash
# Install landing page dependencies
npm run postinstall

# Start Vite dev server
npm run dev:landing

# Build for production
npm run build:landing

# Preview production build
npm run preview:landing
```

## Scripts

```bash
npm start                 # bot (Baileys + Express)
npm run dev               # bot with --watch
npm run start:live-test   # bot with ENABLE_LIVE_TEST=1 inject route
npm test                  # integration diagnostics
npm run test:purchase     # E2E purchase path (Airtable + BACHs)
npm run test:live-golden  # live G1/G2/G7 checks
npm run test:all          # integration + purchase
npm run dev:landing       # landing dev server
npm run build:landing     # build landing
npm run lint              # eslint src/
```


## Tech Stack

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **AI/ML:** Cerebras Cloud SDK
- **Database:** Airtable
- **Payments:** BACHs
- **Messaging:** Meta WhatsApp Cloud API

### Landing Page
- **Framework:** React 18
- **Build Tool:** Vite 5
- **Styling:** Tailwind CSS
- **Icons:** Lucide React

## Environment Setup

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required keys:
- `META_PHONE_NUMBER_ID` - WhatsApp Business account ID
- `META_ACCESS_TOKEN` - Meta API token
- `META_VERIFY_TOKEN` - Webhook verification token
- `CEREBRAS_API_KEY` - Cerebras inference API key
- `AIRTABLE_BASE_ID` - Airtable base ID
- `BACHS_API_KEY` - Payment provider API key

## Original

A WhatsApp-native AI agent, not a browsable marketplace. One WhatsApp number
routes two different flows based on who's talking:

- **Buyers** ask for an item in plain text → get a top-3 vendor list →
  tap one → pay → receive a PIN.
- **Vendors** message in with intent to sell → GoToMart walks them through
  a short onboarding conversation → they're listed.
- When a buyer pays, GoToMart notifies the vendor with the buyer's contact
  details so they can arrange delivery, and gives the buyer a PIN to confirm
  handover.

## 1. Strategy: Forward Products Instead of Scraping

Since Meta's API does not allow programmatic scraping of another user's WhatsApp Business Catalog, GoToMart uses a native workaround: **instructing vendors to forward products directly from their catalog.**

This action forces WhatsApp to deliver perfectly structured JSON containing the product details directly to the webhook, completely bypassing the need for AI plain-text parsing.

### Onboarding Prompt
> *"Welcome to GoToMart! To add an item to your store, open your WhatsApp Business Catalog, tap on the product, and use the **Forward** button to send it directly to this chat."*

### Webhook Implementation

When a product is forwarded, the webhook receives an `interactive` message with type `product`. Add this logic to your POST `/webhook` route:

```javascript
// Inside your webhook POST handler
const incomingMessage = req.body.entry[0].changes[0].value.messages[0];

// 1. Catch forwarded catalog items
if (incomingMessage.type === "interactive" && incomingMessage.interactive.type === "product") {
    const productInfo = incomingMessage.interactive.product;
    const vendorPhone = incomingMessage.from;
    
    console.log("Received Product JSON:", productInfo);
    
    // Extract product details (e.g., price, name, retailer_id)
    // Map and save directly to the Airtable 'Vendors' table

// 2. Fallback for casual text input
} else if (incomingMessage.type === "text") {
    // Process plain-text items using Cerebras AI
    const plainText = incomingMessage.text.body;
}
```

## 2. Setup

```bash
npm install
cp .env.example .env   # fill in your real keys
npm run dev             # runs on http://localhost:3000
```

## 3. Airtable schema

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

Seed 5-8 rows manually before building anything else - you can't test
routing against an empty table.

**Sessions** (conversation state - replaces Redis for this MVP)
| Field | Type |
|---|---|
| Phone | Single line text |
| State | Single line text |
| Data | Long text (JSON) |
| UpdatedAt | Date |

**Orders**
| Field | Type |
|---|---|
| Reference | Single line text (also used as the Bachs checkout reference) |
| BuyerPhone | Single line text |
| VendorId | Single line text |
| VendorPhone | Single line text |
| Item | Single line text |
| Quantity | Single line text |
| Price | Number |
| Pin | Single line text |
| Status | Single line text (`pending` / `paid`) |

## 4. Test locally without waiting on Meta

**Buyer text in:**
```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"entry":[{"changes":[{"value":{"messages":[{"from":"2348000000000","type":"text","text":{"body":"I need a 50kg bag of rice in Ikorodu"}}]}}]}]}'
```

**Vendor onboarding - send this a few times in sequence, same `from` number:**
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

**Simulate a Bachs payment webhook** (collection.succeeded):
```bash
curl -X POST http://localhost:3000/bachs-webhook -H "Content-Type: application/json" \
  -H "x-bachs-signature: (use BACHS_WEBHOOK_SECRET from .env to generate)" \
  -d '{"type":"collection.succeeded","data":{"checkout_session_id":"chk_...","reference":"PASTE_REFERENCE_HERE","amount":"45000.00","currency":"NGN"}}'
```
Signature verification means you can't easily fake this one locally - the
fastest way to test the payment confirmation branch is to use Bachs sandbox
and their test webhooks, with your Vercel URL + `/bachs-webhook`
registered as the webhook in your Bachs dashboard.

While iterating, comment out the `axios.post` calls in `whatsappService.js`
and `console.log` the payload instead - much faster than round-tripping
through Meta every time.

## 5. Deploy

```bash
npm i -g vercel
vercel --prod
```

- **Meta App Dashboard** → WhatsApp → Configuration: set webhook URL to
  `https://your-app.vercel.app/webhook`, same verify token as `.env`. Add
  your phone number as a test recipient.
- **Bachs Dashboard** → Webhooks: set webhook URL to
  `https://your-app.vercel.app/bachs-webhook`, use the BACHS_WEBHOOK_SECRET
  from your `.env`.
- **Airtable**: Ensure Vendors, Sessions, Orders tables exist
- **Cerebras**: Ensure CEREBRAS_API_KEY is set up

## 6. Known MVP shortcuts (intentional)

- **Groups are out of scope for the demo.** WhatsApp's Cloud API groups
  support requires an Official Business Account, caps groups at 8
  participants, and has no endpoint to add the bot to a group (invite-link
  only). Unless you already have OBA status, build and demo the DM flow only.
- **Vendor detection is keyword-based**, with a best-effort check for any
  business-profile-shaped field Meta happens to send (`utils/classify.js`).
  There's no reliable "this sender is a WhatsApp Business account" flag in
  the Cloud API webhook.
- **Bachs payout requires vendor verification.** Bachs may require KYC for
  payout destinations. For MVP, test with verified accounts only.
- **Bank code mapping limited.** The app has a small bank code mapping;
  add more Nigerian bank codes for production.
- **No GeoJSON.** Vendors matched by location name (`Ikorodu`) not coordinates.

## 7. Step-by-step TODO (Get Live)

### Phase 1: Setup Accounts (≈ 2-3 days)

- [ ] **Sign up for Cerebras** (https://cloud.cerebras.ai) → Get API key
- [ ] **Sign up for Bachs** (https://bachs.io) → Get sandbox API key + webhook secret
- [ ] **Create product in Bachs dashboard**: `prod_gotomart_default` (price: `0` for dynamic pricing)
- [ ] **Create Meta WhatsApp app** (https://developers.facebook.com) → Get META tokens 
- [ ] **Sign up for Airtable** → Create base with Vendors, Sessions, Orders tables

### Phase 2: Local Testing (≈ 1 day)

- [ ] **Setup `.env`**
  ```
  CEREBRAS_API_KEY=your_key
  BACHS_API_KEY=sk_sandbox_...
  BACHS_WEBHOOK_SECRET=...
  META_PHONE_NUMBER_ID=...
  META_ACCESS_TOKEN=...
  META_VERIFY_TOKEN=...
  AIRTABLE_*=...
  ```
- [ ] **Seed Airtable** with 5-8 test vendors
- [ ] **Test buyer flow**: `curl -X POST http://localhost:3000/webhook ...` (see Section 3)
- [ ] **Test vendor onboarding**: `curl -X POST http://localhost:3000/webhook ...`
- [ ] **Test checkout flow**: Vendor picks vendor → get Bachs checkout link

### Phase 3: Deploy & Go Live (≈ 1 day)

- [ ] **Deploy to Vercel**: `npm i -g vercel && vercel --prod`
- [ ] **Configure Meta webhook**: Add Vercel URL to WhatsApp config
- [ ] **Configure Bachs webhook**: Add `https://your-app.vercel.app/bachs-webhook` as webhook
- [ ] **Test end-to-end on WhatsApp**: Real messages, real Bachs sandbox payments
- [ ] **Verify vendor payout flow**: Money → vendor bank account via Bachs transfers

### Phase 4: Production Polish

- [ ] **Switch Bachs to live keys** (after testing in sandbox)
- [ ] **Add more Nigerian bank codes** in `paymentService.js`
- [ ] **Implement retry logic** for failed Bachs payouts
- [ ] **Add error tracking** (Sentry/Logflare)
- [ ] **Add analytics** (how many buyers/vendors, conversion rate)

**Timeline**: 4-5 days total to MVP → Live

### Tech Stack

| Component | Technology | Purpose |
|---|---|---|
| **AI Parsing** | Cerebras (`gpt-oss-120b`) | Parse buyer text, vendor catalogs |
| **Payments** | Bachs | Marketplace checkout + vendor payouts |
| **Database** | Airtable | Vendors, Sessions, Orders |
| **Messaging** | Meta WhatsApp Cloud API | Buyer/Vendor chat interface |
| **Backend** | Node/Express | Webhook handling, business logic |
| **Hosting** | Vercel | Serverless deployment |

## Release notes

See [RELEASE_NOTES.md](./RELEASE_NOTES.md) for versioned change summaries.

## Test on WhatsApp

See [TESTING_WHATSAPP.md](./TESTING_WHATSAPP.md) for the full phone testing guide (link device, buyer chat script, Airtable checks).
