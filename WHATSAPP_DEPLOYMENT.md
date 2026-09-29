# WhatsApp Integration — Deployment Guide

This guide covers deploying GoToMart’s **chat → vendor → order → payment** path with WhatsApp (Baileys), Airtable, and BACHs.

## Architecture

```
Buyer WhatsApp
      │
      ▼
Baileys WebSocket (src/services/twilioService.js)
      │
      ▼
Message router (src/index.js)
  → conversation / decision / commerce engine
  → Airtable Vendors / Sessions / Orders
  → BACHs checkout link
      │
      ▼
Payment webhook POST /webhook → mark order paid → optional vendor payout
```

**Primary channel:** Baileys (linked WhatsApp device).  
**Optional backups:** Meta Cloud API / Twilio (env vars still supported).

---

## 1. Prerequisites

- Node.js **≥ 18**
- WhatsApp account for the bot (prefer a spare number)
- Airtable base with tables: `Vendors`, `Sessions`, `Orders`
- BACHs sandbox/production API key
- Cerebras API key (intent / conversation)
- Public HTTPS URL for webhooks (production), e.g. Vercel + always-on process for Baileys, or a VPS

> **Important:** Baileys needs a **long-lived process** and local/persistent `baileys_auth/` storage. Serverless-only hosts (default Vercel functions) are a poor fit for the WhatsApp socket. Use a VPS, Railway, Render, Fly.io, or similar for the bot process; you can still host the landing page on Vercel.

---

## 2. Environment

```bash
cp .env.example .env
```

Fill at minimum:

| Variable | Purpose |
|----------|---------|
| `AIRTABLE_BASE_ID` | Base ID |
| `AIRTABLE_API_KEY` | Personal access token with data.records read/write |
| `AIRTABLE_VENDORS_TABLE` | default `Vendors` |
| `AIRTABLE_SESSIONS_TABLE` | default `Sessions` |
| `AIRTABLE_ORDERS_TABLE` | default `Orders` |
| `BACHS_API_KEY` | Payments |
| `BACHS_WEBHOOK_SECRET` | Webhook HMAC verify |
| `BACHS_PRODUCT_ID` | Checkout product in BACHs (create once in sandbox/prod) |
| `CEREBRAS_API_KEY` | AI routing / replies |
| `PORT` | default `3000` |
| `BASE_URL` | Public base URL (return/cancel URLs + webhook base) |
| `META_VERIFY_TOKEN` | Only if using Meta verify on `GET /webhook` |

Do **not** commit `.env` or `baileys_auth/`.

### Airtable field expectations

**Vendors:** `Name`, `Item`, `Location`, `Price`, `Rating`, `Verified`, `Phone`, `UID` (optional bank fields).

**Orders:** `Reference`, `BuyerPhone`, `VendorId`, `VendorPhone`, `Item`, `Quantity` (**text**, e.g. `1 bag` / `50kg`), `Price`, `Pin`, `Status` (`pending` \| `paid`).

**Sessions:** used by `sessionService` for multi-turn chat state.

### BACHs product (one-time)

If `prod_gotomart_default` does not exist, create a product:

```bash
curl -X POST "https://sandbox-api.bachs.io/v1/products" \
  -H "Authorization: Bearer $BACHS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"GoToMart Default","description":"Marketplace checkout","price":{"amount":45000,"currency":"NGN"}}'
```

Set `BACHS_PRODUCT_ID` to the returned `id` (e.g. `prod_…`).  
Checkout sessions return `checkout_url` (handled in `paymentService.js`).

---

## 3. Local run (WhatsApp link)

```bash
npm install
npm start
# or
npm run dev
```

1. On first boot, Baileys prints a **QR code** in the terminal.
2. Phone → WhatsApp → **Settings → Linked Devices → Link a Device**.
3. Scan the QR. Session is saved under `baileys_auth/` (gitignored).
4. Health check: `GET http://localhost:3000/`  
5. Meta-style verify (if used):  
   `GET /webhook?hub.mode=subscribe&hub.verify_token=<META_VERIFY_TOKEN>&hub.challenge=test`

### Manual buyer test

Message the linked number:

| You send | Expected |
|----------|----------|
| `I need rice in Ikorodu` | Ranked vendors from Airtable |
| `1` | Select first vendor / checkout path |
| Payment link | BACHs sandbox checkout URL |
| After pay webhook | Order `Status` → `paid` |

### Automated purchase path test

```bash
node tests/test_purchase_flow.js
```

Covers: session → vendor search → order write → checkout URL → Airtable read-back.

---

## 4. Production deployment (recommended: always-on Node host)

### 4.1 Prepare host

- Ubuntu 22.04+ (or similar)
- Node 18+
- Process manager: **pm2** or systemd
- Reverse proxy: nginx/Caddy with TLS
- Disk persistence for `baileys_auth/`

```bash
git clone <your-repo-url> gotomart
cd gotomart
npm install --omit=dev
cp .env.example .env   # fill secrets on the server only
```

### 4.2 Process manager (pm2 example)

```bash
npm install -g pm2
pm2 start src/index.js --name gotomart
pm2 save
pm2 startup
```

After deploy/reboot, if auth is still valid you should **not** need to re-scan QR. If QR appears again, scan once from a secure console session.

### 4.3 Public URL & webhooks

Point DNS to the host. Set:

```env
BASE_URL=https://api.yourdomain.com
PORT=3000
```

Expose:

| Method | Path | Role |
|--------|------|------|
| `GET` | `/` | Health |
| `GET` | `/webhook` | Meta verify (optional) |
| `POST` | `/webhook` | BACHs payment events |
| `POST` | `/paystack/webhook` | Legacy alias → same handler |

In BACHs dashboard, set webhook URL to:

```text
https://api.yourdomain.com/webhook
```

Use the same secret as `BACHS_WEBHOOK_SECRET`. Signature headers accepted: `x-bachs-signature` / `x-webhook-signature`.

### 4.4 nginx sketch

```nginx
server {
  server_name api.yourdomain.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### 4.5 Landing page (optional, Vercel)

```bash
npm run build:landing
# or deploy landing/ workspace to Vercel
```

Keep the **bot** on the always-on host; landing can be static.

---

## 5. Post-deploy checklist

- [ ] `GET /` returns healthy
- [ ] Baileys connected (logs: connection open / no repeated QR loop)
- [ ] Buyer message finds vendors from Airtable
- [ ] Order row appears in `Orders` with `Status=pending`
- [ ] Checkout URL opens BACHs sandbox/prod checkout
- [ ] Test payment fires webhook; order becomes `paid`
- [ ] `node tests/test_purchase_flow.js` passes against prod/sandbox keys carefully (creates real Airtable rows)

---

## 6. Ops notes & risks

- **Session files:** back up `baileys_auth/` securely; never commit.
- **Ban risk:** rate-limit outbound messages; avoid spammy blasts.
- **One device link:** don’t log the same number into multiple bot instances.
- **Quantity field:** must be string in Airtable writes.
- **Dynamic prices:** `paymentService` can fall back to BACHs `pricing` if product cart fails; prefer a dedicated product + correct amount strategy for production catalogs.

---

## 7. Related files

| Path | Role |
|------|------|
| `src/index.js` | Express app, webhooks, message handler bootstrap |
| `src/services/twilioService.js` | Baileys socket send/receive |
| `src/services/airtableService.js` | Vendor search |
| `src/services/orderService.js` | Order CRUD |
| `src/services/paymentService.js` | BACHs checkout + payouts |
| `src/services/whatsappPaymentService.js` | In-chat payment UX helpers |
| `src/services/commerceEngine.js` | Buy/sell state machine |
| `tests/test_purchase_flow.js` | E2E purchase + Airtable verification |
| `BAILEYS_SETUP.md` | Quick local QR guide |

---

## 8. Quick command cheat sheet

```bash
# Install & run bot
npm install && npm start

# E2E purchase path
node tests/test_purchase_flow.js

# Integration diagnostics
node tests/test_integration.js

# Landing (separate)
npm run dev:landing
npm run build:landing
```
